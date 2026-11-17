import { SCHOOL_START_IDS, SCHOOLS } from "../lib/schools.ts";
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

const DOMAINS = Object.keys(SCHOOLS);

interface HomeArea {
  region: string;
  lat: number;
  lng: number;
  weight: number;
  spread: number;
}

const SEOUL = 0.012;
const OUTER = 0.022;

const AREAS: HomeArea[] = [
  { region: "서울 성북구", lat: 37.6062, lng: 127.0281, weight: 6, spread: SEOUL },
  { region: "서울 노원구", lat: 37.6449, lng: 127.0659, weight: 6, spread: SEOUL },
  { region: "서울 강북구", lat: 37.6326, lng: 127.0213, weight: 5, spread: SEOUL },
  { region: "서울 도봉구", lat: 37.6619, lng: 127.0396, weight: 4, spread: SEOUL },
  { region: "서울 중랑구", lat: 37.5998, lng: 127.0909, weight: 4, spread: SEOUL },
  { region: "서울 동대문구", lat: 37.5822, lng: 127.0527, weight: 4, spread: SEOUL },
  { region: "서울 은평구", lat: 37.6106, lng: 126.9227, weight: 3, spread: SEOUL },
  { region: "서울 광진구", lat: 37.5434, lng: 127.0791, weight: 3, spread: SEOUL },
  { region: "서울 종로구", lat: 37.5834, lng: 126.9937, weight: 2, spread: SEOUL },
  { region: "서울 성동구", lat: 37.5552, lng: 127.0386, weight: 2, spread: SEOUL },
  { region: "서울 서대문구", lat: 37.5768, lng: 126.9383, weight: 2, spread: SEOUL },
  { region: "서울 마포구", lat: 37.5577, lng: 126.9081, weight: 2, spread: SEOUL },
  { region: "서울 송파구", lat: 37.5049, lng: 127.1149, weight: 2, spread: SEOUL },
  { region: "서울 강동구", lat: 37.5426, lng: 127.1386, weight: 2, spread: SEOUL },
  { region: "서울 관악구", lat: 37.4728, lng: 126.9445, weight: 2, spread: SEOUL },
  { region: "서울 강서구", lat: 37.5574, lng: 126.8424, weight: 2, spread: SEOUL },
  { region: "서울 중구", lat: 37.5596, lng: 127.0055, weight: 1, spread: SEOUL },
  { region: "서울 용산구", lat: 37.5324, lng: 126.9817, weight: 1, spread: SEOUL },
  { region: "서울 양천구", lat: 37.5235, lng: 126.8604, weight: 1, spread: SEOUL },
  { region: "서울 구로구", lat: 37.4948, lng: 126.8579, weight: 1, spread: SEOUL },
  { region: "서울 금천구", lat: 37.4627, lng: 126.9022, weight: 1, spread: SEOUL },
  { region: "서울 영등포구", lat: 37.5193, lng: 126.9095, weight: 1, spread: SEOUL },
  { region: "서울 동작구", lat: 37.5017, lng: 126.9473, weight: 1, spread: SEOUL },
  { region: "서울 서초구", lat: 37.4877, lng: 127.0189, weight: 1, spread: SEOUL },
  { region: "서울 강남구", lat: 37.4979, lng: 127.0612, weight: 1, spread: SEOUL },
  { region: "경기 의정부시", lat: 37.7381, lng: 127.0475, weight: 2, spread: OUTER },
  { region: "경기 남양주시", lat: 37.6363, lng: 127.2165, weight: 1, spread: OUTER },
  { region: "경기 구리시", lat: 37.5986, lng: 127.1393, weight: 1, spread: OUTER },
  { region: "경기 고양시", lat: 37.6584, lng: 126.832, weight: 1, spread: OUTER },
  { region: "경기 양주시", lat: 37.7853, lng: 127.0458, weight: 0.5, spread: OUTER },
  { region: "경기 파주시", lat: 37.7599, lng: 126.7802, weight: 0.5, spread: OUTER },
  { region: "경기 김포시", lat: 37.6152, lng: 126.7156, weight: 0.5, spread: OUTER },
  { region: "경기 하남시", lat: 37.5393, lng: 127.2149, weight: 0.5, spread: OUTER },
  { region: "경기 성남시", lat: 37.4201, lng: 127.1265, weight: 0.5, spread: OUTER },
  { region: "경기 부천시", lat: 37.5035, lng: 126.766, weight: 0.5, spread: OUTER },
  { region: "경기 광명시", lat: 37.4786, lng: 126.8646, weight: 0.5, spread: OUTER },
  { region: "경기 안양시", lat: 37.3943, lng: 126.9568, weight: 0.5, spread: OUTER },
  { region: "경기 수원시", lat: 37.2636, lng: 127.0286, weight: 0.5, spread: OUTER },
  { region: "경기 용인시", lat: 37.3219, lng: 127.0977, weight: 0.5, spread: OUTER },
  { region: "경기 시흥시", lat: 37.3799, lng: 126.8031, weight: 0.5, spread: OUTER },
  { region: "경기 안산시", lat: 37.3219, lng: 126.8309, weight: 0.5, spread: OUTER },
  { region: "경기 군포시", lat: 37.3617, lng: 126.9352, weight: 0.5, spread: OUTER },
  { region: "인천 부평구", lat: 37.5075, lng: 126.7218, weight: 0.5, spread: SEOUL },
  { region: "인천 계양구", lat: 37.5372, lng: 126.7377, weight: 0.5, spread: SEOUL },
  { region: "인천 연수구", lat: 37.4103, lng: 126.6783, weight: 0.5, spread: SEOUL },
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
  address: string;
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
      address: `${area.region} (${DEMO_ADDRESS})`,
      lat: area.lat + (next() - 0.5) * area.spread,
      lng: area.lng + (next() - 0.5) * area.spread * 1.25,
    };
  });
}

function schoolStartId(email: string) {
  const school = SCHOOLS[(email.split("@").pop() ?? "") as keyof typeof SCHOOLS] ?? SCHOOLS["hansung.ac.kr"];
  return SCHOOL_START_IDS[school];
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
