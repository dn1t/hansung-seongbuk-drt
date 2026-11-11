import { and, eq } from "drizzle-orm";

import { boardings, bookings } from "../lib/app-schema";
import { isJoinedUser } from "../lib/auth-join";
import type { BoardingResult } from "../lib/boarding";
import { db } from "../lib/db";
import { users } from "../lib/schema";
import { schoolOf } from "../lib/schools";
import { serviceNow, tonight } from "./clock";
import { distance } from "./planner/geo";
import { DAY_OF_SETTINGS, PLAN_SETTINGS, walkMinutes } from "./planner/settings";
import { ensurePlan, loadNight, loadsOf } from "./plans";
import { isQrToken, readQrToken } from "./qr-token";

async function nightState() {
  const night = tonight();
  await ensurePlan(night);
  return loadNight(night);
}

export async function boardStudent(busId: string, code: string, typed: boolean): Promise<BoardingResult> {
  const state = await nightState();
  const bus = state.buses.find((b) => b.id === busId);
  if (!bus) return { ok: false, message: "오늘 운행하는 버스를 먼저 골라 주세요." };

  let userId = code.trim();
  if (isQrToken(userId)) {
    const checked = await readQrToken(userId);
    if (!checked.ok) {
      return {
        ok: false,
        message:
          checked.reason === "expired"
            ? "시간이 지난 QR이에요. 학생 앱에서 내 QR을 다시 열어 달라고 해 주세요."
            : "학생 QR이 아니에요. 탈 수 없어요.",
      };
    }
    userId = checked.userId;
  } else if (!typed) {
    return { ok: false, message: "학생 QR이 아니에요. 탈 수 없어요." };
  }
  const [user] = userId ? await db.select().from(users).where(eq(users.id, userId)).limit(1) : [];
  const school = user && schoolOf(user.email);
  if (!user || !school || !user.emailVerified || !isJoinedUser(user)) {
    return { ok: false, message: "학생 QR이 아니에요. 탈 수 없어요." };
  }

  const choice = state.choices.find((c) => c.userId === user.id && c.busId === bus.id);
  const seat = state.seats.find((s) => s.userId === user.id && s.busId === bus.id);
  const [booking] = await db
    .select({ lat: bookings.lat, lng: bookings.lng })
    .from(bookings)
    .where(and(eq(bookings.userId, user.id), eq(bookings.night, state.night)))
    .limit(1);
  const home =
    booking ?? (user.homeLat !== null && user.homeLng !== null ? { lat: user.homeLat, lng: user.homeLng } : null);
  let alightSeq = choice?.alightSeq ?? seat?.alightSeq ?? null;
  const dropOffs = bus.stops.filter((s) => s.kind === "alight");
  if (alightSeq === null && home && dropOffs.length > 0) {
    alightSeq = dropOffs.reduce((best, s) => (distance(s, home) < distance(best, home) ? s : best)).seq;
  }
  const alightStop = bus.stops.find((s) => s.seq === alightSeq);
  const walkHome = alightStop && home ? walkMinutes(distance(alightStop, home), PLAN_SETTINGS) : null;
  const farFromHome = alightStop && home ? distance(alightStop, home) > DAY_OF_SETTINGS.maxHomeWalkMeters : false;

  const previous = state.boardings.find((b) => b.userId === user.id);
  const values = { busId: bus.id, alightSeq, boardedAt: serviceNow() };
  await db
    .insert(boardings)
    .values({ userId: user.id, night: state.night, ...values })
    .onConflictDoUpdate({ target: [boardings.userId, boardings.night], set: values });

  const loads = loadsOf(await loadNight(state.night));
  return {
    ok: true,
    name: user.name,
    school,
    dropOff: alightStop?.name ?? null,
    walkHome,
    farFromHome,
    again: previous?.busId === bus.id,
    load: loads.get(bus.id) ?? 0,
    capacity: bus.capacity,
  };
}
