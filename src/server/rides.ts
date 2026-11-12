import { and, asc, eq, gt, inArray } from "drizzle-orm";

import { bookings, operatingNights, rideChoices } from "../lib/app-schema";
import { db } from "../lib/db";
import type { BusOption, ChooseRideResult, FlowParams, StartPoint, StopTime, Tonight } from "../lib/ride";
import { schoolOf } from "../lib/schools";
import { isSlot, nightClock, serviceNow, slotCutoff, slotEnd, slotIndex, tonight } from "./clock";
import { SCHOOL_PLACES, type StartPlace, startOfSchool, startPlaces } from "./places";
import { distance, type Point } from "./planner/geo";
import { DAY_OF_SETTINGS } from "./planner/settings";
import {
  currentBusOf,
  ensurePlan,
  isOperatingNight,
  type LoadedBus,
  type LoadedStop,
  loadNight,
  loadsOf,
  type NightState,
  rebalance,
} from "./plans";
import { serviceSettings, serviceSlots } from "./service";
import { estimateWalk, type Walk, walkTimesAround } from "./walking";

const MINUTE = 60_000;
const NO_RESUME: FlowParams = { start: "", from: "", to: "" };

export interface Rider {
  id: string;
  email: string;
}

interface Pick {
  boardSeq?: number;
  alightSeq?: number;
  strict: boolean;
}

function nearest<T extends Point>(items: T[], to: Point) {
  let best: T | undefined;
  for (const item of items) if (!best || distance(item, to) < distance(best, to)) best = item;
  return best;
}

export function optionFor(
  bus: LoadedBus,
  start: StartPlace,
  home: Point,
  seats: { load: number; mine: boolean },
  pick: Pick,
  walk: Walk = estimateWalk,
): BusOption | undefined {
  const pickups = bus.stops.filter((s) => s.kind === "board");
  let board = pickups.find((s) => s.seq === pick.boardSeq);
  if (!board) {
    const reachable = pickups.filter((s) => distance(s, start) <= DAY_OF_SETTINGS.maxBoardWalkMeters);
    board = nearest(reachable, start) ?? (pick.strict ? undefined : nearest(pickups, start));
  }
  if (!board) return undefined;

  const boardSeq = board.seq;
  const after = bus.stops.filter((s) => s.kind === "alight" && s.seq > boardSeq);
  const reachable = after.filter((s) => distance(s, home) <= DAY_OF_SETTINGS.maxHomeWalkMeters);
  const pool = pick.strict ? reachable : after;
  const alight: LoadedStop | undefined =
    pool.find((s) => s.seq === pick.alightSeq) ?? nearest(reachable, home) ?? nearest(pool, home);
  if (!alight) return undefined;

  const stops: StopTime[] = bus.stops.map((stop) => ({
    id: String(stop.seq),
    name: stop.name,
    at: bus.departs + stop.offset * MINUTE,
    lat: stop.lat,
    lng: stop.lng,
    walkHome: reachable.includes(stop) || stop === alight ? walk(stop, home) : undefined,
  }));

  return {
    busId: bus.id,
    routeName: bus.name,
    start: { id: start.id, name: start.name },
    stops,
    boardIndex: bus.stops.indexOf(board),
    alightIndex: bus.stops.indexOf(alight),
    plannedBoardAt: bus.departs !== bus.plannedDeparts ? bus.plannedDeparts + board.offset * MINUTE : undefined,
    riders: seats.load,
    capacity: bus.capacity,
    mine: seats.mine,
    walkToStop: walk(start, board),
    walkHome: walk(alight, home),
    startLat: start.lat,
    startLng: start.lng,
  };
}

async function bookingTonight(userId: string, night: string) {
  const [row] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.userId, userId), eq(bookings.night, night)))
    .limit(1);
  return row;
}

