import { query } from "@solidjs/router";
import { and, asc, eq, gte } from "drizzle-orm";

import { nightClock, serviceNow, slotCutoff, tonight } from "../server/clock";
import { distance } from "../server/planner/geo";
import { DAY_OF_SETTINGS, PLAN_SETTINGS, walkMinutes } from "../server/planner/settings";
import { ensurePlan, loadNight, loadsOf, previewPlan } from "../server/plans";
import { bookings, operatingNights } from "./app-schema";
import { db } from "./db";
import { requireUserId } from "./profile";
import { users } from "./schema";

const MINUTE = 60_000;
const NIGHT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const NIGHTS_SHOWN = 14;

export interface NightRouteStop {
  name: string;
  kind: "board" | "alight";
  at: number;
}

export interface NightRoute {
  key: string;
  slot: string;
  name: string;
  departs: number;
  fixed: boolean;
  riders: number;
  capacity: number;
  nearHome: boolean;
  mine: boolean;
  stops: NightRouteStop[];
}

export interface MyRoute extends NightRoute {
  board: number;
  alight: number;
  walkHome: number;
}

export interface BookingRoute {
  night: string;
  slot: string;
  fixesAt: number;
  closed: boolean;
  route?: MyRoute;
}

type Point = { lat: number; lng: number };

export interface NightRoutes {
  night: string;
  nights: { night: string; booked: boolean }[];
  booking?: { slot: string };
  routes: NightRoute[];
}

export const getNightRoutes = query(async (requested: string): Promise<NightRoutes | null> => {
  "use server";
  const userId = await requireUserId();
  const [nightRows, mine, [user]] = await Promise.all([
    db
      .select({ night: operatingNights.night })
      .from(operatingNights)
      .where(gte(operatingNights.night, tonight()))
      .orderBy(asc(operatingNights.night))
      .limit(NIGHTS_SHOWN),
    db
      .select({ id: bookings.id, night: bookings.night, slot: bookings.slot, lat: bookings.lat, lng: bookings.lng })
      .from(bookings)
      .where(and(eq(bookings.userId, userId), gte(bookings.night, tonight()))),
    db.select({ lat: users.homeLat, lng: users.homeLng }).from(users).where(eq(users.id, userId)).limit(1),
  ]);
  const booked = new Map(mine.map((row) => [row.night, row]));
  const nights = nightRows.map((row) => ({ night: row.night, booked: booked.has(row.night) }));
  if (nights.length === 0) return null;
  const night =
    NIGHT_PATTERN.test(requested) && nights.some((n) => n.night === requested)
      ? requested
      : (nights.find((n) => n.booked) ?? nights[0]).night;

  const booking = booked.get(night);
  const home = booking ?? (user?.lat != null && user.lng != null ? { lat: user.lat, lng: user.lng } : undefined);
  const { routes } = await routesOf(night, booking, home);

  return {
    night,
    nights,
    booking: booking && { slot: booking.slot },
    routes,
  };
}, "night-routes");

async function routesOf(night: string, booking: { id: string } | undefined, home: Point | undefined) {
  const nearHome = (stops: { kind: "board" | "alight"; lat: number; lng: number }[]) =>
    home !== undefined &&
    stops.some((stop) => stop.kind === "alight" && distance(stop, home) <= DAY_OF_SETTINGS.maxHomeWalkMeters);
  const walkHome = (stop: Point) => (home ? walkMinutes(distance(stop, home), PLAN_SETTINGS) : 0);
  let mine: MyRoute | undefined;

  if (night === tonight()) await ensurePlan(night);
  const [state, preview] = await Promise.all([loadNight(night), previewPlan(night)]);
  const loads = loadsOf(state);
  const seat = state.seats.find((entry) => entry.bookingId === booking?.id);

  const fixed: NightRoute[] = state.buses.map((bus) => {
    const route: NightRoute = {
      key: bus.id,
      slot: bus.slot,
      name: bus.name,
      departs: bus.departs,
      fixed: true,
      riders: loads.get(bus.id) ?? 0,
      capacity: bus.capacity,
      nearHome: nearHome(bus.stops),
      mine: bus.id === seat?.busId,
      stops: bus.stops.map((stop) => ({ name: stop.name, kind: stop.kind, at: bus.departs + stop.offset * MINUTE })),
    };
    if (seat && route.mine) {
      const board = bus.stops.findIndex((stop) => stop.seq === seat.boardSeq);
      const alight = bus.stops.findIndex((stop) => stop.seq === seat.alightSeq);
      if (board >= 0 && alight >= 0) mine = { ...route, board, alight, walkHome: walkHome(bus.stops[alight]) };
    }
    return route;
  });
  const planned: NightRoute[] = preview.result.buses.map((bus, i) => {
    const departs = nightClock(night, bus.slot);
    const own = bus.route.seats.find((entry) => entry.riderId === booking?.id);
    const route: NightRoute = {
      key: `preview-${i}`,
      slot: bus.slot,
      name: bus.name,
      departs,
      fixed: false,
      riders: bus.route.seats.length,
      capacity: preview.settings.capacity,
      nearHome: nearHome(bus.route.stops.map((stop) => ({ kind: stop.kind, ...stop.place }))),
      mine: own !== undefined,
      stops: bus.route.stops.map((stop) => ({
        name: stop.place.name,
        kind: stop.kind,
        at: departs + stop.offset * MINUTE,
      })),
    };
    if (own) {
      mine = { ...route, board: own.board, alight: own.alight, walkHome: walkHome(bus.route.stops[own.alight].place) };
    }
    return route;
  });

  const routes = [...fixed, ...planned].sort((a, b) => a.departs - b.departs || a.name.localeCompare(b.name, "ko"));
  return { routes, mine };
}

export const getBookingRoute = query(async (id: string): Promise<BookingRoute | null> => {
  "use server";
  const userId = await requireUserId();
  const [booking] = await db
    .select({ id: bookings.id, night: bookings.night, slot: bookings.slot, lat: bookings.lat, lng: bookings.lng })
    .from(bookings)
    .where(and(eq(bookings.id, id), eq(bookings.userId, userId)))
    .limit(1);
  if (!booking || booking.night < tonight()) return null;
  const { mine } = await routesOf(booking.night, booking, booking);
  const fixesAt = slotCutoff(booking.night, mine && !mine.fixed ? mine.slot : booking.slot);
  return { night: booking.night, slot: booking.slot, fixesAt, closed: fixesAt <= serviceNow(), route: mine };
}, "booking-route");
