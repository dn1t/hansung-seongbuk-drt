import { and, eq, isNotNull, isNull, or } from "drizzle-orm";

import { surveys } from "../lib/app-schema";
import { db } from "../lib/db";
import { users } from "../lib/schema";
import { SCHOOLS, schoolOf } from "../lib/schools";
import {
  FARE_LABELS,
  FREQUENCY_LABELS,
  RIDE_SHARE,
  SURVEY_FARES,
  SURVEY_FREQUENCIES,
  SURVEY_WAYS,
  type SurveyFare,
  type SurveyFrequency,
  type SurveyWay,
  WAY_LABELS,
} from "../lib/survey-options";
import { ALL_SLOTS, kstDate, nightClock, serviceNow, slotIndex, slotsBetween, tonight } from "./clock";
import { boardingPlace, startOfSchool, startPlaces } from "./places";
import { nearestDistrict } from "./planner/districts";
import { planNight } from "./planner/plan";
import { type PlanSettings, walkMinutes } from "./planner/settings";
import { candidateStops } from "./plans";
import { planSettingsOf, SERVICE_LIMITS, type ServiceSettings, serviceSettings } from "./service";

export type ResearchFilter = "real" | "all" | "demo";

export interface Respondent {
  userId: string;
  email: string;
  address: string | null;
  lat: number;
  lng: number;
  demo: boolean;
  frequency: SurveyFrequency;
  slot: string;
  startId: string;
  way: SurveyWay;
  fare: SurveyFare;
  comment: string | null;
  createdAt: number;
}

export interface Count {
  key: string;
  label: string;
  count: number;
}

export interface SurveyReport {
  filter: ResearchFilter;
  totals: { real: number; demo: number; shown: number; unanswered: number };
  schools: Count[];
  districts: Count[];
  frequency: Count[];
  slots: Count[];
  starts: Count[];
  ways: Count[];
  fares: Count[];
  daily: { day: string; count: number }[];
  comments: { at: number; school: string; text: string }[];
}

export interface SurveyRow {
  answeredAt: number;
  school: string;
  district: string;
  frequency: string;
  slot: string;
  start: string;
  way: string;
  fare: string;
  comment: string;
  demo: boolean;
}

const DAILY_DAYS = 14;
const COMMENTS_SHOWN = 50;
const DISTRICTS_SHOWN = 8;
const DAY = 86_400_000;

export async function loadRespondents(): Promise<Respondent[]> {
  const rows = await db
    .select({
      userId: surveys.userId,
      email: users.email,
      address: users.homeAddress,
      lat: users.homeLat,
      lng: users.homeLng,
      demo: users.demo,
      frequency: surveys.frequency,
      slot: surveys.slot,
      startId: surveys.startId,
      way: surveys.way,
      fare: surveys.fare,
      comment: surveys.comment,
      createdAt: surveys.createdAt,
    })
    .from(surveys)
    .innerJoin(users, eq(users.id, surveys.userId))
    .where(and(isNotNull(users.homeLat), isNotNull(users.homeLng)));
  return rows.map((row) => ({
    ...row,
    demo: row.demo === true,
    lat: Number(row.lat),
    lng: Number(row.lng),
    createdAt: row.createdAt.getTime(),
  }));
}

export function inFilter(filter: ResearchFilter) {
  return (row: { demo: boolean }) => (filter === "all" ? true : filter === "demo" ? row.demo : !row.demo);
}

export function districtOfHome(row: { address: string | null; lat: number; lng: number }) {
  const second = row.address?.trim().split(/\s+/)[1];
  if (second && /[가-힣][구시군]$/.test(second)) return second;
  return `${nearestDistrict(row)}구`;
}

function tally<T extends string>(keys: readonly T[], labels: Record<T, string>, values: T[]): Count[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return keys.map((key) => ({ key, label: labels[key], count: counts.get(key) ?? 0 }));
}

