import { and, asc, eq } from "drizzle-orm";

import {
  boardings,
  bookings,
  buses,
  busRiders,
  busStops,
  operatingNights,
  plans,
  rideChoices,
  stops,
} from "../lib/app-schema";
import { db } from "../lib/db";
import { users } from "../lib/schema";
import { schoolOf } from "../lib/schools";
import { inBackground } from "./background";
import { ALL_SLOTS, kstToday, nightClock, serviceNow, slotIndex } from "./clock";
import { boardingPlace, startOfSchool } from "./places";
import { adjustDepartures } from "./planner/dispatch";
import { planNight, type PlanResult } from "./planner/plan";
import type { Place } from "./planner/route";
import { DISPATCH_SETTINGS, type PlanSettings } from "./planner/settings";
import { planSettingsOf, serviceSettings } from "./service";
import { applyRoadTimes } from "./travel";
import { warmWalkTimes } from "./walking";

export interface LoadedStop {
  seq: number;
  kind: "board" | "alight";
  stopId: string | null;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  offset: number;
}

export interface LoadedBus {
  id: string;
  slot: string;
  name: string;
  bearing: number;
  plannedDeparts: number;
  departs: number;
  capacity: number;
  stops: LoadedStop[];
}

export interface NightState {
  night: string;
  buses: LoadedBus[];
  seats: { bookingId: string; busId: string; userId: string; boardSeq: number; alightSeq: number }[];
  choices: {
    userId: string;
    busId: string;
    startId: string;
    fromSlot: string;
    toSlot: string;
    boardSeq: number;
    alightSeq: number;
  }[];
  boardings: { userId: string; busId: string; alightSeq: number | null; boardedAt: number }[];
}

export interface PlanPreview {
  settings: PlanSettings;
  result: PlanResult;
  bookings: { id: string; userId: string; slot: string; lat: number; lng: number }[];
  candidates: number;
}

const CHUNK = 200;

function chunks<T>(rows: T[]) {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += CHUNK) out.push(rows.slice(i, i + CHUNK));
  return out;
}

export async function candidateStops(): Promise<Place[]> {
  const rows = await db.select().from(stops).orderBy(asc(stops.name));
  return rows.map((row) => ({ id: row.id, name: row.name, address: row.address, lat: row.lat, lng: row.lng }));
}

export async function isOperatingNight(night: string) {
  const [row] = await db
    .select({ night: operatingNights.night })
    .from(operatingNights)
    .where(eq(operatingNights.night, night))
    .limit(1);
  return row !== undefined;
}

export async function previewPlan(night: string, override?: PlanSettings): Promise<PlanPreview> {
  const settings = override ?? planSettingsOf(await serviceSettings());
  const [rows, candidates] = await Promise.all([
    db
      .select({
        id: bookings.id,
        userId: bookings.userId,
        slot: bookings.slot,
        lat: bookings.lat,
        lng: bookings.lng,
        email: users.email,
      })
      .from(bookings)
      .innerJoin(users, eq(users.id, bookings.userId))
      .where(eq(bookings.night, night))
      .orderBy(asc(bookings.createdAt)),
    candidateStops(),
  ]);

  const riders = rows.flatMap((row) => {
    const start = startOfSchool(schoolOf(row.email));
    if (!start) return [];
    return [
      { id: row.id, slot: row.slot, home: { lat: row.lat, lng: row.lng }, board: boardingPlace(start, candidates) },
    ];
  });
  const result = planNight({ slots: ALL_SLOTS, riders, candidates, settings });
  const placed = new Set(riders.map((r) => r.id));
  result.unplaced.push(...rows.filter((row) => !placed.has(row.id)).map((row) => row.id));

  return {
    settings,
    result,
    bookings: rows.map(({ id, userId, slot, lat, lng }) => ({ id, userId, slot, lat, lng })),
    candidates: candidates.length,
  };
}

async function writePlan(night: string, preview: PlanPreview, replace: boolean) {
  await applyRoadTimes(preview.result.buses, preview.settings);
  const userOf = new Map(preview.bookings.map((b) => [b.id, b.userId]));
  const busRows: (typeof buses.$inferInsert)[] = [];
  const stopRows: (typeof busStops.$inferInsert)[] = [];
  const riderRows: (typeof busRiders.$inferInsert)[] = [];

  for (const bus of preview.result.buses) {
    const id = crypto.randomUUID();
    const departs = nightClock(night, bus.slot);
    busRows.push({
      id,
      night,
      slot: bus.slot,
      name: bus.name,
      bearing: bus.bearing,
      plannedDeparts: departs,
      departs,
      capacity: preview.settings.capacity,
    });
    bus.route.stops.forEach((stop, seq) => {
      stopRows.push({
        busId: id,
        seq,
        kind: stop.kind,
        stopId: stop.place.id.startsWith("start:") ? null : stop.place.id,
        name: stop.place.name,
        address: stop.place.address ?? null,
        lat: stop.place.lat,
        lng: stop.place.lng,
        offset: stop.offset,
      });
    });
    for (const seat of bus.route.seats) {
      riderRows.push({
        bookingId: seat.riderId,
        busId: id,
        userId: userOf.get(seat.riderId)!,
        night,
        boardSeq: seat.board,
        alightSeq: seat.alight,
      });
    }
  }

  const statements = [
    ...(replace ? [db.delete(plans).where(eq(plans.night, night))] : []),
    db.insert(plans).values({
      night,
      settings: preview.settings,
      riders: preview.bookings.length,
      unplaced: preview.result.unplaced.length,
    }),
    ...chunks(busRows).map((rows) => db.insert(buses).values(rows)),
    ...chunks(stopRows).map((rows) => db.insert(busStops).values(rows)),
    ...chunks(riderRows).map((rows) => db.insert(busRiders).values(rows)),
  ];
  await db.batch(statements as [(typeof statements)[number], ...(typeof statements)[number][]]);

  const homes = new Map(preview.bookings.map((b) => [b.id, { lat: b.lat, lng: b.lng }]));
  const walks = preview.result.buses.flatMap((bus) =>
    bus.route.seats.flatMap((seat) => {
      const home = homes.get(seat.riderId);
      return home ? [[bus.route.stops[seat.alight].place, home] as [Place, { lat: number; lng: number }]] : [];
    }),
  );
  inBackground("warmWalkTimes", warmWalkTimes(walks));
}

