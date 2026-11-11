import { eq } from "drizzle-orm";

import { appSettings } from "../lib/app-schema";
import { db } from "../lib/db";
import { ALL_SLOTS, slotIndex, slotsBetween } from "./clock";
import { PLAN_SETTINGS, type PlanSettings } from "./planner/settings";

export interface ServiceSettings {
  firstSlot: string;
  lastSlot: string;
  capacity: number;
  maxWalkMeters: number;
  maxRideMinutes: number;
  minRiders: number;
  dayOfCutoffMinutes: number;
  noShowLimit: number;
}

export const DEFAULT_SERVICE: ServiceSettings = {
  firstSlot: "23:00",
  lastSlot: "03:30",
  capacity: PLAN_SETTINGS.capacity,
  maxWalkMeters: PLAN_SETTINGS.maxWalkMeters,
  maxRideMinutes: PLAN_SETTINGS.maxRideMinutes,
  minRiders: PLAN_SETTINGS.minRiders,
  dayOfCutoffMinutes: 5,
  noShowLimit: 0,
};

export const SERVICE_LIMITS = {
  capacity: { min: 5, max: 60 },
  maxWalkMeters: { min: 200, max: 1500 },
  maxRideMinutes: { min: 20, max: 120 },
  minRiders: { min: 1, max: 60 },
  dayOfCutoffMinutes: { min: 0, max: 60 },
  noShowLimit: { min: 0, max: 10 },
} as const;

const KEY = "service";

export function validateService(input: ServiceSettings): string | undefined {
  if (slotIndex(input.firstSlot) === -1 || slotIndex(input.lastSlot) === -1) return "시간대를 다시 골라 주세요.";
  if (slotIndex(input.firstSlot) > slotIndex(input.lastSlot)) return "마지막 시간대를 첫 시간대보다 뒤로 골라 주세요.";
  const labels: Record<keyof typeof SERVICE_LIMITS, string> = {
    capacity: "버스 정원",
    maxWalkMeters: "정류장에서 집까지 거리",
    maxRideMinutes: "가장 긴 탑승 시간",
    minRiders: "버스 한 대 최소 인원",
    dayOfCutoffMinutes: "당일 신청 마감",
    noShowLimit: "안 탄 날 제한",
  };
  for (const key of Object.keys(SERVICE_LIMITS) as (keyof typeof SERVICE_LIMITS)[]) {
    const { min, max } = SERVICE_LIMITS[key];
    const value = input[key];
    if (!Number.isInteger(value) || value < min || value > max)
      return `${labels[key]}은 ${min}–${max} 사이로 넣어 주세요.`;
  }
  if (input.minRiders > input.capacity) return "최소 인원은 버스 정원보다 많을 수 없어요.";
  return undefined;
}

export async function serviceSettings(): Promise<ServiceSettings> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, KEY)).limit(1);
  const stored = (row?.value ?? {}) as Partial<ServiceSettings>;
  const merged = { ...DEFAULT_SERVICE, ...stored };
  return validateService(merged) ? DEFAULT_SERVICE : merged;
}

export async function saveServiceSettings(input: ServiceSettings) {
  await db
    .insert(appSettings)
    .values({ key: KEY, value: input })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: input, updatedAt: new Date() } });
}

export async function serviceSlots() {
  const settings = await serviceSettings();
  return slotsBetween(settings.firstSlot, settings.lastSlot);
}

export function planSettingsOf(service: ServiceSettings): PlanSettings {
  return {
    ...PLAN_SETTINGS,
    capacity: service.capacity,
    maxWalkMeters: service.maxWalkMeters,
    maxRideMinutes: service.maxRideMinutes,
    minRiders: service.minRiders,
  };
}

export { ALL_SLOTS };

export const NO_SHOW_WINDOW_DAYS = 30;