function ranked(values: string[], limit: number): Count[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const sorted = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"));
  const head = sorted.slice(0, limit).map(([key, count]) => ({ key, label: key, count }));
  const rest = sorted.slice(limit).reduce((sum, [, count]) => sum + count, 0);
  return rest > 0 ? [...head, { key: "other", label: "그 밖의 곳", count: rest }] : head;
}

async function startNames() {
  return new Map((await startPlaces()).map((place) => [place.id, place.name]));
}

const startLabel = (names: Map<string, string>, id: string) => names.get(id) ?? "지금은 없는 출발지";

export async function surveyReport(filter: ResearchFilter): Promise<SurveyReport> {
  const [all, names, unanswered] = await Promise.all([
    loadRespondents(),
    startNames(),
    db
      .select({ id: users.id })
      .from(users)
      .leftJoin(surveys, eq(surveys.userId, users.id))
      .where(and(isNotNull(users.homeAddress), or(isNull(users.demo), eq(users.demo, false)), isNull(surveys.userId))),
  ]);
  const rows = all.filter(inFilter(filter));
  const schoolNames = Object.values(SCHOOLS) as string[];
  const schoolCounts = new Map<string, number>();
  for (const row of rows) {
    const school = schoolOf(row.email) ?? "";
    schoolCounts.set(school, (schoolCounts.get(school) ?? 0) + 1);
  }
  const windowSlots = await serviceWindow();
  const slotKeys = [...new Set([...windowSlots, ...rows.map((row) => row.slot)])].sort(
    (a, b) => slotIndex(a) - slotIndex(b),
  );

  const today = kstDate(serviceNow());
  const days = Array.from({ length: DAILY_DAYS }, (_, i) =>
    new Date(Date.parse(`${today}T00:00:00Z`) - (DAILY_DAYS - 1 - i) * DAY).toISOString().slice(0, 10),
  );
  const perDay = new Map<string, number>();
  for (const row of rows) {
    const day = kstDate(row.createdAt);
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
  }

  return {
    filter,
    totals: {
      real: all.filter((row) => !row.demo).length,
      demo: all.filter((row) => row.demo).length,
      shown: rows.length,
      unanswered: unanswered.length,
    },
    schools: schoolNames.map((name) => ({ key: name, label: name, count: schoolCounts.get(name) ?? 0 })),
    districts: ranked(rows.map(districtOfHome), DISTRICTS_SHOWN),
    frequency: tally(
      SURVEY_FREQUENCIES,
      FREQUENCY_LABELS,
      rows.map((row) => row.frequency),
    ),
    slots: slotKeys.map((slot) => ({ key: slot, label: slot, count: rows.filter((row) => row.slot === slot).length })),
    starts: ranked(
      rows.map((row) => startLabel(names, row.startId)),
      DISTRICTS_SHOWN,
    ),
    ways: tally(
      SURVEY_WAYS,
      WAY_LABELS,
      rows.map((row) => row.way),
    ),
    fares: tally(
      SURVEY_FARES,
      FARE_LABELS,
      rows.map((row) => row.fare),
    ),
    daily: days.map((day) => ({ day, count: perDay.get(day) ?? 0 })),
    comments: rows
      .filter((row) => row.comment)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, COMMENTS_SHOWN)
      .map((row) => ({ at: row.createdAt, school: schoolOf(row.email) ?? "", text: row.comment! })),
  };
}

export async function surveyRows(filter: ResearchFilter): Promise<SurveyRow[]> {
  const [all, names] = await Promise.all([loadRespondents(), startNames()]);
  return all
    .filter(inFilter(filter))
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((row) => ({
      answeredAt: row.createdAt,
      school: schoolOf(row.email) ?? "",
      district: districtOfHome(row),
      frequency: FREQUENCY_LABELS[row.frequency],
      slot: row.slot,
      start: startLabel(names, row.startId),
      way: WAY_LABELS[row.way],
      fare: FARE_LABELS[row.fare],
      comment: row.comment ?? "",
      demo: row.demo,
    }));
}

async function serviceWindow() {
  const service = await serviceSettings();
  return slotsBetween(service.firstSlot, service.lastSlot);
}

export type Demand = "all" | "typical";

