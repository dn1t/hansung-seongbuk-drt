import { asc } from "drizzle-orm";

import { startAreas } from "../lib/app-schema";
import { db } from "../lib/db";
import { SCHOOLS } from "../lib/schools";
import { distance } from "./planner/geo";
import type { Place } from "./planner/route";
import { PLAN_SETTINGS } from "./planner/settings";

export interface StartPlace {
  id: string;
  name: string;
  kind: "school" | "area";
  lat: number;
  lng: number;
}

const SCHOOL_COORDS: Record<string, { lat: number; lng: number }> = {
  고려대학교: { lat: 37.5894, lng: 127.0323 },
  국민대학교: { lat: 37.6109, lng: 126.9969 },
  동덕여자대학교: { lat: 37.6067, lng: 127.0421 },
  서경대학교: { lat: 37.615, lng: 127.0127 },
  성신여자대학교: { lat: 37.5913, lng: 127.0221 },
  한국예술종합학교: { lat: 37.611, lng: 127.0573 },
  한성대학교: { lat: 37.5826, lng: 127.0102 },
  동방문화대학원대학교: { lat: 37.5936, lng: 127.0007 },
};

export const SCHOOL_PLACES: StartPlace[] = Object.values(SCHOOLS).map((name, i) => ({
  id: `school-${i + 1}`,
  name,
  kind: "school" as const,
  ...SCHOOL_COORDS[name],
}));

export async function startPlaces(): Promise<StartPlace[]> {
  const areas = await db.select().from(startAreas).orderBy(asc(startAreas.name));
  return [
    ...SCHOOL_PLACES,
    ...areas.map((area) => ({ id: area.id, name: area.name, kind: "area" as const, lat: area.lat, lng: area.lng })),
  ];
}

export function startOfSchool(school: string | undefined) {
  return SCHOOL_PLACES.find((place) => place.name === school);
}

export function boardingPlace(start: StartPlace, candidates: Place[]): Place {
  let best: Place | undefined;
  for (const stop of candidates) {
    if (distance(stop, start) > PLAN_SETTINGS.pickupWalkMeters) continue;
    if (!best || distance(stop, start) < distance(best, start)) best = stop;
  }
  return best ?? { id: `start:${start.id}`, name: `${start.name} 앞`, lat: start.lat, lng: start.lng };
}
