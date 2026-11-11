import { SCHOOLS } from "../lib/schools.ts";
import {
  SURVEY_FARES,
  SURVEY_FREQUENCIES,
  SURVEY_WAYS,
  type SurveyFare,
  type SurveyFrequency,
  type SurveyWay,
} from "../lib/survey-options.ts";

export const DEMO_RIDER_PREFIX = "demo-rider-";
export const DEMO_EMAIL_PREFIX = "demo.rider.";
export const DEMO_ADDRESS = "예시 주소";
export const DEMO_MAX = 500;

export const DEMO_SLOTS = ["23:00", "23:30", "00:00", "00:30", "01:00", "01:30", "02:00", "02:30", "03:00", "03:30"];
export const DEMO_SLOT_WEIGHTS = [2, 3, 6, 8, 10, 10, 8, 6, 4, 2];

const DOMAINS = Object.keys(SCHOOLS).filter((domain) => domain !== "dongbang.ac.kr");

const AREAS = [
  { lat: 37.6553, lng: 127.0613, weight: 5 },
  { lat: 37.6448, lng: 127.0645, weight: 3 },
  { lat: 37.638, lng: 127.0257, weight: 4 },
  { lat: 37.6265, lng: 127.026, weight: 3 },
  { lat: 37.6531, lng: 127.0477, weight: 3 },
  { lat: 37.613, lng: 127.052, weight: 3 },
  { lat: 37.6062, lng: 127.0481, weight: 2 },
  { lat: 37.5898, lng: 127.0579, weight: 3 },
  { lat: 37.5801, lng: 127.0469, weight: 2 },
  { lat: 37.6025, lng: 127.0792, weight: 3 },
  { lat: 37.5966, lng: 127.0852, weight: 2 },
  { lat: 37.6029, lng: 127.0137, weight: 2 },
];

const FREQUENCY_WEIGHTS: Record<SurveyFrequency, number> = { rare: 1, "1": 3, "2-3": 4, "4+": 2 };
const WAY_WEIGHTS: Record<SurveyWay, number> = {
  taxi: 5,
  "night-bus": 3,
  "first-train": 2,
  walk: 1,
  stay: 2,
  "leave-early": 4,
  other: 1,
};
const FARE_WEIGHTS: Record<SurveyFare, number> = { "1000": 2, "2000": 4, "3000": 4, "5000": 2, "5000+": 1 };
const AREA_START_SHARE = 0.25;

export interface DemoRider {
  id: string;
  name: string;
  email: string;
  lat: number;
  lng: number;
}

export interface DemoSurvey {
  userId: string;
  frequency: SurveyFrequency;
  slot: string;
  startId: string;
  way: SurveyWay;
  fare: SurveyFare;
}

export function random(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32;
    return seed / 2 ** 32;
  };
}

export function weighted<T>(items: readonly T[], weights: number[], next: () => number) {
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = next() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll < 0) return items[i];
  }
  return items.at(-1)!;
}

export function demoRiders(count: number): DemoRider[] {
  const next = random(2026);
  return Array.from({ length: count }, (_, i) => {
    const n = String(i + 1).padStart(3, "0");
    const domain = DOMAINS[Math.floor(next() * DOMAINS.length)];
    const area = weighted(
      AREAS,
      AREAS.map((a) => a.weight),
      next,
    );
    return {
      id: `${DEMO_RIDER_PREFIX}${n}`,
      name: `데모 학생 ${n}`,
      email: `${DEMO_EMAIL_PREFIX}${n}@${domain}`,
      lat: area.lat + (next() - 0.5) * 0.012,
      lng: area.lng + (next() - 0.5) * 0.014,
    };
  });
}

function schoolStartId(email: string) {
  const domain = email.split("@").pop() ?? "";
  const index = Object.keys(SCHOOLS).indexOf(domain);
  return `school-${Math.max(0, index) + 1}`;
}

export function demoSurveys(riders: DemoRider[], options: { slots: string[]; areaIds: string[] }): DemoSurvey[] {
  const next = random(1111);
  const slots = DEMO_SLOTS.filter((slot) => options.slots.includes(slot));
  const slotWeights = slots.map((slot) => DEMO_SLOT_WEIGHTS[DEMO_SLOTS.indexOf(slot)]);
  const fallbackSlots = slots.length > 0 ? slots : options.slots;
  return riders.map((rider) => {
    const frequency = weighted(
      SURVEY_FREQUENCIES,
      SURVEY_FREQUENCIES.map((key) => FREQUENCY_WEIGHTS[key]),
      next,
    );
    const slot =
      slots.length > 0 ? weighted(slots, slotWeights, next) : fallbackSlots[Math.floor(next() * fallbackSlots.length)];
    const fromArea = options.areaIds.length > 0 && next() < AREA_START_SHARE;
    const startId = fromArea
      ? options.areaIds[Math.floor(next() * options.areaIds.length)]
      : schoolStartId(rider.email);
    const way = weighted(
      SURVEY_WAYS,
      SURVEY_WAYS.map((key) => WAY_WEIGHTS[key]),
      next,
    );
    const fare = weighted(
      SURVEY_FARES,
      SURVEY_FARES.map((key) => FARE_WEIGHTS[key]),
      next,
    );
    return { userId: rider.id, frequency, slot, startId, way, fare };
  });
}