export interface ResearchPlanInput {
  real: boolean;
  demo: boolean;
  demand: Demand;
  capacity: number;
  maxWalkMeters: number;
  maxRideMinutes: number;
  minRiders: number;
  foldThinSlots: boolean;
}

export interface ResearchStop {
  name: string;
  kind: "board" | "alight";
  at: number;
  riders: number;
  lat: number;
  lng: number;
}

export interface ResearchBus {
  key: string;
  slot: string;
  name: string;
  departs: number;
  plannedDeparts: number;
  riders: number;
  demoRiders: number;
  boarded: number;
  capacity: number;
  duration: number;
  longestRide: number;
  longestWalk: number;
  stops: ResearchStop[];
}

export interface ResearchPlan {
  input: ResearchPlanInput;
  defaults: Pick<ServiceSettings, "capacity" | "maxWalkMeters" | "maxRideMinutes" | "minRiders" | "foldThinSlots">;
  limits: typeof SERVICE_LIMITS;
  respondents: { real: number; demo: number };
  candidates: number;
  riders: { total: number; real: number; demo: number };
  unplaced: number;
  buses: ResearchBus[];
  slots: { slot: string; riders: number; buses: number }[];
  stats: {
    averageRide: number;
    longestRide: number;
    averageWalk: number;
    withinWalk: number;
    dropStops: number;
    boardStops: number;
    seatShare: number;
    busMinutes: number;
    later: number;
    earlier: number;
  };
  steps: { slots: number; groups: number; moved: number; merged: number; waiting: number };
}

const clampTo = (value: number, limit: { min: number; max: number }, fallback: number) =>
  Number.isFinite(value) ? Math.min(limit.max, Math.max(limit.min, Math.round(value))) : fallback;

export function normalizeInput(input: Partial<ResearchPlanInput>, service: ServiceSettings): ResearchPlanInput {
  const capacity = clampTo(Number(input.capacity), SERVICE_LIMITS.capacity, service.capacity);
  return {
    real: input.real !== false,
    demo: input.demo === true,
    demand: input.demand === "typical" ? "typical" : "all",
    capacity,
    maxWalkMeters: clampTo(Number(input.maxWalkMeters), SERVICE_LIMITS.maxWalkMeters, service.maxWalkMeters),
    maxRideMinutes: clampTo(Number(input.maxRideMinutes), SERVICE_LIMITS.maxRideMinutes, service.maxRideMinutes),
    minRiders: Math.min(capacity, clampTo(Number(input.minRiders), SERVICE_LIMITS.minRiders, service.minRiders)),
    foldThinSlots: typeof input.foldThinSlots === "boolean" ? input.foldThinSlots : service.foldThinSlots,
  };
}

export function rideRoll(id: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash / 2 ** 32;
}

export function nearestSlot(slot: string, window: string[]) {
  if (window.includes(slot)) return slot;
  const at = slotIndex(slot) === -1 ? 0 : slotIndex(slot);
  return [...window].sort((a, b) => Math.abs(slotIndex(a) - at) - Math.abs(slotIndex(b) - at))[0];
}

const average = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
const MINUTE = 60_000;

