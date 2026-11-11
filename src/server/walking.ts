import { inArray, or } from "drizzle-orm";

import { travelTimes } from "../lib/app-schema";
import { db } from "../lib/db";
import env from "../lib/server-env";
import { distance, type Point } from "./planner/geo";
import { PLAN_SETTINGS, walkMinutes } from "./planner/settings";

const MAX_LOOKUPS_PER_RUN = 300;

const pointKey = (p: Point) => `w:${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;

function pairKey(a: Point, b: Point) {
  const keys = [pointKey(a), pointKey(b)].sort();
  return { from: keys[0], to: keys[1], id: `${keys[0]}>${keys[1]}` };
}

export type Walk = (a: Point, b: Point) => number;

export const estimateWalk: Walk = (a, b) => walkMinutes(distance(a, b), PLAN_SETTINGS);

export async function walkTimesAround(points: Point[]): Promise<Walk> {
  if (env.WALK_TIMES !== "tmap" || points.length === 0) return estimateWalk;
  const keys = [...new Set(points.map(pointKey))];
  const rows = await db
    .select()
    .from(travelTimes)
    .where(or(inArray(travelTimes.fromKey, keys), inArray(travelTimes.toKey, keys)));
  const known = new Map(rows.map((row) => [`${row.fromKey}>${row.toKey}`, row.seconds]));
  return (a, b) => {
    const seconds = known.get(pairKey(a, b).id);
    return seconds === undefined ? estimateWalk(a, b) : Math.max(1, Math.ceil(seconds / 60));
  };
}

export async function warmWalkTimes(pairs: [Point, Point][]) {
  if (env.WALK_TIMES !== "tmap" || !env.TMAP_APP_KEY) return 0;
  const unique = new Map(pairs.map(([a, b]) => [pairKey(a, b).id, [a, b] as [Point, Point]]));
  const keys = [...new Set([...unique.values()].flat().map(pointKey))];
  const rows = keys.length ? await db.select().from(travelTimes).where(inArray(travelTimes.fromKey, keys)) : [];
  const known = new Set(rows.map((row) => `${row.fromKey}>${row.toKey}`));
  const { tmapWalk } = await import("./tmap");

  let fetched = 0;
  for (const [id, [a, b]] of unique) {
    if (known.has(id) || fetched >= MAX_LOOKUPS_PER_RUN) continue;
    try {
      const walk = await tmapWalk(a, b);
      const key = pairKey(a, b);
      await db
        .insert(travelTimes)
        .values({ fromKey: key.from, toKey: key.to, seconds: walk.seconds, meters: walk.meters })
        .onConflictDoNothing();
      fetched++;
    } catch (err) {
      console.error("warmWalkTimes: 걷는 시간을 받지 못해 거리로 어림해요.", err);
      break;
    }
  }
  return fetched;
}
