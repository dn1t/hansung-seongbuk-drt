import { query } from "@solidjs/router";
import { getRequestEvent, respond } from "@solidjs/web";

import {
  busOption,
  busOptions,
  clockToTime,
  isSlot,
  SAMPLE_BOOKED_SLOT,
  SAMPLE_DEFAULT_RIDE,
  SAMPLE_NOW,
  SAMPLE_SLOTS,
  sampleChoices,
  slotEnd,
  startByName,
  startById,
  startPoints,
} from "../server/sample-ride";
import { auth } from "./auth";
import { schoolOf } from "./schools";

export interface StartPoint {
  id: string;
  name: string;
  kind: "school" | "area";
  isSample: boolean;
}

export interface StopTime {
  id: string;
  name: string;
  at: number;
  lat: number;
  lng: number;
  walkHome?: number;
}

export interface BusOption {
  busId: string;
  routeName: string;
  start: { id: string; name: string };
  stops: StopTime[];
  boardIndex: number;
  alightIndex: number;
  plannedBoardAt?: number;
  riders: number;
  capacity: number;
  walkToStop: number;
  walkHome: number;
  startLat: number;
  startLng: number;
}

export interface FlowParams {
  start: string;
  from: string;
  to: string;
}

export type TonightDemo = "none" | "unbooked" | "booked" | "waiting" | "riding" | "arrived";

const TONIGHT_DEMOS: TonightDemo[] = ["none", "unbooked", "booked", "waiting", "riding", "arrived"];

function isTonightDemo(value: string | undefined): value is TonightDemo {
  return TONIGHT_DEMOS.includes(value as TonightDemo);
}

export type Tonight =
  | { kind: "no-service" }
  | { kind: "not-booked" }
  | {
      kind: "booked";
      slot: { from: number; to: number };
      dropOff: { name: string; walkHome: number };
      resume: FlowParams;
    }
  | ({ kind: "waiting" } & RideState)
  | ({ kind: "riding" } & RideState)
  | ({ kind: "arrived" } & RideState);

export interface RideState {
  now: number;
  ride: BusOption;
  resume: FlowParams;
}

export type ChooseRideResult = { ok: true } | { ok: false; message: string };

async function requireUser() {
  "use server";
  const headers = getRequestEvent()?.request.headers;
  const session = headers ? await auth.api.getSession({ headers }) : null;
  if (!session) throw new Error("로그인이 필요해요. 다시 로그인해 주세요.");
  return session.user;
}

export const getTonight = query(async (demo: string): Promise<Tonight> => {
  "use server";
  const user = await requireUser();
  const choice = sampleChoices.get(user.id);
  const kind: TonightDemo = isTonightDemo(demo) ? demo : choice ? "waiting" : "booked";

  if (kind === "none") return { kind: "no-service" };
  if (kind === "unbooked") return { kind: "not-booked" };

  const fallback = startByName(SAMPLE_DEFAULT_RIDE.startName);
  const start = startById(choice?.start) ?? fallback;
  const ride =
    (choice && busOption(choice.busId, start, choice.alightStopId)) ??
    busOption(SAMPLE_DEFAULT_RIDE.busId, fallback, SAMPLE_DEFAULT_RIDE.alightStopId)!;
  const resume = choice
    ? { start: choice.start, from: choice.from, to: choice.to }
    : { start: startPoints(schoolOf(user.email))[0].id, ...SAMPLE_BOOKED_SLOT };

  if (kind === "booked") {
    const dropOff = ride.stops[ride.alightIndex];
    return {
      kind: "booked",
      slot: { from: clockToTime(SAMPLE_BOOKED_SLOT.from), to: slotEnd(SAMPLE_BOOKED_SLOT.to) },
      dropOff: { name: dropOff.name, walkHome: ride.walkHome },
      resume,
    };
  }

  const boardAt = ride.stops[ride.boardIndex].at;
  const alightAt = ride.stops[ride.alightIndex].at;
  const now =
    kind === "riding" ? boardAt + 12 * 60_000 : kind === "arrived" ? alightAt + 2 * 60_000 : clockToTime(SAMPLE_NOW);
  const state = { now, ride, resume };
  if (kind === "riding") return { kind: "riding", ...state };
  if (kind === "arrived") return { kind: "arrived", ...state };
  return { kind: "waiting", ...state };
}, "tonight");

export const getStartPoints = query(async () => {
  "use server";
  const user = await requireUser();
  const ownSchool = schoolOf(user.email);
  return { points: startPoints(ownSchool), ownSchool };
}, "start-points");

export const getTimeSlots = query(async () => {
  "use server";
  await requireUser();
  return {
    now: clockToTime(SAMPLE_NOW),
    slots: SAMPLE_SLOTS.map((clock) => ({ clock, at: clockToTime(clock) })),
    booked: SAMPLE_BOOKED_SLOT,
  };
}, "time-slots");

export const getBusOptions = query(async (startId: string, from: string, to: string) => {
  "use server";
  await requireUser();
  const start = startById(startId);
  if (!start || !isSlot(from) || !isSlot(to)) return undefined;
  const now = clockToTime(SAMPLE_NOW);
  const range = { from: clockToTime(from), to: slotEnd(to) };
  return {
    now,
    range,
    start: { id: start.id, name: start.name },
    options: busOptions(start, range.from, range.to, now),
  };
}, "bus-options");

export const getBusDetail = query(async (busId: string, startId: string, alightStopId: string) => {
  "use server";
  await requireUser();
  const start = startById(startId);
  const option = busId && start ? busOption(busId, start, alightStopId) : undefined;
  if (!option) return undefined;
  return { now: clockToTime(SAMPLE_NOW), option };
}, "bus-detail");

export async function chooseRide(params: FlowParams & { bus: string; alight: string }): Promise<ChooseRideResult> {
  "use server";
  const done = (result: ChooseRideResult) => respond(result, { revalidate: [getTonight.key] });
  const user = await requireUser().catch(() => undefined);
  if (!user) return done({ ok: false, message: "로그인이 필요해요. 다시 로그인해 주세요." });

  const start = startById(params.start);
  const option = start && busOption(params.bus, start, params.alight);
  if (!option || option.stops[option.alightIndex].id !== params.alight || !isSlot(params.from) || !isSlot(params.to)) {
    return done({ ok: false, message: "고른 버스를 확인하지 못했어요. 처음부터 다시 골라 주세요." });
  }
  if (option.stops[option.boardIndex].at <= clockToTime(SAMPLE_NOW)) {
    return done({ ok: false, message: "이미 지나간 버스예요. 다른 버스를 골라 주세요." });
  }

  sampleChoices.set(user.id, {
    start: params.start,
    from: params.from,
    to: params.to,
    busId: params.bus,
    alightStopId: params.alight,
  });
  return done({ ok: true });
}
