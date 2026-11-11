import { nearestDistrict } from "./districts.ts";
import { angleBetween, bearing, centroid, meanBearing, type Point } from "./geo.ts";
import { buildRoute, type Coverage, coverageOf, type Place, type Route, type RouteRider } from "./route.ts";
import type { PlanSettings } from "./settings.ts";

export interface PlanRider extends RouteRider {
  slot: string;
}

export interface PlanInput {
  slots: string[];
  riders: PlanRider[];
  candidates: Place[];
  settings: PlanSettings;
}

export interface PlannedBus {
  slot: string;
  name: string;
  bearing: number;
  route: Route;
}

export interface PlanSteps {
  groups: number;
  moved: number;
  merged: number;
}

export interface PlanResult {
  buses: PlannedBus[];
  unplaced: string[];
  center: Point | null;
  steps: PlanSteps;
}

interface Group {
  slot: number;
  riders: PlanRider[];
  route: Route;
  bearing: number;
}

function fits(route: Route | undefined, size: number, settings: PlanSettings): route is Route {
  return route !== undefined && size <= settings.capacity && route.longestRide <= settings.maxRideMinutes;
}

function sweep(riders: PlanRider[], center: Point, coverage: Coverage, settings: PlanSettings) {
  const sorted = riders
    .map((rider) => ({ rider, angle: bearing(center, rider.home) }))
    .sort((a, b) => a.angle - b.angle || a.rider.id.localeCompare(b.rider.id));

  let start = 0;
  let widest = -1;
  sorted.forEach((entry, i) => {
    const prev = sorted[(i - 1 + sorted.length) % sorted.length];
    const gap = (entry.angle - prev.angle + 360) % 360 || (sorted.length === 1 ? 360 : 0);
    if (gap > widest) {
      widest = gap;
      start = i;
    }
  });
  const ordered = [...sorted.slice(start), ...sorted.slice(0, start)].map((entry) => entry.rider);

  const groups: { riders: PlanRider[]; route: Route }[] = [];
  let current: PlanRider[] = [];
  let currentRoute: Route | undefined;
  for (const rider of ordered) {
    const trial = [...current, rider];
    const route = buildRoute(trial, coverage, settings);
    if (current.length > 0 && !fits(route, trial.length, settings)) {
      groups.push({ riders: current, route: currentRoute! });
      current = [rider];
      currentRoute = buildRoute(current, coverage, settings);
    } else {
      current = trial;
      currentRoute = route;
    }
  }
  if (current.length > 0 && currentRoute) groups.push({ riders: current, route: currentRoute });
  return groups;
}

function mergeSmallGroups(
  groups: Group[],
  coverage: Coverage,
  settings: PlanSettings,
  reach: { slots: number; degrees: number },
) {
  let merged = 0;
  for (let changed = true; changed;) {
    changed = false;
    const small = groups
      .filter((g) => g.riders.length < settings.minRiders)
      .sort((a, b) => a.riders.length - b.riders.length);
    for (const group of small) {
      const targets = groups
        .filter(
          (other) =>
            other !== group &&
            Math.abs(other.slot - group.slot) <= reach.slots &&
            angleBetween(other.bearing, group.bearing) <= reach.degrees &&
            other.riders.length + group.riders.length <= settings.capacity,
        )
        .sort((a, b) => {
          const rank = (g: Group) => Math.abs(g.slot - group.slot) * 2 + (g.slot < group.slot ? 1 : 0);
          return rank(a) - rank(b) || angleBetween(a.bearing, group.bearing) - angleBetween(b.bearing, group.bearing);
        });
      for (const target of targets) {
        const riders = [...target.riders, ...group.riders];
        const route = buildRoute(riders, coverage, settings);
        if (!fits(route, riders.length, settings)) continue;
        target.riders = riders;
        target.route = route;
        groups.splice(groups.indexOf(group), 1);
        merged++;
        changed = true;
        break;
      }
      if (changed) break;
    }
  }
  return merged;
}

