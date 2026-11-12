import { query } from "@solidjs/router";
import { respond } from "@solidjs/web";
import { GET } from "@solidjs/web/server-functions";
import { and, asc, count, desc, eq, gt, gte, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm";

import { ALL_SLOTS, kstToday, nightClock, slotsBetween, tonight } from "../server/clock";
import { searchKakaoKeyword } from "../server/kakao";
import { expectedRiders } from "../server/no-show";
import { SCHOOL_PLACES } from "../server/places";
import { assignVehicles } from "../server/planner/fleet";
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

export type { PlanPriority } from "../server/service";

export const STOP_NAME_MAX_LENGTH = 40;
const NIGHT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SERVICE_AREA = { minLat: 37.4, maxLat: 37.75, minLng: 126.75, maxLng: 127.25 };

export interface OperatorNight {
  night: string;
  bookings: number;
  demo: number;
  demoOpen: boolean;
}

export interface OperatorNights {
  today: string;
  nights: OperatorNight[];
  unannounced: string[];
  recipients: number;
  demoMax: number;
}

export async function addDemoBookings(input: {
  night: string;
  count: number;
}): Promise<OperatorResult & { added?: number; kept?: number }> {
  "use server";
  const done = (result: OperatorResult & { added?: number; kept?: number }) =>
    respond(result, { revalidate: [getOperatorNights.key, getOperatorPlan.key] });
  try {
    await requireStaff();
  } catch {
    return done({ ok: false, message: "운영자 코드를 다시 입력해 주세요." });
  }
  const [{ DEMO_MAX }, demo] = await Promise.all([import("../server/demo-data"), import("../server/demo")]);
  const size = Math.round(Number(input.count));
  if (!Number.isFinite(size) || size < 1 || size > DEMO_MAX) {
    return done({ ok: false, message: `데모 학생은 1–${DEMO_MAX}명으로 정해 주세요.` });
  }
  if (!NIGHT_PATTERN.test(input.night) || input.night < tonight() || !(await isOperatingNight(input.night))) {
    return done({ ok: false, message: "다가오는 운행일을 골라 주세요." });
  }
  if ((await demo.openDemoSlots(input.night)).length === 0) {
    return done({ ok: false, message: "이날은 모든 시간대의 신청이 마감됐어요." });
  }
  try {
    const { added, kept } = await demo.addDemoBookings(input.night, size);
    return done({ ok: true, added, kept });
  } catch (err) {
    console.error("addDemoBookings:", err);
    return done({ ok: false, message: "데모 신청을 넣지 못했어요. 다시 시도해 주세요." });
  }
}

export async function clearDemoBookings(night: string): Promise<OperatorResult & { removed?: number }> {
  "use server";
  const done = (result: OperatorResult & { removed?: number }) =>
    respond(result, { revalidate: [getOperatorNights.key, getOperatorPlan.key] });
  try {
    await requireStaff();
  } catch {
    return done({ ok: false, message: "운영자 코드를 다시 입력해 주세요." });
  }
  if (!NIGHT_PATTERN.test(night) || night < tonight()) {
    return done({ ok: false, message: "다가오는 운행일만 지울 수 있어요." });
  }
  try {
    const { clearDemoBookings: clear } = await import("../server/demo");
    return done({ ok: true, removed: await clear(night) });
  } catch (err) {
    console.error("clearDemoBookings:", err);
    return done({ ok: false, message: "데모 신청을 지우지 못했어요. 다시 시도해 주세요." });
  }
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
  const [nights, counts, recipients, { DEMO_MAX }, { openDemoSlots }] = await Promise.all([
    db.select().from(operatingNights).orderBy(asc(operatingNights.night)),
    db
      .select({
        night: bookings.night,
        total: count(),
        demo: sql<number>`sum(case when ${users.demo} then 1 else 0 end)`,
      })
      .from(bookings)
      .innerJoin(users, eq(users.id, bookings.userId))
      .where(gte(bookings.night, today))
      .groupBy(bookings.night),
    announceRecipients(),
    import("../server/demo-data"),
    import("../server/demo"),
  ]);
  const totals = new Map(counts.map((row) => [row.night, row]));
  const upcoming = nights.filter((row) => row.night >= tonight());
  const open = new Set(
    (
      await Promise.all(upcoming.map(async (row) => ((await openDemoSlots(row.night)).length > 0 ? row.night : "")))
    ).filter(Boolean),
  );
  return {
    today,
    demoMax: DEMO_MAX,
    nights: nights.map((row) => ({
      night: row.night,
      bookings: totals.get(row.night)?.total ?? 0,
      demo: Number(totals.get(row.night)?.demo ?? 0),
      demoOpen: open.has(row.night),
    })),
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
  fixed: boolean;
  departs: number;
  plannedDeparts: number;
  riders: number;
  boarded: number;
  capacity: number;
  duration: number;
  longestWalk: number;
  vehicle: number;
  stops: PlanStopView[];
}

export interface OperatorPlan {
  night: string;
  tonight: string;
  nights: string[];
  status: "fixed" | "partial" | "preview" | "none";
  canRebuild: boolean;
  candidates: number;
  booked: number;
  demo: number;
  unplaced: number;
  averageWalk: number;
  boarded: number;
  dayOf: number;
  expected: number;
  fleet: number;
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
    demo: 0,
    unplaced: 0,
    averageWalk: 0,
    boarded: 0,
    dayOf: 0,
    expected: 0,
    fleet: 0,
    buses: [],
    canRebuild: false,
  };
  if (!(await hasPlan(night)) && !(await isOperatingNight(night))) return { ...empty, status: "none" };

  await ensurePlan(night);
  const planned = await hasPlan(night);
  const [state, preview, homeRows] = await Promise.all([
    loadNight(night),
    previewPlan(night),
    db
      .select({ id: bookings.id, userId: bookings.userId, lat: bookings.lat, lng: bookings.lng, demo: users.demo })
      .from(bookings)
      .innerJoin(users, eq(users.id, bookings.userId))
      .where(eq(bookings.night, night)),
  ]);
  const homes = new Map(homeRows.map((b) => [b.id, { lat: b.lat, lng: b.lng }]));
  const loads = loadsOf(state);
  const walks: number[] = [];

  const fixed = state.buses.map((bus) => {
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
      fixed: true,
      departs: bus.departs,
      plannedDeparts: bus.plannedDeparts,
      riders: loads.get(bus.id) ?? 0,
      boarded: state.boardings.filter((b) => b.busId === bus.id).length,
      capacity: bus.capacity,
      duration: bus.stops.at(-1)?.offset ?? 0,
      longestWalk: Math.max(0, ...busWalks),
      vehicle: 0,
      first: bus.stops[0],
      last: bus.stops.at(-1),
      stops: bus.stops.map((stop) => ({
        name: stop.name,
        kind: stop.kind,
        at: bus.departs + stop.offset * MINUTE,
        riders: seats.filter((s) => (stop.kind === "board" ? s.boardSeq : s.alightSeq) === stop.seq).length,
      })),
    };
  });
  const open = preview.result.buses.map((bus, i) => {
    const departs = nightClock(night, bus.slot);
    const busWalks = bus.route.seats.map((seat) => walkMinutes(seat.walkMeters, PLAN_SETTINGS));
    walks.push(...busWalks);
    return {
      key: `preview-${i}`,
      slot: bus.slot,
      name: bus.name,
      fixed: false,
      departs,
      plannedDeparts: departs,
      riders: bus.route.seats.length,
      boarded: 0,
      capacity: preview.settings.capacity,
      duration: bus.route.duration,
      longestWalk: Math.max(0, ...busWalks),
      vehicle: 0,
      first: bus.route.stops[0]?.place,
      last: bus.route.stops.at(-1)?.place,
      stops: bus.route.stops.map((stop, seq) => ({
        name: stop.place.name,
        kind: stop.kind,
        at: departs + stop.offset * MINUTE,
        riders: bus.route.seats.filter((s) => (stop.kind === "board" ? s.board : s.alight) === seq).length,
      })),
    };
  });

  const all = [...fixed, ...open].sort((a, b) => a.departs - b.departs || a.name.localeCompare(b.name, "ko"));
  const vehicles = assignVehicles(
    all.flatMap((bus) =>
      bus.first && bus.last
        ? [
            {
              id: bus.key,
              departs: bus.plannedDeparts / MINUTE,
              duration: bus.duration,
              first: bus.first,
              last: bus.last,
            },
          ]
        : [],
    ),
    PLAN_SETTINGS,
  );
  const status = !planned ? "preview" : open.length > 0 ? "partial" : "fixed";

  return {
    ...empty,
    status,
    canRebuild: planned && night >= tonight() && !(await hasActivity(night)),
    booked: homes.size,
    demo: homeRows.filter((row) => row.demo).length,
    unplaced: preview.result.unplaced.length,
    averageWalk: walks.length ? walks.reduce((a, b) => a + b, 0) / walks.length : 0,
    boarded: state.boardings.length,
    dayOf: state.choices.length,
    expected: await expectedRiders([...new Set(homeRows.map((row) => row.userId))]),
    fleet: vehicles.size,
    buses: all.map(({ first: _first, last: _last, ...bus }) => ({
      ...bus,
      vehicle: vehicles.vehicleOf.get(bus.key) ?? 0,
    })),
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
    priority: input.priority,
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
