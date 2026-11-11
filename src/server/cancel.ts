import { and, eq } from "drizzle-orm";

import { bookings, rideChoices } from "../lib/app-schema";
import { db } from "../lib/db";
import { tonight } from "./clock";
import { hasPlan, rebalance } from "./plans";

export async function cancelBookingFor(userId: string, id: string) {
  const removed = await db
    .delete(bookings)
    .where(and(eq(bookings.id, id), eq(bookings.userId, userId)))
    .returning({ night: bookings.night });
  if (removed.length === 0) return false;
  const night = removed[0].night;
  await db.delete(rideChoices).where(and(eq(rideChoices.userId, userId), eq(rideChoices.night, night)));
  if (night === tonight() && (await hasPlan(night))) await rebalance(night);
  return true;
}