function relocateEdges(
  groups: Group[],
  coverage: Coverage,
  settings: PlanSettings,
  homeBearing: (r: PlanRider) => number,
) {
  let movedRiders = 0;
  const bySlot = new Map<number, Group[]>();
  for (const g of groups) bySlot.set(g.slot, [...(bySlot.get(g.slot) ?? []), g]);
  for (const inSlot of bySlot.values()) {
    if (inSlot.length < 2) continue;
    for (let round = 0, moved = true; moved && round < 5; round++) {
      moved = false;
      for (const from of inSlot) {
        if (from.riders.length <= 1) continue;
        for (const rider of from.riders) {
          const angle = homeBearing(rider);
          const target = inSlot
            .filter((g) => g !== from && g.riders.length < settings.capacity)
            .sort((a, b) => angleBetween(a.bearing, angle) - angleBetween(b.bearing, angle))[0];
          if (!target || angleBetween(target.bearing, angle) >= angleBetween(from.bearing, angle)) continue;
          const fromRiders = from.riders.filter((r) => r !== rider);
          const toRiders = [...target.riders, rider];
          const fromRoute = buildRoute(fromRiders, coverage, settings);
          const toRoute = buildRoute(toRiders, coverage, settings);
          if (!fits(fromRoute, fromRiders.length, settings) || !fits(toRoute, toRiders.length, settings)) continue;
          if (fromRoute.duration + toRoute.duration >= from.route.duration + target.route.duration) continue;
          from.riders = fromRiders;
          from.route = fromRoute;
          target.riders = toRiders;
          target.route = toRoute;
          from.bearing = meanBearing(from.riders.map(homeBearing));
          target.bearing = meanBearing(target.riders.map(homeBearing));
          moved = true;
          movedRiders++;
        }
      }
    }
  }
  return movedRiders;
}

export function districtOf(address: string | undefined) {
  const match = address?.match(/(?:^|\s)([가-힣]{1,4}?)구(?=\s|$)/);
  return match?.[1];
}

function nameBuses(groups: Group[], slots: string[]) {
  const base = (group: Group) => {
    const last = group.route.stops.at(-1)!.place;
    return `${districtOf(last.address) ?? nearestDistrict(last)}행`;
  };
  const names = new Map<Group, string>();
  for (let slot = 0; slot < slots.length; slot++) {
    const inSlot = groups.filter((g) => g.slot === slot).sort((a, b) => a.bearing - b.bearing);
    const counts = new Map<string, number>();
    for (const g of inSlot) counts.set(base(g), (counts.get(base(g)) ?? 0) + 1);
    const seen = new Map<string, number>();
    for (const g of inSlot) {
      const name = base(g);
      const n = (seen.get(name) ?? 0) + 1;
      seen.set(name, n);
      names.set(g, counts.get(name)! > 1 ? `${name} ${n}` : name);
    }
  }
  return names;
}

export function planNight(input: PlanInput): PlanResult {
  const { settings } = input;
  const slotIndex = new Map(input.slots.map((slot, i) => [slot, i]));
  const riders = input.riders.filter((r) => slotIndex.has(r.slot));
  const unplaced = input.riders.filter((r) => !slotIndex.has(r.slot)).map((r) => r.id);
  if (riders.length === 0 || input.candidates.length === 0) {
    return {
      buses: [],
      unplaced: [...unplaced, ...riders.map((r) => r.id)],
      center: null,
      steps: { groups: 0, moved: 0, merged: 0 },
    };
  }

  const center = centroid([...new Map(riders.map((r) => [r.board.id, r.board])).values()]);
  const coverage = coverageOf(riders, input.candidates, settings.maxWalkMeters);
  const homeBearing = (r: PlanRider) => bearing(center, r.home);

  const groups: Group[] = [];
  input.slots.forEach((slot, i) => {
    const inSlot = riders.filter((r) => r.slot === slot);
    if (inSlot.length === 0) return;
    for (const g of sweep(inSlot, center, coverage, settings)) {
      groups.push({ slot: i, riders: g.riders, route: g.route, bearing: meanBearing(g.riders.map(homeBearing)) });
    }
  });

  const sweptGroups = groups.length;
  const moved = relocateEdges(groups, coverage, settings, homeBearing);
  const merged =
    mergeSmallGroups(groups, coverage, settings, { slots: 1, degrees: settings.mergeBearingDegrees }) +
    mergeSmallGroups(groups, coverage, settings, { slots: 2, degrees: settings.mergeBearingDegrees * 2 });
  for (const g of groups) g.bearing = meanBearing(g.riders.map(homeBearing));

  const names = nameBuses(groups, input.slots);
  const buses = groups
    .sort((a, b) => a.slot - b.slot || a.bearing - b.bearing)
    .map((g) => ({
      slot: input.slots[g.slot],
      name: names.get(g)!,
      bearing: g.bearing,
      route: g.route,
    }));

  return { buses, unplaced, center, steps: { groups: sweptGroups, moved, merged } };
}
