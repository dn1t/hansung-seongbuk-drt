import { and, eq } from "drizzle-orm";

import { appSettings, busRiders } from "../lib/app-schema";
import { db } from "../lib/db";
import { serviceNow, setPresentationOffset, slotCutoff, tonight } from "./clock";
import { ensurePlan } from "./plans";
import { serviceSlots } from "./service";

const KEY = "presentation";
const REFRESH_MS = 2_000;
const MINUTE = 60_000;

export interface Presentation {
  offset: number;
  autoAdvance: boolean;
}

let current: Presentation | null = null;
let checkedAt = 0;

function apply(next: Presentation | null) {
  current = next;
  checkedAt = Date.now();
  setPresentationOffset(next?.offset);
}

function parse(value: unknown): Presentation | null {
  const candidate = value as Partial<Presentation> | null;
  if (!candidate || typeof candidate.offset !== "number" || !Number.isFinite(candidate.offset)) return null;
  return { offset: candidate.offset, autoAdvance: candidate.autoAdvance !== false };
}

export async function syncPresentation() {
  if (Date.now() - checkedAt < REFRESH_MS) return current;
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, KEY)).limit(1);
  apply(parse(row?.value));
  return current;
}

async function save(next: Presentation | null) {
  if (next) {
    await db
      .insert(appSettings)
      .values({ key: KEY, value: next })
      .onConflictDoUpdate({ target: appSettings.key, set: { value: next, updatedAt: new Date() } });
  } else {
    await db.delete(appSettings).where(eq(appSettings.key, KEY));
  }
  apply(next);
}

export async function startPresentation(at: number, autoAdvance: boolean) {
  await save({ offset: at - Date.now(), autoAdvance });
}

export async function stopPresentation() {
  await save(null);
}

export async function advancePresentation(minutes: number) {
  const active = await syncPresentation();
  if (!active) return false;
  await save({ ...active, offset: active.offset + minutes * MINUTE });
  return true;
}

async function isSeated(userId: string, night: string) {
  const [seat] = await db
    .select({ busId: busRiders.busId })
    .from(busRiders)
    .where(and(eq(busRiders.userId, userId), eq(busRiders.night, night)))
    .limit(1);
  return seat !== undefined;
}

export async function advanceForBooking(userId: string, nights: string[], slot: string) {
  const active = await syncPresentation();
  const night = tonight();
  if (!active?.autoAdvance || !nights.includes(night)) return;
  const window = await serviceSlots();
  const slots = window.slice(window.indexOf(slot), window.indexOf(slot) + 2);
  for (const candidate of slots) {
    const target = slotCutoff(night, candidate) + MINUTE;
    if (target > serviceNow()) await save({ ...active, offset: target - Date.now() });
    await ensurePlan(night);
    if (await isSeated(userId, night)) return;
  }
}
