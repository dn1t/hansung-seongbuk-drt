import { and, eq, inArray, like, notInArray, sql } from "drizzle-orm";

import { bookings, plans, surveys } from "../lib/app-schema";
import { db } from "../lib/db";
import { users } from "../lib/schema";
import { serviceNow, slotCutoff } from "./clock";
import {
  DEMO_ADDRESS,
  DEMO_RIDER_PREFIX,
  DEMO_SLOT_WEIGHTS,
  DEMO_SLOTS,
  type DemoRider,
  demoRiders,
  demoSurveys,
  random,
  weighted,
} from "./demo-data";
import { startPlaces } from "./places";
import { hasActivity, refreshPreviews } from "./plans";
import { serviceSlots } from "./service";

const CHUNK = 100;

function chunks<T>(rows: T[]) {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += CHUNK) out.push(rows.slice(i, i + CHUNK));
  return out;
}

const demoRiderIds = like(users.id, `${DEMO_RIDER_PREFIX}%`);

const demoUsers = db.select({ id: users.id }).from(users).where(eq(users.demo, true));

async function nightsOf(ids: string[] | "all") {
  const riders = ids === "all" ? demoUsers : db.select({ id: users.id }).from(users).where(inArray(users.id, ids));
  const rows = await db
    .selectDistinct({ night: bookings.night })
    .from(bookings)
    .where(inArray(bookings.userId, riders));
  return rows.map((row) => row.night);
}

async function replanQuietNights(nights: string[]) {
  for (const night of nights) {
    if (!(await hasActivity(night))) await db.delete(plans).where(eq(plans.night, night));
  }
}

export async function makeDemoRespondents(count: number) {
  const riders = demoRiders(count);
  const extra = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        demoRiderIds,
        eq(users.demo, true),
        notInArray(
          users.id,
          riders.map((rider) => rider.id),
        ),
      ),
    );
  if (extra.length > 0) {
    const ids = extra.map((row) => row.id);
    const nights = await nightsOf(ids);
    for (const part of chunks(ids)) await db.delete(users).where(inArray(users.id, part));
    await replanQuietNights(nights);
  }
  await saveDemoRiders(riders);
  return { made: riders.length, removed: extra.length };
}

async function saveDemoRiders(riders: DemoRider[]) {
  const [slots, places] = await Promise.all([serviceSlots(), startPlaces()]);
  const answers = demoSurveys(riders, {
    slots,
    areaIds: places.filter((place) => place.kind === "area").map((place) => place.id),
  });

  const statements = [
    ...chunks(riders).map((part) =>
      db
        .insert(users)
        .values(
          part.map((rider) => ({
            id: rider.id,
            name: rider.name,
            email: rider.email,
            emailVerified: true,
            homeAddress: DEMO_ADDRESS,
            homeLat: rider.lat,
            homeLng: rider.lng,
            demo: true,
          })),
        )
        .onConflictDoUpdate({
          target: users.id,
          set: {
            name: sql`excluded.name`,
            homeLat: sql`excluded.home_lat`,
            homeLng: sql`excluded.home_lng`,
            demo: true,
          },
        }),
    ),
    ...chunks(answers).map((part) =>
      db
        .insert(surveys)
        .values(part)
        .onConflictDoUpdate({
          target: surveys.userId,
          set: {
            frequency: sql`excluded.frequency`,
            slot: sql`excluded.slot`,
            startId: sql`excluded.start_id`,
            way: sql`excluded.way`,
            fare: sql`excluded.fare`,
            updatedAt: new Date(),
          },
        }),
    ),
  ];
  if (statements.length > 0) await db.batch(statements as [(typeof statements)[number], ...typeof statements]);
}

export async function clearDemoRespondents() {
  const nights = await nightsOf("all");
  const removed = await db.delete(users).where(eq(users.demo, true)).returning({ id: users.id });
  await replanQuietNights(nights);
  return removed.length;
}

export async function openDemoSlots(night: string) {
  const now = serviceNow();
  return (await serviceSlots()).filter((slot) => slotCutoff(night, slot) > now);
}

export async function addDemoBookings(night: string, count: number) {
  const open = await openDemoSlots(night);
  if (open.length === 0) return { added: 0, kept: 0 };
  const riders = demoRiders(count);
  await saveDemoRiders(riders);
  await db
    .delete(bookings)
    .where(and(eq(bookings.night, night), inArray(bookings.slot, open), inArray(bookings.userId, demoUsers)));
  const kept = await db
    .select({ userId: bookings.userId })
    .from(bookings)
    .where(and(eq(bookings.night, night), inArray(bookings.userId, demoUsers)));
  const taken = new Set(kept.map((row) => row.userId));

  const next = random(Number(night.replaceAll("-", "")) + count);
  const weights = open.map((slot) => DEMO_SLOT_WEIGHTS[DEMO_SLOTS.indexOf(slot)] ?? 1);
  const rows = riders
    .filter((rider) => !taken.has(rider.id))
    .map((rider) => ({
      id: crypto.randomUUID(),
      userId: rider.id,
      night,
      slot: weighted(open, weights, next),
      address: DEMO_ADDRESS,
      lat: rider.lat,
      lng: rider.lng,
    }));
  const statements = chunks(rows).map((part) => db.insert(bookings).values(part).onConflictDoNothing());
  if (statements.length > 0) await db.batch(statements as [(typeof statements)[number], ...typeof statements]);
  refreshPreviews([night]);
  return { added: rows.length, kept: taken.size };
}

export async function clearDemoBookings(night: string) {
  const removed = await db
    .delete(bookings)
    .where(and(eq(bookings.night, night), inArray(bookings.userId, demoUsers)))
    .returning({ id: bookings.id });
  if (removed.length > 0) {
    await replanQuietNights([night]);
    refreshPreviews([night]);
  }
  return removed.length;
}