interface Context {
  night: string;
  now: number;
  home: Point;
  bookingId: string;
  slot: string;
  state: NightState;
  ownStart: StartPlace;
  places: StartPlace[];
  walk: Walk;
}

async function contextFor(
  rider: Rider,
  known?: Awaited<ReturnType<typeof bookingTonight>>,
): Promise<Context | undefined> {
  const night = tonight();
  const booking = known ?? (await bookingTonight(rider.id, night));
  if (!booking || !(await ensurePlan(night))) return undefined;
  const home = { lat: booking.lat, lng: booking.lng };
  const [places, state] = await Promise.all([startPlaces(), loadNight(night)]);
  return {
    night,
    now: serviceNow(),
    home,
    walk: await walkTimesAround([home, ...places]),
    bookingId: booking.id,
    slot: booking.slot,
    state,
    places,
    ownStart: startOfSchool(schoolOf(rider.email)) ?? SCHOOL_PLACES[0],
  };
}

const placeIn = (ctx: Context, id: string | undefined) => ctx.places.find((place) => place.id === id);

function seatsFor(ctx: Context, userId: string) {
  const loads = loadsOf(ctx.state);
  const mineOn = currentBusOf(ctx.state).get(userId);
  return (bus: LoadedBus) => ({ load: loads.get(bus.id) ?? 0, mine: mineOn === bus.id });
}

const UPCOMING_SHOWN = 5;

async function noService(userId: string, night: string): Promise<Tonight> {
  const nights = (
    await db
      .select({ night: operatingNights.night })
      .from(operatingNights)
      .where(gt(operatingNights.night, night))
      .orderBy(asc(operatingNights.night))
  ).map((row) => row.night);
  const shown = nights.slice(0, UPCOMING_SHOWN);
  const booked = shown.length
    ? new Set(
        (
          await db
            .select({ night: bookings.night })
            .from(bookings)
            .where(and(eq(bookings.userId, userId), inArray(bookings.night, shown)))
        ).map((row) => row.night),
      )
    : new Set<string>();
  return {
    kind: "no-service",
    upcoming: shown.map((upcoming) => ({ night: upcoming, booked: booked.has(upcoming) })),
    more: nights.length - shown.length,
  };
}

export async function tonightFor(rider: Rider): Promise<Tonight> {
  const night = tonight();
  const booking = await bookingTonight(rider.id, night);
  if (!booking) return (await isOperatingNight(night)) ? { kind: "not-booked" } : noService(rider.id, night);

  const bookedSlot = { from: nightClock(night, booking.slot), to: slotEnd(night, booking.slot) };
  const window = await serviceSlots();
  const next = window[window.indexOf(booking.slot) + 1];
  const range = { from: booking.slot, to: next ?? booking.slot };
  const ctx = await contextFor(rider, booking);
  const fixesAt = [booking.slot, next]
    .flatMap((slot) => (slot ? [slotCutoff(night, slot)] : []))
    .find((at) => at > serviceNow());
  if (!ctx) return { kind: "booked", slot: bookedSlot, range, fixesAt, resume: NO_RESUME };

  const { state, now } = ctx;
  const busById = (id: string | undefined) => state.buses.find((bus) => bus.id === id);
  const seat = state.seats.find((s) => s.bookingId === ctx.bookingId);
  const choice = state.choices.find((c) => c.userId === rider.id);
  const boarding = state.boardings.find((b) => b.userId === rider.id);
  const seats = seatsFor(ctx, rider.id);
  const resume = choice ? { start: choice.startId, from: choice.fromSlot, to: choice.toSlot } : NO_RESUME;
  const start = placeIn(ctx, choice?.startId) ?? ctx.ownStart;

  const boardedBus = busById(boarding?.busId);
  if (boarding && boardedBus) {
    const sameAs = <T extends { busId: string }>(entry: T | undefined) =>
      entry?.busId === boardedBus.id ? entry : undefined;
    const plan = sameAs(choice) ?? sameAs(seat);
    const ride = optionFor(
      boardedBus,
      start,
      ctx.home,
      seats(boardedBus),
      {
        boardSeq: plan?.boardSeq,
        alightSeq: boarding.alightSeq ?? plan?.alightSeq,
        strict: false,
      },
      ctx.walk,
    );
    if (ride) {
      const arrived = now >= ride.stops[ride.alightIndex].at;
      return { kind: arrived ? "arrived" : "riding", now, ride, resume };
    }
  }

  const chosenBus = busById(choice?.busId);
  if (choice && chosenBus) {
    const ride = optionFor(
      chosenBus,
      start,
      ctx.home,
      seats(chosenBus),
      {
        boardSeq: choice.boardSeq,
        alightSeq: choice.alightSeq,
        strict: false,
      },
      ctx.walk,
    );
    if (ride) {
      const left = now > ride.stops[ride.boardIndex].at + DAY_OF_SETTINGS.boardGraceMinutes * MINUTE;
      return { kind: left ? "missed" : "waiting", now, ride, resume };
    }
  }

  const seatBus = busById(seat?.busId);
  if (seat && seatBus) {
    const stop = seatBus.stops.find((s) => s.seq === seat.alightSeq);
    return {
      kind: "booked",
      slot: { from: nightClock(night, seatBus.slot), to: slotEnd(night, seatBus.slot) },
      range: { from: booking.slot, to: slotIndex(seatBus.slot) > slotIndex(range.to) ? seatBus.slot : range.to },
      dropOff: stop && { name: stop.name, walkHome: ctx.walk(stop, ctx.home) },
      resume,
    };
  }
  return { kind: "booked", slot: bookedSlot, range, fixesAt: seat ? undefined : fixesAt, resume };
}

