import { query } from "@solidjs/router";
import { respond } from "@solidjs/web";
import { GET } from "@solidjs/web/server-functions";
import { and, asc, count, desc, eq, gt, gte, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm";

import { ALL_SLOTS, kstToday, nightClock, slotsBetween, tonight } from "../server/clock";
import { searchKakaoKeyword } from "../server/kakao";
import { expectedRiders } from "../server/no-show";
import { SCHOOL_PLACES } from "../server/places";
import { centroid } from "../server/planner/geo";
import { distance } from "../server/planner/geo";
import { PLAN_SETTINGS, walkMinutes } from "../server/planner/settings";
import {
  ensurePlan,
  hasActivity,
  hasPlan,
  isOperatingNight,
  loadNight,
  loadsOf,
  previewPlan,
  rebuildPlan,
} from "../server/plans";
import {
  saveServiceSettings,
  SERVICE_LIMITS,
  type ServiceSettings,
  serviceSettings,
  validateService,
} from "../server/service";
import { prepareImport } from "../server/stop-import";
import type { AddressResult } from "./address";
import { bookings, emailPrefs, operatingNights, plans, startAreas, stops, travelTimes } from "./app-schema";
import { db } from "./db";
import { accounts, users } from "./schema";
import { requireStaff } from "./staff";
import { formatNight } from "./time";

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
  unannounced: string[];
  recipients: number;
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
  const [nights, counts, recipients] = await Promise.all([
    db.select().from(operatingNights).orderBy(asc(operatingNights.night)),
    db
      .select({ night: bookings.night, total: count() })
      .from(bookings)
      .where(gte(bookings.night, today))
      .groupBy(bookings.night),
    announceRecipients(),
  ]);
  const totals = new Map(counts.map((row) => [row.night, row.total]));
  return {
    today,
    nights: nights.map((row) => ({ night: row.night, bookings: totals.get(row.night) ?? 0 })),
    unannounced: nights.filter((row) => row.night > today && row.announcedAt === null).map((row) => row.night),
    recipients: recipients.length,
  };
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

export async function deleteAllStops(): Promise<OperatorResult & { deleted?: number }> {
  "use server";
  const done = (result: OperatorResult & { deleted?: number }) => respond(result, { revalidate: [getStops.key] });
  try {
    await requireStaff();
  } catch {
    return done({ ok: false, message: "운영자 코드를 다시 입력해 주세요." });
  }
  try {
    const removed = await db.delete(stops).returning({ id: stops.id });
    return done({ ok: true, deleted: removed.length });
  } catch (err) {
    console.error("deleteAllStops:", err);
    return done({ ok: false, message: "삭제하지 못했어요. 다시 시도해 주세요." });
  }
}

async function announceRecipients() {
  const rows = await db
    .selectDistinct({ email: users.email })
    .from(users)
    .innerJoin(accounts, and(eq(accounts.userId, users.id), eq(accounts.providerId, "credential")))
    .leftJoin(emailPrefs, eq(emailPrefs.userId, users.id))
    .where(
      and(
        isNotNull(users.homeAddress),
        eq(users.emailVerified, true),
        or(isNull(users.demo), eq(users.demo, false)),
        or(isNull(emailPrefs.bookingOpen), eq(emailPrefs.bookingOpen, true)),
      ),
    );
  return rows.map((row) => row.email);
}

function describeNights(nights: string[]) {
  if (nights.length === 1) return formatNight(nights[0]);
  return `${formatNight(nights[0])}부터 ${formatNight(nights.at(-1)!)}까지 ${nights.length}일`;
}

export async function announceNights(): Promise<OperatorResult & { sent?: number }> {
  "use server";
  const done = (result: OperatorResult & { sent?: number }) => respond(result, { revalidate: [getOperatorNights.key] });
  try {
    await requireStaff();
  } catch {
    return done({ ok: false, message: "운영자 코드를 다시 입력해 주세요." });
  }

  try {
    const rows = await db
      .select({ night: operatingNights.night })
      .from(operatingNights)
      .where(and(gt(operatingNights.night, kstToday()), isNull(operatingNights.announcedAt)))
      .orderBy(asc(operatingNights.night));
    const nights = rows.map((row) => row.night);
    if (nights.length === 0) return done({ ok: false, message: "새로 알릴 운행일이 없어요." });
    const recipients = await announceRecipients();
    if (recipients.length === 0) return done({ ok: false, message: "알림을 받을 학생이 아직 없어요." });

    const { sendBookingOpenEmail } = await import("../server/mail");
    const { default: env } = await import("./server-env");
    await sendBookingOpenEmail(recipients, describeNights(nights), `${env.BASE_URL}/booking/new`);
    await db.update(operatingNights).set({ announcedAt: new Date() }).where(inArray(operatingNights.night, nights));
    return done({ ok: true, sent: recipients.length });
  } catch (err) {
    console.error("announceNights:", err);
    return done({ ok: false, message: "메일을 보내지 못했어요. 메일 설정을 확인하고 다시 시도해 주세요." });
  }
}

export interface PlanStopView {
  name: string;
  kind: "board" | "alight";
  at: number;
  riders: number;
}

export interface PlanBusView {
  key: string;
  slot: string;
  name: string;
  departs: number;
  plannedDeparts: number;
  riders: number;
  boarded: number;
  capacity: number;
  duration: number;
  longestWalk: number;
  stops: PlanStopView[];
}

export interface OperatorPlan {
  night: string;
  tonight: string;
  nights: string[];
  status: "fixed" | "preview" | "none";
  canRebuild: boolean;
  candidates: number;
  booked: number;
  unplaced: number;
  averageWalk: number;
  boarded: number;
  dayOf: number;
  expected: number;
  buses: PlanBusView[];
}

const MINUTE = 60_000;

async function planNights() {
  const [upcoming, past] = await Promise.all([
    db
      .select({ night: operatingNights.night })
      .from(operatingNights)
      .where(gte(operatingNights.night, tonight()))
      .orderBy(asc(operatingNights.night)),
    db
      .select({ night: plans.night })
      .from(plans)
      .where(lt(plans.night, tonight()))
      .orderBy(desc(plans.night))
      .limit(PAST_NIGHTS_SHOWN),
  ]);
  return { upcoming: upcoming.map((row) => row.night), past: past.map((row) => row.night).reverse() };
}

const PAST_NIGHTS_SHOWN = 14;

export const getOperatorPlan = query(async (requested: string): Promise<OperatorPlan> => {
  "use server";
  await requireStaff();
  const { upcoming, past } = await planNights();
  const nights = [...past, ...upcoming];
  const night = NIGHT_PATTERN.test(requested) ? requested : (upcoming[0] ?? past.at(-1) ?? tonight());
  const candidates = (await db.select({ total: count() }).from(stops))[0]?.total ?? 0;
  const empty = {
    night,
    tonight: tonight(),
    nights,
    candidates,
    booked: 0,
    unplaced: 0,
    averageWalk: 0,
    boarded: 0,
    dayOf: 0,
    expected: 0,
    buses: [],
    canRebuild: false,
  };
  if (!(await hasPlan(night)) && !(await isOperatingNight(night))) return { ...empty, status: "none" };

  await ensurePlan(night);
  if (await hasPlan(night)) {
    const state = await loadNight(night);
    const homes = new Map(
      (await db.select().from(bookings).where(eq(bookings.night, night))).map((b) => [
        b.id,
        { lat: b.lat, lng: b.lng },
      ]),
    );
    const loads = loadsOf(state);
    const walks: number[] = [];
    const buses = state.buses.map((bus) => {
      const seats = state.seats.filter((s) => s.busId === bus.id);
      const busWalks = seats.flatMap((seat) => {
        const home = homes.get(seat.bookingId);
        const stop = bus.stops.find((s) => s.seq === seat.alightSeq);
        return home && stop ? [walkMinutes(distance(home, stop), PLAN_SETTINGS)] : [];
      });
      walks.push(...busWalks);
      return {
        key: bus.id,
        slot: bus.slot,
        name: bus.name,
        departs: bus.departs,
        plannedDeparts: bus.plannedDeparts,
        riders: loads.get(bus.id) ?? 0,
        boarded: state.boardings.filter((b) => b.busId === bus.id).length,
        capacity: bus.capacity,
        duration: bus.stops.at(-1)?.offset ?? 0,
        longestWalk: Math.max(0, ...busWalks),
        stops: bus.stops.map((stop) => ({
          name: stop.name,
          kind: stop.kind,
          at: bus.departs + stop.offset * MINUTE,
          riders: seats.filter((s) => (stop.kind === "board" ? s.boardSeq : s.alightSeq) === stop.seq).length,
        })),
      };
    });
    return {
      ...empty,
      status: "fixed",
      canRebuild: night >= tonight() && !(await hasActivity(night)),
      booked: homes.size,
      unplaced: homes.size - state.seats.length,
      averageWalk: walks.length ? walks.reduce((a, b) => a + b, 0) / walks.length : 0,
      boarded: state.boardings.length,
      dayOf: state.choices.length,
      expected: await expectedRiders([...new Set(state.seats.map((seat) => seat.userId))]),
      buses,
    };
  }

  const preview = await previewPlan(night);
  const walks = preview.result.buses.flatMap((bus) =>
    bus.route.seats.map((seat) => walkMinutes(seat.walkMeters, PLAN_SETTINGS)),
  );
  return {
    ...empty,
    status: "preview",
    booked: preview.bookings.length,
    expected: await expectedRiders(preview.bookings.map((booking) => booking.userId)),
    unplaced: preview.result.unplaced.length,
    averageWalk: walks.length ? walks.reduce((a, b) => a + b, 0) / walks.length : 0,
    buses: preview.result.buses.map((bus, i) => {
      const departs = nightClock(night, bus.slot);
      return {
        key: `preview-${i}`,
        slot: bus.slot,
        name: bus.name,
        departs,
        plannedDeparts: departs,
        riders: bus.route.seats.length,
        boarded: 0,
        capacity: PLAN_SETTINGS.capacity,
        duration: bus.route.duration,
        longestWalk: Math.max(0, ...bus.route.seats.map((s) => walkMinutes(s.walkMeters, PLAN_SETTINGS))),
        stops: bus.route.stops.map((stop, seq) => ({
          name: stop.place.name,
          kind: stop.kind,
          at: departs + stop.offset * MINUTE,
          riders: bus.route.seats.filter((s) => (stop.kind === "board" ? s.board : s.alight) === seq).length,
        })),
      };
    }),
  };
}, "operator-plan");

export async function rebuildNightPlan(night: string): Promise<OperatorResult> {
  "use server";
  const done = (result: OperatorResult) => respond(result, { revalidate: [getOperatorPlan.key] });
  try {
    await requireStaff();
  } catch {
    return done({ ok: false, message: "운영자 코드를 다시 입력해 주세요." });
  }
  if (!NIGHT_PATTERN.test(night) || night < tonight() || !(await hasPlan(night))) {
    return done({ ok: false, message: "다시 만들 수 있는 노선이 없어요." });
  }
  if (await hasActivity(night)) {
    return done({ ok: false, message: "버스를 고르거나 탄 학생이 있어서 노선을 바꿀 수 없어요." });
  }
  try {
    await rebuildPlan(night);
    return done({ ok: true });
  } catch (err) {
    console.error("rebuildNightPlan:", err);
    return done({ ok: false, message: "노선을 다시 만들지 못했어요. 다시 시도해 주세요." });
  }
}

export interface OperatorService {
  settings: ServiceSettings;
  slots: string[];
  limits: typeof SERVICE_LIMITS;
  providers: {
    routeTimes: "estimate" | "kakao";
    walkTimes: "estimate" | "tmap";
    cachedRoutes: number;
    cachedWalks: number;
  };
}

export const getOperatorService = query(async (): Promise<OperatorService> => {
  "use server";
  await requireStaff();
  const { default: env } = await import("./server-env");
  const [cached] = await db
    .select({
      walks: sql<number>`sum(case when ${travelTimes.fromKey} like 'w:%' then 1 else 0 end)`,
      total: count(),
    })
    .from(travelTimes);
  const walks = Number(cached?.walks ?? 0);
  return {
    settings: await serviceSettings(),
    slots: ALL_SLOTS,
    limits: SERVICE_LIMITS,
    providers: {
      routeTimes: env.ROUTE_TIMES === "kakao" ? "kakao" : "estimate",
      walkTimes: env.WALK_TIMES === "tmap" && env.TMAP_APP_KEY ? "tmap" : "estimate",
      cachedRoutes: Number(cached?.total ?? 0) - walks,
      cachedWalks: walks,
    },
  };
}, "operator-service");

export async function saveOperatorService(input: ServiceSettings): Promise<OperatorResult> {
  "use server";
  const done = (result: OperatorResult) => respond(result, { revalidate: [getOperatorService.key] });
  try {
    await requireStaff();
  } catch {
    return done({ ok: false, message: "운영자 코드를 다시 입력해 주세요." });
  }
  const settings: ServiceSettings = {
    firstSlot: String(input.firstSlot),
    lastSlot: String(input.lastSlot),
    capacity: Number(input.capacity),
    maxWalkMeters: Number(input.maxWalkMeters),
    maxRideMinutes: Number(input.maxRideMinutes),
    minRiders: Number(input.minRiders),
    dayOfCutoffMinutes: Number(input.dayOfCutoffMinutes),
    noShowLimit: Number(input.noShowLimit),
    foldThinSlots: input.foldThinSlots !== false,
  };
  const invalid = validateService(settings);
  if (invalid) return done({ ok: false, message: invalid });

  try {
    const window = new Set(slotsBetween(settings.firstSlot, settings.lastSlot));
    const upcoming = await db.select({ slot: bookings.slot }).from(bookings).where(gte(bookings.night, kstToday()));
    const outside = upcoming.filter((row) => !window.has(row.slot)).length;
    if (outside > 0) {
      return done({
        ok: false,
        message: `이 시간 밖으로 신청한 학생이 ${outside}명 있어요. 그 신청이 끝날 때까지 시간을 줄일 수 없어요.`,
      });
    }
    await saveServiceSettings(settings);
    return done({ ok: true });
  } catch (err) {
    console.error("saveOperatorService:", err);
    return done({ ok: false, message: "저장하지 못했어요. 다시 시도해 주세요." });
  }
}

export interface StartArea {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export const getStartAreas = query(async () => {
  "use server";
  await requireStaff();
  const areas = await db.select().from(startAreas).orderBy(asc(startAreas.name));
  return {
    schools: SCHOOL_PLACES.map(({ id, name, lat, lng }) => ({ id, name, lat, lng })),
    areas: areas.map(({ id, name, address, lat, lng }) => ({ id, name, address, lat, lng })),
  };
}, "operator-start-areas");

export async function addStartArea(input: Omit<StartArea, "id">): Promise<OperatorResult> {
  "use server";
  const done = (result: OperatorResult) => respond(result, { revalidate: [getStartAreas.key] });
  try {
    await requireStaff();
  } catch {
    return done({ ok: false, message: "운영자 코드를 다시 입력해 주세요." });
  }
  const name = cleanName(String(input.name ?? ""));
  const address = String(input.address ?? "").trim();
  if (!name || name.length > STOP_NAME_MAX_LENGTH) {
    return done({ ok: false, message: `이름은 1–${STOP_NAME_MAX_LENGTH}자로 써 주세요.` });
  }
  const inArea =
    input.lat >= SERVICE_AREA.minLat &&
    input.lat <= SERVICE_AREA.maxLat &&
    input.lng >= SERVICE_AREA.minLng &&
    input.lng <= SERVICE_AREA.maxLng;
  if (!address || !inArea) return done({ ok: false, message: "서울 안의 장소를 검색해서 골라 주세요." });
  try {
    const [same] = await db.select({ id: startAreas.id }).from(startAreas).where(eq(startAreas.name, name)).limit(1);
    if (same || SCHOOL_PLACES.some((school) => school.name === name)) {
      return done({ ok: false, message: "같은 이름의 출발지가 이미 있어요." });
    }
    await db.insert(startAreas).values({ name, address, lat: input.lat, lng: input.lng });
    return done({ ok: true });
  } catch (err) {
    console.error("addStartArea:", err);
    return done({ ok: false, message: "추가하지 못했어요. 다시 시도해 주세요." });
  }
}

export async function deleteStartArea(id: string): Promise<OperatorResult> {
  "use server";
  const done = (result: OperatorResult) => respond(result, { revalidate: [getStartAreas.key] });
  try {
    await requireStaff();
    await db.delete(startAreas).where(eq(startAreas.id, id));
    return done({ ok: true });
  } catch (err) {
    console.error("deleteStartArea:", err);
    return done({ ok: false, message: "삭제하지 못했어요. 다시 시도해 주세요." });
  }
}

export const IMPORT_BATCH_MAX = 1000;

export interface ImportRow {
  name: string;
  code: string;
  lat: number;
  lng: number;
}

export type ImportResult = { ok: true; added: number; skipped: number } | { ok: false; message: string };

export async function importStops(input: { rows: ImportRow[]; radiusKm: number }): Promise<ImportResult> {
  "use server";
  const done = (result: ImportResult) => respond(result, { revalidate: [getStops.key] });
  try {
    await requireStaff();
  } catch {
    return done({ ok: false, message: "운영자 코드를 다시 입력해 주세요." });
  }
  if (!Array.isArray(input.rows) || input.rows.length > IMPORT_BATCH_MAX) {
    return done({ ok: false, message: `한 번에 ${IMPORT_BATCH_MAX}곳까지 보낼 수 있어요.` });
  }
  const radius = Math.min(20, Math.max(1, Number(input.radiusKm) || 8)) * 1000;
  const center = centroid(SCHOOL_PLACES);

  try {
    const existing = await db.select({ name: stops.name, lat: stops.lat, lng: stops.lng }).from(stops);
    const { stops: values, skipped } = prepareImport(input.rows, existing, {
      center,
      radiusMeters: radius,
      maxName: STOP_NAME_MAX_LENGTH,
    });
    for (let i = 0; i < values.length; i += 200) await db.insert(stops).values(values.slice(i, i + 200));
    return done({ ok: true, added: values.length, skipped });
  } catch (err) {
    console.error("importStops:", err);
    return done({ ok: false, message: "넣지 못했어요. 다시 시도해 주세요." });
  }
}
