import { nearestDistrict } from "./planner/districts.ts";
import { distance, type Point } from "./planner/geo.ts";

export interface ImportCandidate {
  name: string;
  code: string;
  lat: number;
  lng: number;
}

export interface ImportedStop {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export const DUPLICATE_METERS = 150;

export function prepareImport(
  rows: ImportCandidate[],
  existing: { name: string; lat: number; lng: number }[],
  options: { center: Point; radiusMeters: number; maxName: number },
) {
  const byName = new Map<string, Point[]>();
  for (const stop of existing) byName.set(stop.name, [...(byName.get(stop.name) ?? []), stop]);
  const near = (name: string, point: Point) =>
    (byName.get(name) ?? []).some((stop) => distance(stop, point) <= DUPLICATE_METERS);

  const stops: ImportedStop[] = [];
  let skipped = 0;
  for (const row of rows) {
    const point = { lat: Number(row.lat), lng: Number(row.lng) };
    const code = String(row.code ?? "")
      .trim()
      .slice(0, 20);
    let name = String(row.name ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, options.maxName);
    const valid = name && Number.isFinite(point.lat) && Number.isFinite(point.lng);
    if (!valid || distance(options.center, point) > options.radiusMeters || near(name, point)) {
      skipped++;
      continue;
    }
    const district = nearestDistrict(point);
    if (byName.has(name)) name = `${name} (${code || `${district}구`})`.slice(0, options.maxName);
    if (near(name, point) || byName.has(name)) {
      skipped++;
      continue;
    }
    stops.push({ name, address: `서울 ${district}구${code ? ` · ${code}` : ""}`, ...point });
    byName.set(name, [point]);
  }
  return { stops, skipped };
}
