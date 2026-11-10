import { query } from "@solidjs/router";
import { respond } from "@solidjs/web";
import { GET } from "@solidjs/web/server-functions";
import { asc, count, eq, gte, inArray } from "drizzle-orm";

import { searchKakaoKeyword } from "../server/kakao";
import { kstToday } from "../server/sample-calendar";
import type { AddressResult } from "./address";
import { bookings, operatingNights, stops } from "./app-schema";
import { db } from "./db";
import { requireStaff } from "./staff";

export const STOP_NAME_MAX_LENGTH = 40;
const NIGHT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SERVICE_AREA = { minLat: 37.4, maxLat: 37.75, minLng: 126.75, maxLng: 127.25 };

export interface OperatorNight {
  night: string;
  bookings: number;
}

export interface OperatorNights {
  today: string;
  nights: OperatorNight[];
}

export interface Stop {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export type OperatorResult = { ok: true } | { ok: false; message: string };

export const getOperatorNights = query(async (): Promise<OperatorNights> => {
  "use server";
  await requireStaff();
  const today = kstToday();
  const [nights, counts] = await Promise.all([
    db.select().from(operatingNights).orderBy(asc(operatingNights.night)),
    db
      .select({ night: bookings.night, total: count() })
      .from(bookings)
      .where(gte(bookings.night, today))
      .groupBy(bookings.night),
  ]);
  const totals = new Map(counts.map((row) => [row.night, row.total]));
  return { today, nights: nights.map((row) => ({ night: row.night, bookings: totals.get(row.night) ?? 0 })) };
}, "operator-nights");

export async function setOperatingNights(input: { add: string[]; remove: string[] }): Promise<OperatorResult> {
  "use server";
  const done = (result: OperatorResult) => respond(result, { revalidate: [getOperatorNights.key] });
  try {
    await requireStaff();
  } catch {
    return done({ ok: false, message: "운영자 코드를 다시 입력해 주세요." });
  }

  const today = kstToday();
  const add = [...new Set(input.add)];
  const remove = [...new Set(input.remove)];
  if ([...add, ...remove].some((night) => !NIGHT_PATTERN.test(night))) {
    return done({ ok: false, message: "날짜 형식이 맞지 않아요." });
  }
  if ([...add, ...remove].some((night) => night < today)) {
    return done({ ok: false, message: "지난 날은 바꿀 수 없어요." });
  }

  try {
    if (remove.length > 0) {
      const booked = await db
        .select({ night: bookings.night })
        .from(bookings)
        .where(inArray(bookings.night, remove))
        .limit(1);
      if (booked.length > 0) {
        return done({ ok: false, message: "신청한 학생이 있는 날은 운행일에서 뺄 수 없어요." });
      }
      await db.delete(operatingNights).where(inArray(operatingNights.night, remove));
    }
    if (add.length > 0) {
      await db
        .insert(operatingNights)
        .values(add.map((night) => ({ night })))
        .onConflictDoNothing();
    }
    return done({ ok: true });
  } catch (err) {
    console.error("setOperatingNights:", err);
    return done({ ok: false, message: "저장하지 못했어요. 다시 시도해 주세요." });
  }
}

export const getStops = query(async (): Promise<Stop[]> => {
  "use server";
  await requireStaff();
  const rows = await db.select().from(stops).orderBy(asc(stops.name));
  return rows.map(({ id, name, address, lat, lng }) => ({ id, name, address, lat, lng }));
}, "operator-stops");

export const searchStopPlaces = GET(async (text: string): Promise<AddressResult[]> => {
  "use server";
  await requireStaff();
  text = text.trim().slice(0, 100);
  if (text.length < 2) return [];
  return searchKakaoKeyword(text);
});

function cleanName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export async function addStop(input: Omit<Stop, "id">): Promise<OperatorResult> {
  "use server";
  const done = (result: OperatorResult) => respond(result, { revalidate: [getStops.key] });
  try {
    await requireStaff();
  } catch {
    return done({ ok: false, message: "운영자 코드를 다시 입력해 주세요." });
  }

  const name = cleanName(input.name);
  const address = input.address.trim();
  if (!name || name.length > STOP_NAME_MAX_LENGTH) {
    return done({ ok: false, message: `정류장 이름은 1–${STOP_NAME_MAX_LENGTH}자로 써 주세요.` });
  }
  const inArea =
    input.lat >= SERVICE_AREA.minLat &&
    input.lat <= SERVICE_AREA.maxLat &&
    input.lng >= SERVICE_AREA.minLng &&
    input.lng <= SERVICE_AREA.maxLng;
  if (!address || !inArea) return done({ ok: false, message: "서울 안의 장소를 검색해서 골라 주세요." });

  try {
    const [same] = await db.select({ id: stops.id }).from(stops).where(eq(stops.name, name)).limit(1);
    if (same) return done({ ok: false, message: "같은 이름의 정류장이 이미 있어요." });
    await db.insert(stops).values({ name, address, lat: input.lat, lng: input.lng });
    return done({ ok: true });
  } catch (err) {
    console.error("addStop:", err);
    return done({ ok: false, message: "추가하지 못했어요. 다시 시도해 주세요." });
  }
}

export async function renameStop(id: string, name: string): Promise<OperatorResult> {
  "use server";
  const done = (result: OperatorResult) => respond(result, { revalidate: [getStops.key] });
  try {
    await requireStaff();
  } catch {
    return done({ ok: false, message: "운영자 코드를 다시 입력해 주세요." });
  }

  name = cleanName(name);
  if (!name || name.length > STOP_NAME_MAX_LENGTH) {
    return done({ ok: false, message: `정류장 이름은 1–${STOP_NAME_MAX_LENGTH}자로 써 주세요.` });
  }
  try {
    const [same] = await db.select({ id: stops.id }).from(stops).where(eq(stops.name, name)).limit(1);
    if (same && same.id !== id) return done({ ok: false, message: "같은 이름의 정류장이 이미 있어요." });
    await db.update(stops).set({ name }).where(eq(stops.id, id));
    return done({ ok: true });
  } catch (err) {
    console.error("renameStop:", err);
    return done({ ok: false, message: "이름을 바꾸지 못했어요. 다시 시도해 주세요." });
  }
}

export async function deleteStop(id: string): Promise<OperatorResult> {
  "use server";
  const done = (result: OperatorResult) => respond(result, { revalidate: [getStops.key] });
  try {
    await requireStaff();
    await db.delete(stops).where(eq(stops.id, id));
    return done({ ok: true });
  } catch (err) {
    console.error("deleteStop:", err);
    return done({ ok: false, message: "삭제하지 못했어요. 다시 시도해 주세요." });
  }
}
