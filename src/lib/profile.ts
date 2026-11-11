import { query } from "@solidjs/router";
import { getRequestEvent, respond } from "@solidjs/web";
import { and, desc, eq } from "drizzle-orm";

import { boardings, buses, busStops, emailPrefs } from "./app-schema";
import { auth } from "./auth";
import { db } from "./db";
import { users } from "./schema";
import { schoolOf } from "./schools";

export interface Profile {
  id: string;
  name: string;
  email: string;
  school: string | undefined;
  homeAddress: string | null;
  homeAddressDetail: string | null;
  bookingMail: boolean;
}

export async function requireUserId() {
  "use server";
  const headers = getRequestEvent()?.request.headers;
  const session = headers ? await auth.api.getSession({ headers }) : null;
  if (!session) throw new Error("로그인이 필요해요. 다시 로그인해 주세요.");
  return session.user.id;
}

export const getProfile = query(async (): Promise<Profile> => {
  "use server";
  const id = await requireUserId();
  const [[user], [prefs]] = await Promise.all([
    db.select().from(users).where(eq(users.id, id)).limit(1),
    db.select().from(emailPrefs).where(eq(emailPrefs.userId, id)).limit(1),
  ]);
  if (!user) throw new Error("계정을 찾지 못했어요. 다시 로그인해 주세요.");
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    school: schoolOf(user.email),
    homeAddress: user.homeAddress,
    homeAddressDetail: user.homeAddressDetail,
    bookingMail: prefs?.bookingOpen ?? true,
  };
}, "profile");

export const getMyQr = query(async () => {
  "use server";
  const id = await requireUserId();
  const { qrTokenFor } = await import("../server/qr-token");
  return qrTokenFor(id);
}, "my-qr");

export interface RideRecord {
  night: string;
  busName: string;
  boardedAt: number;
  dropOff: string | null;
}

const HISTORY_SIZE = 30;

export const getRideHistory = query(async (): Promise<RideRecord[]> => {
  "use server";
  const id = await requireUserId();
  const rows = await db
    .select({
      night: boardings.night,
      busName: buses.name,
      boardedAt: boardings.boardedAt,
      dropOff: busStops.name,
    })
    .from(boardings)
    .innerJoin(buses, eq(buses.id, boardings.busId))
    .leftJoin(busStops, and(eq(busStops.busId, boardings.busId), eq(busStops.seq, boardings.alightSeq)))
    .where(eq(boardings.userId, id))
    .orderBy(desc(boardings.night))
    .limit(HISTORY_SIZE);
  return rows;
}, "ride-history");

export async function freshQr() {
  "use server";
  const id = await requireUserId();
  const { qrTokenFor } = await import("../server/qr-token");
  return qrTokenFor(id);
}

export async function setBookingMail(on: boolean): Promise<{ ok: boolean }> {
  "use server";
  const id = await requireUserId();
  const bookingOpen = on === true;
  await db
    .insert(emailPrefs)
    .values({ userId: id, bookingOpen })
    .onConflictDoUpdate({ target: emailPrefs.userId, set: { bookingOpen, updatedAt: new Date() } });
  return respond({ ok: true }, { revalidate: [getProfile.key] });
}
