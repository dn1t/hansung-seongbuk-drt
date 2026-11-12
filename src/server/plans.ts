import { and, asc, count, eq, isNull, sql } from "drizzle-orm";

import {
  boardings,
  bookings,
  buses,
  busRiders,
  busStops,
  operatingNights,
  planPreviews,
  plans,
  rideChoices,
  stops,
} from "../lib/app-schema";
import { db } from "../lib/db";
import { users } from "../lib/schema";
import { schoolOf } from "../lib/schools";
import { inBackground } from "./background";
import { ALL_SLOTS, nightClock, serviceNow, slotCutoff, slotIndex, slotsBetween, tonight } from "./clock";
import { boardingPlace, startOfSchool } from "./places";
import { adjustDepartures } from "./planner/dispatch";
import { type PlannedBus, planNight, type PlanResult, type PlanRider } from "./planner/plan";
import { buildRoute, coverageOf, type Place } from "./planner/route";
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

async function nightBookings(night: string) {
  return db
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
    .orderBy(asc(bookings.createdAt));
}

async function seatedBookings(night: string) {
  const rows = await db.select({ id: busRiders.bookingId }).from(busRiders).where(eq(busRiders.night, night));
  return new Set(rows.map((row) => row.id));
}

type BookingRow = Awaited<ReturnType<typeof nightBookings>>[number];

function ridersOf(rows: BookingRow[], candidates: Place[]): PlanRider[] {
  return rows.flatMap((row) => {
    const start = startOfSchool(schoolOf(row.email));
    if (!start) return [];
    return [
      { id: row.id, slot: row.slot, home: { lat: row.lat, lng: row.lng }, board: boardingPlace(start, candidates) },
    ];
  });
}

const PREVIEW_FORMAT = 1;
const previewsInFlight = new Map<string, Promise<PlanResult>>();

async function stopsStamp() {
  const [row] = await db
    .select({
      total: count(),
      lat: sql<number>`total(${stops.lat})`,
      lng: sql<number>`total(${stops.lng})`,
      names: sql<number>`total(length(${stops.name}) * unicode(${stops.name}))`,
    })
    .from(stops);
  return { total: row?.total ?? 0, lat: row?.lat ?? 0, lng: row?.lng ?? 0, names: row?.names ?? 0 };
}

async function hashOf(value: unknown) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function planOpenSlots(rows: BookingRow[], until: string | undefined, settings: PlanSettings, candidates: Place[]) {
  const riders = ridersOf(rows, candidates);
  const planned = planNight({ slots: ALL_SLOTS, riders, candidates, settings });
  const open = planned.buses.filter((bus) => !isFrozen(until, bus.slot));
  const placed = new Set(open.flatMap((bus) => bus.route.seats.map((seat) => seat.riderId)));
  return {
    ...planned,
    buses: open,
    unplaced: rows.filter((row) => !placed.has(row.id)).map((row) => row.id),
  } satisfies PlanResult;
}

export async function previewPlan(night: string): Promise<PlanPreview> {
  const settings = planSettingsOf(await serviceSettings());
  const [all, seated, until, stamp] = await Promise.all([
    nightBookings(night),
    seatedBookings(night),
    frozenUntil(night),
    stopsStamp(),
  ]);
  const rows = all.filter((row) => !seated.has(row.id));
  const done = (result: PlanResult): PlanPreview => ({
    settings,
    result,
    bookings: rows.map(({ id, userId, slot, lat, lng }) => ({ id, userId, slot, lat, lng })),
    candidates: stamp.total,
  });

  const key = await hashOf({
    format: PREVIEW_FORMAT,
    settings,
    until: until ?? null,
    stamp,
    rows: rows.map((row) => [row.id, row.slot, row.lat, row.lng, schoolOf(row.email) ?? ""]),
  });
  const [stored] = await db.select().from(planPreviews).where(eq(planPreviews.night, night)).limit(1);
  if (stored?.inputKey === key) return done(stored.result as PlanResult);

  const flight = `${night}:${key}`;
  let task = previewsInFlight.get(flight);
  if (!task) {
    task = (async () => {
      const result = planOpenSlots(rows, until, settings, await candidateStops());
      const updatedAt = Date.now();
      await db
        .insert(planPreviews)
        .values({ night, inputKey: key, result, updatedAt })
        .onConflictDoUpdate({ target: planPreviews.night, set: { inputKey: key, result, updatedAt } });
      return result;
    })().finally(() => previewsInFlight.delete(flight));
    previewsInFlight.set(flight, task);
  }
  return done(await task);
}

export function refreshPreviews(nights: string[]) {
  for (const night of new Set(nights)) inBackground("refreshPreview", previewPlan(night));
}

