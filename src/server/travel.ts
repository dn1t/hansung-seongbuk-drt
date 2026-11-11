import { and, eq, or } from "drizzle-orm";

import { travelTimes } from "../lib/app-schema";
import { db } from "../lib/db";
import env from "../lib/server-env";
import { DIRECTIONS_MAX_POINTS, kakaoDriveSections } from "./kakao";
import type { PlannedBus } from "./planner/plan";
import type { PlanSettings } from "./planner/settings";

const keyOf = (p: { lat: number; lng: number }) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;

async function cachedLegs(pairs: [string, string][]) {
  const found = new Map<string, number>();
  for (let i = 0; i < pairs.length; i += 50) {
    const chunk = pairs.slice(i, i + 50);
    const rows = await db
      .select()
      .from(travelTimes)
      .where(or(...chunk.map(([from, to]) => and(eq(travelTimes.fromKey, from), eq(travelTimes.toKey, to)))));
    for (const row of rows) found.set(`${row.fromKey}>${row.toKey}`, row.seconds);
  }
  return found;
}

async function fetchLegs(points: { lat: number; lng: number }[]) {
  const legs: number[] = [];
  for (let start = 0; start < points.length - 1; start += DIRECTIONS_MAX_POINTS - 1) {
    const slice = points.slice(start, start + DIRECTIONS_MAX_POINTS);
    const sections = await kakaoDriveSections(slice);
    await db
      .insert(travelTimes)
      .values(
        sections.map((section, i) => ({
          fromKey: keyOf(slice[i]),
          toKey: keyOf(slice[i + 1]),
          seconds: section.seconds,
          meters: section.meters,
        })),
      )
      .onConflictDoNothing();
    legs.push(...sections.map((section) => section.seconds));
  }
  return legs;
}

export async function applyRoadTimes(buses: PlannedBus[], settings: PlanSettings) {
  if (env.ROUTE_TIMES !== "kakao") return 0;
  let updated = 0;
  for (const bus of buses) {
    const points = bus.route.stops.map((stop) => stop.place);
    const pairs = points.slice(1).map((p, i) => [keyOf(points[i]), keyOf(p)] as [string, string]);
    try {
      const cached = await cachedLegs(pairs);
      const legs = pairs.every(([from, to]) => cached.has(`${from}>${to}`))
        ? pairs.map(([from, to]) => cached.get(`${from}>${to}`)!)
        : await fetchLegs(points);
      let elapsed = 0;
      bus.route.stops.forEach((stop, k) => {
        if (k > 0) elapsed += legs[k - 1] / 60 + settings.dwellMinutes;
        stop.offset = Math.round(elapsed);
      });
      bus.route.duration = bus.route.stops.at(-1)!.offset;
      bus.route.longestRide = Math.max(
        ...bus.route.seats.map((seat) => bus.route.stops[seat.alight].offset - bus.route.stops[seat.board].offset),
      );
      updated++;
    } catch (err) {
      console.error("applyRoadTimes: 도로 시간을 받지 못해 거리로 어림해요.", err);
      break;
    }
  }
  return updated;
}
