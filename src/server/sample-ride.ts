import type { BusOption, StartPoint, StopTime } from "../lib/ride";
import { SCHOOLS } from "../lib/schools";

interface SampleStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  walkHome?: number;
}

interface SampleRoute {
  id: string;
  name: string;
  legs: [stopId: string, minutesFromStart: number][];
}

interface SampleBus {
  id: string;
  routeId: string;
  departs: string;
  plannedDeparts?: string;
  riders: number;
}

interface SampleStart extends StartPoint {
  stopId: string;
  walkToStop: number;
}

export const CAPACITY = 28;
export const MAX_WALK_HOME = 12;
export const SAMPLE_NOW = "00:58";
export const SAMPLE_SLOTS = ["01:00", "01:30", "02:00", "02:30", "03:00", "03:30"];
export const SAMPLE_BOOKED_SLOT = { from: "01:00", to: "01:00" };

const STOPS: SampleStop[] = [
  { id: "hansung-stn", name: "한성대입구역 5번 출구", lat: 37.5885, lng: 127.0063 },
  { id: "sungshin-stn", name: "성신여대입구역 2번 출구", lat: 37.5927, lng: 127.0167 },
  { id: "korea-stn", name: "고려대역 3번 출구", lat: 37.5905, lng: 127.036 },
  { id: "jongam", name: "종암동 주민센터", lat: 37.602, lng: 127.033 },
  { id: "wolgok", name: "월곡역", lat: 37.6018, lng: 127.0418 },
  { id: "dongduk", name: "동덕여대 정문", lat: 37.6066, lng: 127.0422 },
  { id: "sangwolgok", name: "상월곡역", lat: 37.6061, lng: 127.0485, walkHome: 11 },
  { id: "jangwi", name: "장위시장", lat: 37.613, lng: 127.052, walkHome: 6 },
  { id: "dolgoji", name: "돌곶이역", lat: 37.6106, lng: 127.0565, walkHome: 9 },
  { id: "kookmin", name: "국민대 정문", lat: 37.6106, lng: 126.997 },
  { id: "skuniv", name: "서경대 입구", lat: 37.615, lng: 127.013 },
  { id: "gireum", name: "길음역", lat: 37.6033, lng: 127.025 },
  { id: "karts", name: "한예종 석관캠퍼스", lat: 37.611, lng: 127.058, walkHome: 14 },
  { id: "seokgye", name: "석계역", lat: 37.6152, lng: 127.066, walkHome: 8 },
  { id: "seokgwan", name: "석관동 주민센터", lat: 37.6125, lng: 127.0615, walkHome: 10 },
];

const ROUTES: SampleRoute[] = [
  {
    id: "sb2",
    name: "성북 2번",
    legs: [
      ["hansung-stn", 0],
      ["sungshin-stn", 5],
      ["korea-stn", 13],
      ["jongam", 18],
      ["wolgok", 23],
      ["dongduk", 26],
      ["sangwolgok", 30],
      ["jangwi", 35],
      ["dolgoji", 40],
    ],
  },
  {
    id: "sb3",
    name: "성북 3번",
    legs: [
      ["kookmin", 0],
      ["skuniv", 5],
      ["gireum", 12],
      ["wolgok", 20],
      ["karts", 27],
      ["seokgye", 31],
      ["seokgwan", 35],
    ],
  },
];

const BUSES: SampleBus[] = [
  { id: "sb2-0110", routeId: "sb2", departs: "01:10", plannedDeparts: "01:25", riders: 11 },
  { id: "sb2-0140", routeId: "sb2", departs: "01:40", riders: 24 },
  { id: "sb2-0210", routeId: "sb2", departs: "02:10", riders: 18 },
  { id: "sb2-0240", routeId: "sb2", departs: "02:40", riders: 26 },
  { id: "sb2-0310", routeId: "sb2", departs: "03:10", riders: 7 },
  { id: "sb3-0100", routeId: "sb3", departs: "01:00", riders: 15 },
  { id: "sb3-0150", routeId: "sb3", departs: "01:50", riders: 21 },
  { id: "sb3-0230", routeId: "sb3", departs: "02:30", riders: 12 },
  { id: "sb3-0320", routeId: "sb3", departs: "03:20", riders: 5 },
];

const SCHOOL_STARTS: Record<string, Pick<SampleStart, "stopId" | "walkToStop" | "lat" | "lng">> = {
  고려대학교: { stopId: "korea-stn", walkToStop: 8, lat: 37.5894, lng: 127.0323 },
  국민대학교: { stopId: "kookmin", walkToStop: 3, lat: 37.6109, lng: 126.9969 },
  동덕여자대학교: { stopId: "dongduk", walkToStop: 2, lat: 37.6067, lng: 127.0421 },
  서경대학교: { stopId: "skuniv", walkToStop: 3, lat: 37.615, lng: 127.0127 },
  성신여자대학교: { stopId: "sungshin-stn", walkToStop: 6, lat: 37.5913, lng: 127.0221 },
  한국예술종합학교: { stopId: "karts", walkToStop: 2, lat: 37.611, lng: 127.0573 },
  한성대학교: { stopId: "hansung-stn", walkToStop: 7, lat: 37.5826, lng: 127.0102 },
  동방문화대학원대학교: { stopId: "hansung-stn", walkToStop: 9, lat: 37.5936, lng: 127.0007 },
};