async function insertBuses(
  night: string,
  planned: PlannedBus[],
  settings: PlanSettings,
  rows: { id: string; userId: string; lat: number; lng: number }[],
) {
  if (planned.length === 0) return;
  await applyRoadTimes(planned, settings);
  const userOf = new Map(rows.map((b) => [b.id, b.userId]));
  const busRows: (typeof buses.$inferInsert)[] = [];
  const stopRows: (typeof busStops.$inferInsert)[] = [];
  const riderRows: (typeof busRiders.$inferInsert)[] = [];

  for (const bus of planned) {
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
      capacity: settings.capacity,
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
    ...chunks(busRows).map((rows) => db.insert(buses).values(rows)),
    ...chunks(stopRows).map((rows) => db.insert(busStops).values(rows)),
    ...chunks(riderRows).map((rows) => db.insert(busRiders).values(rows)),
  ];
  await db.batch(statements as [(typeof statements)[number], ...(typeof statements)[number][]]);

  const homes = new Map(rows.map((b) => [b.id, { lat: b.lat, lng: b.lng }]));
  const walks = planned.flatMap((bus) =>
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

export async function frozenUntil(night: string) {
  const [row] = await db.select({ until: plans.frozenUntil }).from(plans).where(eq(plans.night, night)).limit(1);
  return row?.until ?? undefined;
}

export function isFrozen(until: string | undefined, slot: string) {
  return until !== undefined && slotIndex(slot) <= slotIndex(until);
}

async function freezeThrough(night: string, last: string, settings: PlanSettings) {
  const lastIndex = slotIndex(last);
  const [all, seated, candidates] = await Promise.all([nightBookings(night), seatedBookings(night), candidateStops()]);
  const rows = all.filter((row) => !seated.has(row.id) && slotIndex(row.slot) <= lastIndex + 1);
  const riders = ridersOf(rows, candidates);
  const due = new Set(riders.filter((r) => slotIndex(r.slot) <= lastIndex).map((r) => r.id));
  if (due.size === 0) return;

  const result = planNight({ slots: ALL_SLOTS, riders, candidates, settings });
  const byId = new Map(riders.map((r) => [r.id, r]));
  const frozen: PlannedBus[] = [];
  for (const bus of result.buses) {
    if (slotIndex(bus.slot) > lastIndex) continue;
    const seats = bus.route.seats.map((seat) => seat.riderId);
    if (seats.every((id) => due.has(id))) {
      frozen.push(bus);
      continue;
    }
    const kept = seats.filter((id) => due.has(id)).map((id) => byId.get(id)!);
    const route =
      kept.length > 0 ? buildRoute(kept, coverageOf(kept, candidates, settings.maxWalkMeters), settings) : undefined;
    if (route) frozen.push({ ...bus, route });
  }
  await insertBuses(night, frozen, settings, rows);
}

export async function ensurePlan(night: string) {
  if (night > tonight()) return false;
  const operating = await isOperatingNight(night);
  const [plan] = await db.select().from(plans).where(eq(plans.night, night)).limit(1);
  if (!operating) return plan !== undefined;

  const service = await serviceSettings();
  const window = slotsBetween(service.firstSlot, service.lastSlot);
  const now = serviceNow();
  const due = window.filter((slot) => slotCutoff(night, slot) <= now);
  if (due.length === 0) return plan !== undefined;
  const last = due.at(-1)!;
  if (plan?.frozenUntil && slotIndex(plan.frozenUntil) >= slotIndex(last)) return true;

  const settings = plan ? (plan.settings as PlanSettings) : planSettingsOf(service);
  if (!plan) {
    try {
      await db.insert(plans).values({ night, settings, riders: 0, unplaced: 0, frozenUntil: last });
    } catch (err) {
      if (!isConflict(err)) throw err;
      return true;
    }
  } else {
    const claimed = await db
      .update(plans)
      .set({ frozenUntil: last })
      .where(
        and(
          eq(plans.night, night),
          plan.frozenUntil ? eq(plans.frozenUntil, plan.frozenUntil) : isNull(plans.frozenUntil),
        ),
      )
      .returning({ night: plans.night });
    if (claimed.length === 0) return true;
  }

  await freezeThrough(night, last, settings);
  const [total, seated] = await Promise.all([nightBookings(night), seatedBookings(night)]);
  await db
    .update(plans)
    .set({
      riders: total.length,
      unplaced: total.filter(
        (row) => !seated.has(row.id) && (slotIndex(row.slot) < slotIndex(last) || row.slot === window.at(-1)),
      ).length,
    })
    .where(eq(plans.night, night));
  return true;
}

export async function rebuildPlan(night: string) {
  await db.delete(plans).where(eq(plans.night, night));
  await ensurePlan(night);
}

export async function routeCounts(night: string) {
  if (night === tonight()) await ensurePlan(night);
  const [state, preview] = await Promise.all([loadNight(night), previewPlan(night)]);
  const counts: Record<string, number> = {};
  for (const bus of [...state.buses, ...preview.result.buses]) counts[bus.slot] = (counts[bus.slot] ?? 0) + 1;
  return counts;
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
