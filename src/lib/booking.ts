import { query } from "@solidjs/router";
import { respond } from "@solidjs/web";
import { and, asc, eq, gt, gte } from "drizzle-orm";

import { cancelBookingFor } from "../server/cancel";
import { kstToday } from "../server/clock";
import { searchKakaoAddress } from "../server/kakao";
import { bookingBlock } from "../server/no-show";
import { serviceSlots } from "../server/service";
import { ADDRESS_DETAIL_MAX_LENGTH } from "./address";
import { bookings, operatingNights } from "./app-schema";
import { db } from "./db";
import { requireUserId } from "./profile";
import { users } from "./schema";

export interface Booking {
  id: string;
  night: string;
  slot: string;
  address: string;
  addressDetail: string | null;
  isHome: boolean;
  locked: boolean;
}

export interface BookingOverview {
  nights: string[];
  slots: string[];
  bookings: Booking[];
  home: { address: string; detail: string | null } | null;
  blocked?: string;
}

export type BookingResult = { ok: true; count: number } | { ok: false; message: string };

export type BookingAddressChoice =
  | { kind: "keep" }
  | { kind: "home" }
  | { kind: "other"; address: string; detail: string };

async function openNights() {
  const rows = await db
    .select({ night: operatingNights.night })
    .from(operatingNights)
    .where(gt(operatingNights.night, kstToday()))
    .orderBy(asc(operatingNights.night));
  return rows.map((row) => row.night);
}

type PlaceLookup =
  | { ok: true; place: { address: string; detail: string | null; lat: number; lng: number } }
  | { ok: false; message: string };

async function placeOf(address: string, detail: string): Promise<PlaceLookup> {
  address = address.trim();
  detail = detail.trim();
  if (detail.length > ADDRESS_DETAIL_MAX_LENGTH) {
    return { ok: false, message: `상세 주소는 ${ADDRESS_DETAIL_MAX_LENGTH}자까지 쓸 수 있어요.` };
  }
  const results = address ? await searchKakaoAddress(address) : [];
  const match = results.find((r) => r.address === address) ?? results[0];
  if (!match) return { ok: false, message: "주소를 찾지 못했어요. 다시 검색해서 골라 주세요." };
  return { ok: true, place: { address: match.address, detail: detail || null, lat: match.lat, lng: match.lng } };
}

async function homeOf(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user?.homeAddress || user.homeLat === null || user.homeLng === null) return null;
  return { address: user.homeAddress, detail: user.homeAddressDetail, lat: user.homeLat, lng: user.homeLng };
}

export const getBookingOverview = query(async (): Promise<BookingOverview> => {
  "use server";
  const userId = await requireUserId();
  const home = await homeOf(userId);
  const [rows, nights, slots, blocked] = await Promise.all([
    db
      .select()
      .from(bookings)
      .where(and(eq(bookings.userId, userId), gte(bookings.night, kstToday())))
      .orderBy(asc(bookings.night)),
    openNights(),
    serviceSlots(),
    bookingBlock(userId),
  ]);
  return {
    blocked,
    nights,
    slots,
    bookings: rows.map((row) => ({
      id: row.id,
      night: row.night,
      slot: row.slot,
      address: row.address,
      addressDetail: row.addressDetail,
      isHome: row.address === home?.address && row.addressDetail === home?.detail,
      locked: row.night <= kstToday(),
    })),
    home: home && { address: home.address, detail: home.detail },
  };
}, "booking-overview");

