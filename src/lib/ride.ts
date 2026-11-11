import { query } from "@solidjs/router";
import { getRequestEvent, respond } from "@solidjs/web";

import {
  busDetailFor,
  busOptionsFor,
  chooseRideFor,
  startPointsFor,
  timeSlotsTonight,
  tonightFor,
} from "../server/rides";
import { auth } from "./auth";

export interface StartPoint {
  id: string;
  name: string;
  kind: "school" | "area";
  lat: number;
  lng: number;
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
  mine: boolean;
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

export type Tonight =
  | { kind: "no-service"; upcoming: { night: string; booked: boolean }[]; more: number }
  | { kind: "not-booked" }
  | {
      kind: "booked";
      slot: { from: number; to: number };
      dropOff?: { name: string; walkHome: number };
      resume: FlowParams;
    }
  | ({ kind: "waiting" } & RideState)
  | ({ kind: "missed" } & RideState)
  | ({ kind: "riding" } & RideState)
  | ({ kind: "arrived" } & RideState);

export interface RideState {
  now: number;
  ride: BusOption;
  resume: FlowParams;
}

export type ChooseRideResult = { ok: true } | { ok: false; message: string };

export function isFull(option: BusOption) {
  return !option.mine && option.riders >= option.capacity;
}

async function requireRider() {
  const headers = getRequestEvent()?.request.headers;
  const session = headers ? await auth.api.getSession({ headers }) : null;
  if (!session) throw new Error("로그인이 필요해요. 다시 로그인해 주세요.");
  return { id: session.user.id, email: session.user.email };
}

export const getTonight = query(async (): Promise<Tonight> => {
  "use server";
  return tonightFor(await requireRider());
}, "tonight");

export const getStartPoints = query(async () => {
  "use server";
  return startPointsFor(await requireRider());
}, "start-points");

export const getTimeSlots = query(async () => {
  "use server";
  await requireRider();
  return timeSlotsTonight();
}, "time-slots");

export const getBusOptions = query(async (startId: string, from: string, to: string) => {
  "use server";
  return busOptionsFor(await requireRider(), startId, from, to);
}, "bus-options");

export const getBusDetail = query(async (busId: string, startId: string, alightStopId: string) => {
  "use server";
  return busDetailFor(await requireRider(), busId, startId, alightStopId);
}, "bus-detail");

export async function chooseRide(params: FlowParams & { bus: string; alight: string }): Promise<ChooseRideResult> {
  "use server";
  const done = (result: ChooseRideResult) =>
    respond(result, { revalidate: [getTonight.key, getBusOptions.key, getBusDetail.key] });
  const rider = await requireRider().catch(() => undefined);
  if (!rider) return done({ ok: false, message: "로그인이 필요해요. 다시 로그인해 주세요." });
  try {
    return done(await chooseRideFor(rider, params));
  } catch (err) {
    console.error("chooseRide:", err);
    return done({ ok: false, message: "저장하지 못했어요. 다시 시도해 주세요." });
  }
}

export async function refreshTonight(): Promise<Tonight> {
  "use server";
  return tonightFor(await requireRider());
}
