import { query } from "@solidjs/router";
import { respond } from "@solidjs/web";

import { boardStudent } from "../server/boarding";
import { serviceNow, tonight } from "../server/clock";
import { DAY_OF_SETTINGS } from "../server/planner/settings";
import { ensurePlan, loadNight, loadsOf, type LoadedBus } from "../server/plans";
import { requireStaff } from "./staff";

const MINUTE = 60_000;
const LIVE_WINDOW_MS = 30 * MINUTE;

export function defaultBus(data: TonightBuses) {
  return data.buses.find((bus) => bus.departs > data.now - LIVE_WINDOW_MS)?.id ?? data.buses.at(-1)?.id;
}

export interface ReaderBus {
  id: string;
  name: string;
  departs: number;
  plannedDeparts: number;
  firstStop: string;
  load: number;
  boarded: number;
  capacity: number;
}

export interface TonightBuses {
  night: string;
  now: number;
  buses: ReaderBus[];
}

export type BoardingResult =
  | {
      ok: true;
      name: string;
      school: string;
      dropOff: string | null;
      walkHome: number | null;
      farFromHome: boolean;
      again: boolean;
      load: number;
      capacity: number;
    }
  | { ok: false; message: string };

export interface DriverStop {
  seq: number;
  kind: "board" | "alight";
  name: string;
  at: number;
  getOff: number;
  expected: number;
  skip: boolean;
}

export interface DriverView {
  now: number;
  bus: ReaderBus;
  stops: DriverStop[];
  unknownDropOff: number;
  boardingDone: boolean;
  skipped: number;
}

function summary(bus: LoadedBus, load: number, boarded: number): ReaderBus {
  return {
    id: bus.id,
    name: bus.name,
    departs: bus.departs,
    plannedDeparts: bus.plannedDeparts,
    firstStop: bus.stops[0]?.name ?? "",
    load,
    boarded,
    capacity: bus.capacity,
  };
}

async function nightState() {
  const night = tonight();
  await ensurePlan(night);
  return loadNight(night);
}

export const getTonightBuses = query(async (): Promise<TonightBuses> => {
  "use server";
  await requireStaff();
  const state = await nightState();
  const loads = loadsOf(state);
  return {
    night: state.night,
    now: serviceNow(),
    buses: state.buses.map((bus) =>
      summary(bus, loads.get(bus.id) ?? 0, state.boardings.filter((b) => b.busId === bus.id).length),
    ),
  };
}, "tonight-buses");

export const getDriverView = query(async (busId: string): Promise<DriverView | undefined> => {
  "use server";
  await requireStaff();
  return driverViewOf(busId);
}, "driver-view");

export async function driverViewNow(busId: string): Promise<DriverView | undefined> {
  "use server";
  await requireStaff();
  return driverViewOf(busId);
}

async function driverViewOf(busId: string): Promise<DriverView | undefined> {
  const state = await nightState();
  const bus = state.buses.find((b) => b.id === busId);
  if (!bus) return undefined;

  const onBus = state.boardings.filter((b) => b.busId === bus.id);
  const boardedUsers = new Set(state.boardings.map((b) => b.userId));
  const planned = new Map<string, number>();
  for (const seat of state.seats) if (seat.busId === bus.id) planned.set(seat.userId, seat.alightSeq);
  for (const choice of state.choices) {
    if (choice.busId === bus.id) planned.set(choice.userId, choice.alightSeq);
    else planned.delete(choice.userId);
  }

  const now = serviceNow();
  const lastBoard = bus.stops.findLast((stop) => stop.kind === "board");
  const boardingDone =
    lastBoard !== undefined &&
    now > bus.departs + (lastBoard.offset + DAY_OF_SETTINGS.boardGraceMinutes) * MINUTE &&
    onBus.every((b) => b.alightSeq !== null);
  const stops = bus.stops.map((stop) => {
    const getOff = onBus.filter((b) => b.alightSeq === stop.seq).length;
    return {
      seq: stop.seq,
      kind: stop.kind,
      name: stop.name,
      at: bus.departs + stop.offset * MINUTE,
      getOff,
      expected: [...planned].filter(([userId, seq]) => seq === stop.seq && !boardedUsers.has(userId)).length,
      skip: boardingDone && stop.kind === "alight" && getOff === 0,
    };
  });
  return {
    now,
    bus: summary(bus, loadsOf(state).get(bus.id) ?? 0, onBus.length),
    stops,
    unknownDropOff: onBus.filter((b) => b.alightSeq === null).length,
    boardingDone,
    skipped: stops.filter((stop) => stop.skip).length,
  };
}

export async function recordBoarding(busId: string, code: string, typed = false): Promise<BoardingResult> {
  "use server";
  const done = (result: BoardingResult) => respond(result, { revalidate: [getTonightBuses.key, getDriverView.key] });
  try {
    await requireStaff();
  } catch {
    return done({ ok: false, message: "운영자 코드를 다시 입력해 주세요." });
  }
  try {
    return done(await boardStudent(busId, String(code ?? ""), typed === true));
  } catch (err) {
    console.error("recordBoarding:", err);
    return done({ ok: false, message: "기록하지 못했어요. 다시 찍어 주세요." });
  }
}
