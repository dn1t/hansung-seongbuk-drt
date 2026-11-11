import { and, eq, inArray, like, notInArray, sql } from "drizzle-orm";

import { bookings, plans, surveys } from "../lib/app-schema";
import { db } from "../lib/db";
import { users } from "../lib/schema";
import { DEMO_ADDRESS, DEMO_RIDER_PREFIX, demoRiders, demoSurveys } from "./demo-data";
import { startPlaces } from "./places";
import { serviceSlots } from "./service";

const CHUNK = 100;

function chunks<T>(rows: T[]) {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += CHUNK) out.push(rows.slice(i, i + CHUNK));
  return out;
}

const demoRiderIds = like(users.id, `${DEMO_RIDER_PREFIX}%`);

async function dropPlansOf(ids: string[] | "all") {
  const riders = db
    .select({ id: users.id })
    .from(users)
    .where(ids === "all" ? eq(users.demo, true) : inArray(users.id, ids));
  const nights = db.selectDistinct({ night: bookings.night }).from(bookings).where(inArray(bookings.userId, riders));
  await db.delete(plans).where(inArray(plans.night, nights));
}

export async function makeDemoRespondents(count: number) {
  const riders = demoRiders(count);
  const [slots, places] = await Promise.all([serviceSlots(), startPlaces()]);
  const answers = demoSurveys(riders, {
    slots,
    areaIds: places.filter((place) => place.kind === "area").map((place) => place.id),
  });

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
    await dropPlansOf(ids);
    for (const part of chunks(ids)) await db.delete(users).where(inArray(users.id, part));
  }

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
  return { made: riders.length, removed: extra.length };
}

export async function clearDemoRespondents() {
  await dropPlansOf("all");
  const removed = await db.delete(users).where(eq(users.demo, true)).returning({ id: users.id });
  return removed.length;
}