const STARTS: SampleStart[] = [
  ...Object.values(SCHOOLS).map((name, i) => ({
    id: `school-${i + 1}`,
    name,
    kind: "school" as const,
    isSample: false,
    ...SCHOOL_STARTS[name],
  })),
  {
    id: "area-1",
    name: "성신여대 먹자골목",
    kind: "area",
    isSample: true,
    stopId: "sungshin-stn",
    walkToStop: 2,
    lat: 37.592,
    lng: 127.017,
  },
  {
    id: "area-2",
    name: "안암 참살이길",
    kind: "area",
    isSample: true,
    stopId: "korea-stn",
    walkToStop: 5,
    lat: 37.5865,
    lng: 127.029,
  },
];

export const sampleChoices = new Map<
  string,
  { start: string; from: string; to: string; busId: string; alightStopId: string }
>();

export const SAMPLE_DEFAULT_RIDE = { startName: "성신여자대학교", busId: "sb2-0110", alightStopId: "jangwi" };

function nightBase() {
  const kstNow = Date.now() + 9 * 60 * 60_000;
  const kstMidnight = kstNow - (kstNow % (24 * 60 * 60_000));
  return kstMidnight - 9 * 60 * 60_000;
}

export function clockToTime(clock: string) {
  const [h, m] = clock.split(":").map(Number);
  const minutes = h < 12 ? h * 60 + m : (h - 24) * 60 + m;
  return nightBase() + minutes * 60_000;
}

export function isSlot(clock: string | undefined): clock is string {
  return clock !== undefined && SAMPLE_SLOTS.includes(clock);
}

export function slotEnd(clock: string) {
  return clockToTime(clock) + 30 * 60_000;
}

const stopById = (id: string) => STOPS.find((s) => s.id === id)!;
const routeById = (id: string) => ROUTES.find((r) => r.id === id)!;

export function startPoints(ownSchool: string | undefined): StartPoint[] {
  const own = STARTS.filter((s) => s.name === ownSchool);
  const rest = STARTS.filter((s) => s.name !== ownSchool);
  return [...own, ...rest].map(({ id, name, kind, isSample, lat, lng }) => ({ id, name, kind, isSample, lat, lng }));
}

export function startById(id: string | undefined) {
  return STARTS.find((s) => s.id === id);
}

export function startByName(name: string) {
  return STARTS.find((s) => s.name === name)!;
}

function stopTimes(bus: SampleBus): StopTime[] {
  const departs = clockToTime(bus.departs);
  return routeById(bus.routeId).legs.map(([stopId, offset]) => {
    const stop = stopById(stopId);
    return {
      id: stop.id,
      name: stop.name,
      at: departs + offset * 60_000,
      lat: stop.lat,
      lng: stop.lng,
      walkHome: stop.walkHome !== undefined && stop.walkHome <= MAX_WALK_HOME ? stop.walkHome : undefined,
    };
  });
}

function nearestHomeIndex(stops: StopTime[], after: number) {
  let best = -1;
  stops.forEach((s, i) => {
    if (i <= after || s.walkHome === undefined) return;
    if (best === -1 || s.walkHome < stops[best].walkHome!) best = i;
  });
  return best;
}

export function busOption(busId: string, start: SampleStart, alightStopId?: string): BusOption | undefined {
  const bus = BUSES.find((b) => b.id === busId);
  if (!bus) return undefined;
  const stops = stopTimes(bus);
  const boardIndex = stops.findIndex((s) => s.id === start.stopId);
  if (boardIndex === -1) return undefined;
  const chosen = alightStopId ? stops.findIndex((s, i) => s.id === alightStopId && i > boardIndex) : -1;
  const alightIndex =
    chosen !== -1 && stops[chosen].walkHome !== undefined ? chosen : nearestHomeIndex(stops, boardIndex);
  if (alightIndex === -1) return undefined;
  const plannedShift = bus.plannedDeparts ? clockToTime(bus.plannedDeparts) - clockToTime(bus.departs) : 0;

  return {
    busId: bus.id,
    routeName: routeById(bus.routeId).name,
    start: { id: start.id, name: start.name },
    stops,
    boardIndex,
    alightIndex,
    plannedBoardAt: plannedShift ? stops[boardIndex].at + plannedShift : undefined,
    riders: bus.riders,
    capacity: CAPACITY,
    walkToStop: start.walkToStop,
    walkHome: stops[alightIndex].walkHome!,
    startLat: start.lat,
    startLng: start.lng,
  };
}

export function busOptions(start: SampleStart, from: number, to: number, now: number) {
  return BUSES.map((b) => busOption(b.id, start))
    .filter((o): o is BusOption => {
      if (!o) return false;
      const boardAt = o.stops[o.boardIndex].at;
      return boardAt >= from && boardAt < to && boardAt > now;
    })
    .sort((a, b) => a.stops[a.boardIndex].at - b.stops[b.boardIndex].at);
}
