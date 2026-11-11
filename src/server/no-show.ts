import { and, count, eq, gte, lt, notExists, sql } from "drizzle-orm";

import { boardings, bookings, plans } from "../lib/app-schema";
import { db } from "../lib/db";
import { kstDate, serviceNow, tonight } from "./clock";
import { NO_SHOW_WINDOW_DAYS, serviceSettings } from "./service";

const DAY = 24 * 60 * 60_000;

export async function recentNoShows(userId: string) {
  const since = kstDate(serviceNow() - NO_SHOW_WINDOW_DAYS * DAY);
  const [row] = await db
    .select({ total: count() })
    .from(bookings)
    .innerJoin(plans, eq(plans.night, bookings.night))
    .where(
      and(
        eq(bookings.userId, userId),
        gte(bookings.night, since),
        lt(bookings.night, tonight()),
        notExists(
          db
            .select({ one: sql`1` })
            .from(boardings)
            .where(and(eq(boardings.userId, bookings.userId), eq(boardings.night, bookings.night))),
        ),
      ),
    );
  return row?.total ?? 0;
}

export async function bookingBlock(userId: string) {
  const { noShowLimit } = await serviceSettings();
  if (noShowLimit === 0) return undefined;
  const missed = await recentNoShows(userId);
  if (missed < noShowLimit) return undefined;
  return `최근 ${NO_SHOW_WINDOW_DAYS}일 동안 신청하고 타지 않은 날이 ${missed}번 있어서 지금은 새로 신청할 수 없어요. 운영팀에 문의해 주세요.`;
}

const MIN_HISTORY = 3;

export async function expectedRiders(userIds: string[]) {
  if (userIds.length === 0) return 0;
  const since = kstDate(serviceNow() - NO_SHOW_WINDOW_DAYS * DAY);
  const rows = await db
    .select({
      userId: bookings.userId,
      booked: count(),
      boarded: sql<number>`sum(case when exists (select 1 from ${boardings} where ${boardings.userId} = ${bookings.userId} and ${boardings.night} = ${bookings.night}) then 1 else 0 end)`,
    })
    .from(bookings)
    .innerJoin(plans, eq(plans.night, bookings.night))
    .where(and(gte(bookings.night, since), lt(bookings.night, tonight())))
    .groupBy(bookings.userId);
  const history = new Map(rows.map((row) => [row.userId, row]));
  return userIds.reduce((sum, userId) => {
    const past = history.get(userId);
    if (!past || past.booked < MIN_HISTORY) return sum + 1;
    return sum + Number(past.boarded) / past.booked;
  }, 0);
}