function isConflict(err: unknown) {
  const text = String((err as { cause?: unknown })?.cause ?? err);
  return (
    /UNIQUE constraint failed|PRIMARY KEY/i.test(text) ||
    /SQLITE_CONSTRAINT/i.test(String((err as { code?: string })?.code))
  );
}

export async function hasPlan(night: string) {
  const [row] = await db.select({ night: plans.night }).from(plans).where(eq(plans.night, night)).limit(1);
  return row !== undefined;
}

export async function ensurePlan(night: string) {
  if (await hasPlan(night)) return true;
  if (night > kstToday() || !(await isOperatingNight(night))) return false;
  try {
    await writePlan(night, await previewPlan(night), false);
  } catch (err) {
    if (!isConflict(err)) throw err;
  }
  return true;
}

export async function rebuildPlan(night: string) {
  await writePlan(night, await previewPlan(night), true);
}

export async function hasActivity(night: string) {
  const [choice] = await db
    .select({ userId: rideChoices.userId })
    .from(rideChoices)
    .where(eq(rideChoices.night, night))
    .limit(1);
  const [boarded] = await db
    .select({ userId: boardings.userId })
    .from(boardings)
    .where(eq(boardings.night, night))
    .limit(1);
  return choice !== undefined || boarded !== undefined;
}

export async function loadNight(night: string): Promise<NightState> {
  const [busRows, stopRows, seatRows, choiceRows, boardingRows] = await Promise.all([
    db.select().from(buses).where(eq(buses.night, night)).orderBy(asc(buses.departs), asc(buses.name)),
    db
      .select({ stop: busStops })
      .from(busStops)
      .innerJoin(buses, eq(buses.id, busStops.busId))
      .where(eq(buses.night, night))
      .orderBy(asc(busStops.busId), asc(busStops.seq))
      .then((rows) => rows.map((row) => row.stop)),
    db.select().from(busRiders).where(eq(busRiders.night, night)),
    db.select().from(rideChoices).where(eq(rideChoices.night, night)),
    db.select().from(boardings).where(eq(boardings.night, night)),
  ]);

  const stopsOf = new Map<string, LoadedStop[]>();
  for (const row of stopRows) {
    const list = stopsOf.get(row.busId) ?? [];
    list.push({
      seq: row.seq,
      kind: row.kind,
      stopId: row.stopId,
      name: row.name,
      address: row.address,
      lat: row.lat,
      lng: row.lng,
      offset: row.offset,
    });
    stopsOf.set(row.busId, list);
  }

  return {
    night,
    buses: busRows.map((bus) => ({
      id: bus.id,
      slot: bus.slot,
      name: bus.name,
      bearing: bus.bearing,
      plannedDeparts: bus.plannedDeparts,
      departs: bus.departs,
      capacity: bus.capacity,
      stops: stopsOf.get(bus.id) ?? [],
    })),
    seats: seatRows.map(({ bookingId, busId, userId, boardSeq, alightSeq }) => ({
      bookingId,
      busId,
      userId,
      boardSeq,
      alightSeq,
    })),
    choices: choiceRows.map(({ userId, busId, startId, fromSlot, toSlot, boardSeq, alightSeq }) => ({
      userId,
      busId,
      startId,
      fromSlot,
      toSlot,
      boardSeq,
      alightSeq,
    })),
    boardings: boardingRows.map(({ userId, busId, alightSeq, boardedAt }) => ({ userId, busId, alightSeq, boardedAt })),
  };
}

export function currentBusOf(state: NightState) {
  const current = new Map<string, string>();
  for (const seat of state.seats) current.set(seat.userId, seat.busId);
  for (const choice of state.choices) current.set(choice.userId, choice.busId);
  for (const boarding of state.boardings) current.set(boarding.userId, boarding.busId);
  return current;
}

export function loadsOf(state: NightState) {
  const loads = new Map(state.buses.map((bus) => [bus.id, 0]));
  for (const busId of currentBusOf(state).values()) loads.set(busId, (loads.get(busId) ?? 0) + 1);
  return loads;
}

export async function rebalance(night: string) {
  const state = await loadNight(night);
  const loads = loadsOf(state);
  const next = adjustDepartures(
    state.buses.map((bus) => ({
      id: bus.id,
      slot: slotIndex(bus.slot),
      bearing: bus.bearing,
      planned: bus.plannedDeparts,
      departs: bus.departs,
      capacity: bus.capacity,
      load: loads.get(bus.id) ?? 0,
    })),
    serviceNow(),
    DISPATCH_SETTINGS,
  );
  const changed = state.buses.filter((bus) => next.get(bus.id) !== bus.departs);
  for (const bus of changed) {
    await db
      .update(buses)
      .set({ departs: next.get(bus.id)! })
      .where(and(eq(buses.id, bus.id), eq(buses.night, night)));
  }
  return changed.length;
}