export async function researchPlan(raw: Partial<ResearchPlanInput>): Promise<ResearchPlan> {
  const service = await serviceSettings();
  const input = normalizeInput(raw, service);
  const settings: PlanSettings = { ...planSettingsOf(service), ...input };
  const window = slotsBetween(service.firstSlot, service.lastSlot);
  const [all, candidates, places] = await Promise.all([loadRespondents(), candidateStops(), startPlaces()]);
  const placeOf = new Map(places.map((place) => [place.id, place]));

  const chosen = all.filter(
    (row) =>
      (row.demo ? input.demo : input.real) &&
      (input.demand === "all" || rideRoll(row.userId) < RIDE_SHARE[row.frequency]),
  );
  const demoIds = new Set(chosen.filter((row) => row.demo).map((row) => row.userId));
  const riders = chosen.flatMap((row) => {
    const start = placeOf.get(row.startId) ?? startOfSchool(schoolOf(row.email));
    if (!start || window.length === 0) return [];
    return [
      {
        id: row.userId,
        slot: nearestSlot(row.slot, window),
        home: { lat: row.lat, lng: row.lng },
        board: boardingPlace(start, candidates),
      },
    ];
  });
  const result = planNight({ slots: window, riders, candidates, settings });
  const night = tonight();

  const rides: number[] = [];
  const walks: number[] = [];
  let within = 0;
  const dropStops = new Set<string>();
  const boardStops = new Set<string>();
  const buses = result.buses.map((bus, i) => {
    const departs = nightClock(night, bus.slot);
    const stops = bus.route.stops;
    const busRides = bus.route.seats.map((seat) => stops[seat.alight].offset - stops[seat.board].offset);
    const busWalks = bus.route.seats.map((seat) => walkMinutes(seat.walkMeters, settings));
    rides.push(...busRides);
    walks.push(...busWalks);
    within += bus.route.seats.filter((seat) => seat.walkMeters <= settings.maxWalkMeters).length;
    for (const stop of stops) (stop.kind === "board" ? boardStops : dropStops).add(stop.place.id);
    return {
      key: `research-${i}`,
      slot: bus.slot,
      name: bus.name,
      departs,
      plannedDeparts: departs,
      riders: bus.route.seats.length,
      demoRiders: bus.route.seats.filter((seat) => demoIds.has(seat.riderId)).length,
      boarded: 0,
      capacity: settings.capacity,
      duration: Math.round(bus.route.duration),
      longestRide: Math.round(Math.max(0, ...busRides)),
      longestWalk: Math.max(0, ...busWalks),
      stops: stops.map((stop, seq) => ({
        name: stop.place.name,
        kind: stop.kind,
        at: departs + stop.offset * MINUTE,
        riders: bus.route.seats.filter((seat) => (stop.kind === "board" ? seat.board : seat.alight) === seq).length,
        lat: stop.place.lat,
        lng: stop.place.lng,
      })),
    };
  });

  const placed = rides.length;
  const askedSlots = ALL_SLOTS.filter((slot) => riders.some((rider) => rider.slot === slot));
  const usedSlots = ALL_SLOTS.filter((slot) => buses.some((bus) => bus.slot === slot));
  const askedOf = new Map(riders.map((rider) => [rider.id, slotIndex(rider.slot)]));
  const shifts = result.buses.flatMap((bus) =>
    bus.route.seats.map((seat) => slotIndex(bus.slot) - askedOf.get(seat.riderId)!),
  );
  return {
    input,
    defaults: {
      capacity: service.capacity,
      maxWalkMeters: service.maxWalkMeters,
      maxRideMinutes: service.maxRideMinutes,
      minRiders: service.minRiders,
      foldThinSlots: service.foldThinSlots,
    },
    limits: SERVICE_LIMITS,
    respondents: { real: all.filter((row) => !row.demo).length, demo: all.filter((row) => row.demo).length },
    candidates: candidates.length,
    riders: { total: chosen.length, real: chosen.length - demoIds.size, demo: demoIds.size },
    unplaced: chosen.length - placed,
    buses,
    slots: usedSlots.map((slot) => ({
      slot,
      riders: buses.filter((bus) => bus.slot === slot).reduce((sum, bus) => sum + bus.riders, 0),
      buses: buses.filter((bus) => bus.slot === slot).length,
    })),
    stats: {
      averageRide: average(rides),
      longestRide: Math.max(0, ...rides),
      averageWalk: average(walks),
      withinWalk: placed ? within / placed : 0,
      dropStops: dropStops.size,
      boardStops: boardStops.size,
      seatShare: buses.length ? placed / (buses.length * settings.capacity) : 0,
      busMinutes: Math.round(buses.reduce((sum, bus) => sum + bus.duration, 0)),
      later: shifts.filter((shift) => shift > 0).length,
      earlier: shifts.filter((shift) => shift < 0).length,
    },
    steps: { slots: askedSlots.length, ...result.steps },
  };
}