export async function startPointsFor(rider: Rider): Promise<{ points: StartPoint[]; ownSchool: string | undefined }> {
  const ownSchool = schoolOf(rider.email);
  const places = await startPlaces();
  const own = places.filter((p) => p.name === ownSchool);
  const rest = places.filter((p) => p.name !== ownSchool);
  return {
    points: [...own, ...rest].map(({ id, name, kind, lat, lng }) => ({ id, name, kind, lat, lng })),
    ownSchool,
  };
}

export async function timeSlotsTonight() {
  const night = tonight();
  const now = serviceNow();
  const slots = await serviceSlots();
  return {
    now,
    slots: slots
      .filter((clock) => slotEnd(night, clock) > now)
      .map((clock) => ({
        clock,
        at: nightClock(night, clock),
      })),
  };
}

function preferredSeat(ctx: Context, userId: string, bus: LoadedBus) {
  const choice = ctx.state.choices.find((c) => c.userId === userId && c.busId === bus.id);
  const seat = ctx.state.seats.find((s) => s.bookingId === ctx.bookingId && s.busId === bus.id);
  return choice ?? seat;
}

export async function busOptionsFor(rider: Rider, startId: string, from: string, to: string) {
  if (!isSlot(from) || !isSlot(to) || slotIndex(from) > slotIndex(to)) return undefined;
  const ctx = await contextFor(rider);
  const start = ctx && placeIn(ctx, startId);
  if (!ctx || !start) return undefined;

  const range = { from: nightClock(ctx.night, from), to: slotEnd(ctx.night, to) };
  const deadline = ctx.now + (await serviceSettings()).dayOfCutoffMinutes * MINUTE;
  const seats = seatsFor(ctx, rider.id);
  const reachable = ctx.state.buses
    .map((bus) => {
      const preferred = preferredSeat(ctx, rider.id, bus);
      return optionFor(bus, start, ctx.home, seats(bus), { alightSeq: preferred?.alightSeq, strict: true }, ctx.walk);
    })
    .filter((option): option is BusOption => option !== undefined);
  const options = reachable
    .filter((option) => {
      const boardAt = option.stops[option.boardIndex].at;
      return boardAt >= range.from && boardAt < range.to && boardAt > deadline;
    })
    .sort((a, b) => a.stops[a.boardIndex].at - b.stops[b.boardIndex].at);

  return {
    now: ctx.now,
    range,
    start: { id: start.id, name: start.name },
    options,
    passesStart: reachable.length > 0,
  };
}