export async function createBookings(input: {
  nights: string[];
  slot: string;
  address: { address: string; detail: string } | null;
}): Promise<BookingResult> {
  "use server";
  const done = (result: BookingResult) => respond(result, { revalidate: [getBookingOverview.key] });
  const userId = await requireUserId().catch(() => undefined);
  if (!userId) return done({ ok: false, message: "로그인이 필요해요. 다시 로그인해 주세요." });

  const blocked = await bookingBlock(userId);
  if (blocked) return done({ ok: false, message: blocked });

  const open = new Set(await openNights());
  const nights = [...new Set(input.nights)];
  if (nights.length === 0 || nights.some((night) => !open.has(night))) {
    return done({ ok: false, message: "신청할 수 없는 날이 섞여 있어요. 날짜를 다시 골라 주세요." });
  }
  if (!(await serviceSlots()).includes(input.slot)) {
    return done({ ok: false, message: "시간을 다시 골라 주세요." });
  }

  try {
    let place: { address: string; detail: string | null; lat: number; lng: number } | null;
    if (input.address) {
      const found = await placeOf(input.address.address, input.address.detail);
      if (!found.ok) return done(found);
      place = found.place;
    } else {
      place = await homeOf(userId);
      if (!place) return done({ ok: false, message: "집 주소가 없어요. 내 정보에서 집 주소를 먼저 정해 주세요." });
    }

    for (const night of nights) {
      const values = {
        slot: input.slot,
        address: place.address,
        addressDetail: place.detail,
        lat: place.lat,
        lng: place.lng,
      };
      await db
        .insert(bookings)
        .values({ userId, night, ...values })
        .onConflictDoUpdate({ target: [bookings.userId, bookings.night], set: values });
    }
    return done({ ok: true, count: nights.length });
  } catch (err) {
    console.error("createBookings:", err);
    return done({ ok: false, message: "신청하지 못했어요. 다시 시도해 주세요." });
  }
}

export async function updateBooking(input: {
  id: string;
  slot: string;
  address: BookingAddressChoice;
}): Promise<BookingResult> {
  "use server";
  const done = (result: BookingResult) => respond(result, { revalidate: [getBookingOverview.key] });
  const userId = await requireUserId().catch(() => undefined);
  if (!userId) return done({ ok: false, message: "로그인이 필요해요. 다시 로그인해 주세요." });
  if (!(await serviceSlots()).includes(input.slot)) return done({ ok: false, message: "시간을 다시 골라 주세요." });

  try {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, input.id), eq(bookings.userId, userId)))
      .limit(1);
    if (!booking || booking.night <= kstToday()) {
      return done({ ok: false, message: "바꿀 수 없는 신청이에요. 사전 신청 목록에서 다시 확인해 주세요." });
    }

    let place: { address: string; detail: string | null; lat: number; lng: number } | null = null;
    if (input.address.kind === "home") {
      place = await homeOf(userId);
      if (!place) return done({ ok: false, message: "집 주소가 없어요. 내 정보에서 집 주소를 먼저 정해 주세요." });
    } else if (input.address.kind === "other") {
      const found = await placeOf(input.address.address, input.address.detail);
      if (!found.ok) return done(found);
      place = found.place;
    }

    await db
      .update(bookings)
      .set({
        slot: input.slot,
        ...(place && { address: place.address, addressDetail: place.detail, lat: place.lat, lng: place.lng }),
      })
      .where(and(eq(bookings.id, input.id), eq(bookings.userId, userId)));
    return done({ ok: true, count: 1 });
  } catch (err) {
    console.error("updateBooking:", err);
    return done({ ok: false, message: "바꾸지 못했어요. 다시 시도해 주세요." });
  }
}

export async function cancelBooking(id: string): Promise<BookingResult> {
  "use server";
  const done = (result: BookingResult) => respond(result, { revalidate: [getBookingOverview.key] });
  const userId = await requireUserId().catch(() => undefined);
  if (!userId) return done({ ok: false, message: "로그인이 필요해요. 다시 로그인해 주세요." });
  try {
    if (!(await cancelBookingFor(userId, String(id)))) return done({ ok: false, message: "이미 취소된 신청이에요." });
    return done({ ok: true, count: 1 });
  } catch (err) {
    console.error("cancelBooking:", err);
    return done({ ok: false, message: "취소하지 못했어요. 다시 시도해 주세요." });
  }
}