export async function busDetailFor(rider: Rider, busId: string, startId: string, alight: string) {
  if (!busId) return undefined;
  const ctx = await contextFor(rider);
  const start = ctx && placeIn(ctx, startId);
  const bus = ctx?.state.buses.find((b) => b.id === busId);
  if (!ctx || !start || !bus) return undefined;
  const preferred = preferredSeat(ctx, rider.id, bus);
  const alightSeq = alight === "" ? preferred?.alightSeq : Number(alight);
  const option = optionFor(bus, start, ctx.home, seatsFor(ctx, rider.id)(bus), { alightSeq, strict: true }, ctx.walk);
  return option && { now: ctx.now, option };
}

export async function chooseRideFor(
  rider: Rider,
  params: FlowParams & { bus: string; alight: string },
): Promise<ChooseRideResult> {
  const fail = (message: string) => ({ ok: false as const, message });
  const ctx = await contextFor(rider);
  if (!ctx) return fail("오늘 밤 사전 신청한 학생만 버스를 고를 수 있어요.");
  if (ctx.state.boardings.some((b) => b.userId === rider.id)) return fail("이미 버스에 탔어요.");

  const start = placeIn(ctx, params.start);
  const bus = ctx.state.buses.find((b) => b.id === params.bus);
  if (!start || !bus || !isSlot(params.from) || !isSlot(params.to)) {
    return fail("고른 버스를 확인하지 못했어요. 처음부터 다시 골라 주세요.");
  }
  const seats = seatsFor(ctx, rider.id)(bus);
  const option = optionFor(bus, start, ctx.home, seats, { alightSeq: Number(params.alight), strict: true }, ctx.walk);
  if (!option || option.stops[option.alightIndex].id !== params.alight) {
    return fail("고른 정류장을 확인하지 못했어요. 다시 골라 주세요.");
  }
  const cutoff = (await serviceSettings()).dayOfCutoffMinutes;
  if (option.stops[option.boardIndex].at <= ctx.now) return fail("이미 지나간 버스예요. 다른 버스를 골라 주세요.");
  if (option.stops[option.boardIndex].at <= ctx.now + cutoff * MINUTE) {
    return fail(`타기 ${cutoff}분 전까지 고를 수 있어요. 다른 버스를 골라 주세요.`);
  }
  if (!seats.mine && seats.load >= bus.capacity) return fail("이 버스는 자리가 다 찼어요. 다른 버스를 골라 주세요.");

  const values = {
    busId: bus.id,
    startId: start.id,
    fromSlot: params.from,
    toSlot: params.to,
    boardSeq: bus.stops[option.boardIndex].seq,
    alightSeq: bus.stops[option.alightIndex].seq,
  };
  const save = (next: typeof values) =>
    db
      .insert(rideChoices)
      .values({ userId: rider.id, night: ctx.night, ...next })
      .onConflictDoUpdate({ target: [rideChoices.userId, rideChoices.night], set: next });
  await save(values);

  if (!seats.mine && (loadsOf(await loadNight(ctx.night)).get(bus.id) ?? 0) > bus.capacity) {
    const previous = ctx.state.choices.find((choice) => choice.userId === rider.id);
    if (previous) {
      const { userId: _, ...restored } = previous;
      await save(restored);
    } else {
      await db.delete(rideChoices).where(and(eq(rideChoices.userId, rider.id), eq(rideChoices.night, ctx.night)));
    }
    return fail("방금 자리가 다 찼어요. 다른 버스를 골라 주세요.");
  }

  await rebalance(ctx.night);
  return { ok: true };
}
