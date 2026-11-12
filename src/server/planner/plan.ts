import { nearestDistrict } from "./districts.ts";
import { assignVehicles, type Trip } from "./fleet.ts";
import { angleBetween, bearing, centroid, distance, meanBearing, type Point } from "./geo.ts";
import { buildRoute, type Coverage, coverageOf, type Place, type Route, type RouteRider } from "./route.ts";
import { driveMinutes, type PlanSettings } from "./settings.ts";

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
  split: number;
  merged: number;
  waiting: number;
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

const FULLER_TRIP_COSTS = [30, 80];

type Build = (riders: PlanRider[]) => Route | undefined;
type Cost = (route: Route | undefined) => number;

function tripCost(center: Point, settings: PlanSettings): Cost {
  return (route) =>
    route
      ? route.duration +
        driveMinutes(distance(route.stops.at(-1)!.place, center), settings) +
        settings.tripCostMinutes +
        settings.rideWeight * route.rideTotal
      : 0;
}

function tripOf(id: string, group: Group, settings: PlanSettings): Trip {
  return {
    id,
    departs: group.slot * settings.slotMinutes,
    duration: group.route.duration,
    first: group.route.stops[0].place,
    last: group.route.stops.at(-1)!.place,
  };
}

function splitBlocks(riders: PlanRider[], center: Point) {
  if (riders.length < 2) return [];
  const blocks: PlanRider[][] = [];
  const byHome = byHomeDirection(riders, center);
  const gaps = byHome
    .slice(1)
    .map((rider, i) => ({ at: i + 1, gap: angleBetween(bearing(center, rider.home), bearing(center, byHome[i].home)) }))
    .sort((a, b) => b.gap - a.gap || a.at - b.at)
    .slice(0, 3);
  for (const { at } of gaps) blocks.push(byHome.slice(0, at), byHome.slice(at));

  const boards = [...new Map(riders.map((r) => [r.board.id, r.board])).values()].sort(
    (a, b) => a.lng - b.lng || a.lat - b.lat || a.id.localeCompare(b.id),
  );
  for (let cut = 1; cut < boards.length; cut++) {
    const west = new Set(boards.slice(0, cut).map((b) => b.id));
    blocks.push(riders.filter((r) => west.has(r.board.id)));
  }
  return blocks;
}

function byHomeDirection(riders: PlanRider[], center: Point) {
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
  return [...sorted.slice(start), ...sorted.slice(0, start)].map((entry) => entry.rider);
}

function cut(ordered: PlanRider[], build: Build, settings: PlanSettings) {
  const groups: { riders: PlanRider[]; route: Route }[] = [];
  let current: PlanRider[] = [];
  let currentRoute: Route | undefined;
  for (const rider of ordered) {
    const trial = [...current, rider];
    const route = build(trial);
    if (current.length > 0 && !fits(route, trial.length, settings)) {
      groups.push({ riders: current, route: currentRoute! });
      current = [rider];
      currentRoute = build(current);
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
  asked: (rider: PlanRider) => number,
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
            group.riders.every((r) => Math.abs(other.slot - asked(r)) <= reach.slots) &&
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

function rebalanceSlot(inSlot: Group[], build: Build, settings: PlanSettings, cost: Cost, center: Point) {
  const active = () => inSlot.filter((g) => g.riders.length > 0);
  const slot = inSlot[0]?.slot ?? 0;
  let moved = 0;
  let split = 0;

  interface Move {
    gain: number;
    from: Group;
    to: Group | undefined;
    riders: PlanRider[];
    fromRoute: Route | undefined;
    toRoute: Route;
  }

  const tryMove = (from: Group, to: Group | undefined, block: PlanRider[]): Move | undefined => {
    const stay = from.riders.filter((r) => !block.includes(r));
    if (stay.length > 0 && stay.length < settings.minRiders) return undefined;
    if (!to && (stay.length === 0 || block.length < settings.minRiders)) return undefined;
    const joined = to ? [...to.riders, ...block] : block;
    if (joined.length > settings.capacity) return undefined;
    const toRoute = build(joined);
    if (!fits(toRoute, joined.length, settings)) return undefined;
    const fromRoute = stay.length > 0 ? build(stay) : undefined;
    if (stay.length > 0 && !fits(fromRoute, stay.length, settings)) return undefined;
    const gain = cost(from.route) + cost(to?.route) - cost(fromRoute) - cost(toRoute);
    return gain > 0.5 ? { gain, from, to, riders: block, fromRoute, toRoute } : undefined;
  };

  const bestBetween = (from: Group, to: Group | undefined) => {
    const blocks = new Map<string, PlanRider[]>();
    for (const r of from.riders) blocks.set(r.board.id, [...(blocks.get(r.board.id) ?? []), r]);
    const options = to
      ? [...blocks.values(), ...from.riders.map((r) => [r]), from.riders]
      : [...blocks.values(), ...splitBlocks(from.riders, center)];
    const seen = new Set<string>();
    let best: Move | undefined;
    for (const block of options) {
      const key = block
        .map((r) => r.id)
        .sort()
        .join(",");
      if (seen.has(key)) continue;
      seen.add(key);
      const move = tryMove(from, to, block);
      if (move && (!best || move.gain > best.gain)) best = move;
    }
    return best;
  };

  const known = new Map<Group, Map<Group | undefined, Move | undefined>>();
  for (let round = 0; round < 80; round++) {
    let best: Move | undefined;
    for (const from of active()) {
      let row = known.get(from);
      if (!row) known.set(from, (row = new Map()));
      for (const to of [...active(), undefined]) {
        if (to === from) continue;
        if (!row.has(to)) row.set(to, bestBetween(from, to));
        const move = row.get(to);
        if (move && (!best || move.gain > best.gain)) best = move;
      }
    }
    if (!best) break;
    const { from } = best;
    from.riders = from.riders.filter((r) => !best!.riders.includes(r));
    if (best.fromRoute) from.route = best.fromRoute;
    if (best.to) {
      best.to.riders = [...best.to.riders, ...best.riders];
      best.to.route = best.toRoute;
    } else {
      inSlot.push({ slot, riders: best.riders, route: best.toRoute, bearing: 0 });
      split++;
    }
    moved += best.riders.length;
    for (const changed of [from, best.to]) {
      if (!changed) continue;
      known.delete(changed);
      for (const row of known.values()) row.delete(changed);
    }
  }
  return { moved, split };
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
      steps: { groups: 0, moved: 0, split: 0, merged: 0, waiting: 0 },
    };
  }

  const center = centroid([...new Map(riders.map((r) => [r.board.id, r.board])).values()]);
  const coverage = coverageOf(riders, input.candidates, settings.maxWalkMeters);
  const homeBearing = (r: PlanRider) => bearing(center, r.home);
  const asked = (r: PlanRider) => slotIndex.get(r.slot)!;

  const routes = new Map<string, Route | undefined>();
  const build: Build = (list) => {
    const key = list
      .map((r) => r.id)
      .sort()
      .join(",");
    if (!routes.has(key)) routes.set(key, buildRoute(list, coverage, settings));
    return routes.get(key);
  };

  const levels = [...new Set([settings.tripCostMinutes, ...FULLER_TRIP_COSTS])].sort((a, b) => a - b);
  const costAt = levels.map((tripCostMinutes) => tripCost(center, { ...settings, tripCostMinutes }));
  const baseCost = costAt[0];
  const planSlot = (slot: number, list: PlanRider[], level = 0) => {
    const made: Group[] = cut(byHomeDirection(list, center), build, settings).map((g) => ({ slot, ...g, bearing: 0 }));
    const started = made.length;
    const { moved, split } = rebalanceSlot(made, build, settings, costAt[level], center);
    const kept = made.filter((g) => g.riders.length > 0);
    return {
      groups: kept,
      started,
      moved,
      split,
      emptied: started + split - kept.length,
      cost: kept.reduce((sum, g) => sum + baseCost(g.route), 0),
    };
  };

  const bySlot = input.slots.map((slot) => riders.filter((r) => r.slot === slot));
  const alone = bySlot.map((list, i) => (list.length > 0 ? planSlot(i, list) : undefined));
  const folded = bySlot.map((list, i) => {
    const later = bySlot[i + 1];
    if (!settings.foldThinSlots || list.length === 0 || list.length > settings.capacity) return undefined;
    if (!later || later.length === 0) return undefined;
    const together = planSlot(i + 1, [...list, ...later]);
    const gain = alone[i]!.cost + alone[i + 1]!.cost - together.cost - settings.lateShiftMinutes * list.length;
    return gain > 0 ? { ...together, gain } : undefined;
  });
  const bestFrom: number[] = Array.from({ length: input.slots.length + 2 }, () => 0);
  for (let i = input.slots.length - 1; i >= 0; i--) {
    bestFrom[i] = Math.max(bestFrom[i + 1], folded[i] ? folded[i]!.gain + bestFrom[i + 2] : 0);
  }

  type SlotPlan = ReturnType<typeof planSlot>;
  const units: { slot: number; list: PlanRider[]; plans: (SlotPlan | undefined)[]; level: number }[] = [];
  let waiting = 0;
  for (let i = 0; i < input.slots.length; i++) {
    const fold = folded[i];
    if (fold && fold.gain + bestFrom[i + 2] > bestFrom[i + 1]) {
      waiting += bySlot[i].length;
      units.push({ slot: i + 1, list: [...bySlot[i], ...bySlot[i + 1]], plans: [fold], level: 0 });
      i++;
    } else if (alone[i]) {
      units.push({ slot: i, list: bySlot[i], plans: [alone[i]], level: 0 });
    }
  }

  const planOf = (unit: (typeof units)[number], level: number) =>
    (unit.plans[level] ??= planSlot(unit.slot, unit.list, level));
  const total = (pick: (unit: (typeof units)[number]) => number) => {
    const chosen = units.map((unit) => planOf(unit, pick(unit)));
    const trips = chosen.flatMap((plan, u) => plan.groups.map((g, k) => tripOf(`${u}-${k}`, g, settings)));
    return (
      chosen.reduce((sum, plan) => sum + plan.cost, 0) +
      settings.fleetCostMinutes * assignVehicles(trips, settings).size
    );
  };
  if (settings.fleetCostMinutes > 0) {
    type Unit = (typeof units)[number];
    const raisable = (unit: Unit) => unit.level < levels.length - 1;
    for (let round = 0, now = total((unit) => unit.level); round < units.length * levels.length; round++) {
      const steps: Unit[][] = [
        ...units.map((unit) => [unit]),
        ...units.slice(1).map((unit, i) => [units[i], unit]),
        ...units.slice(2).map((unit, i) => [units[i], units[i + 1], unit]),
      ].filter((step) => step.every(raisable));
      let best: { step: Unit[]; value: number } | undefined;
      for (const step of steps) {
        const value = total((unit) => unit.level + (step.includes(unit) ? 1 : 0));
        if (value < now - 0.5 && (!best || value < best.value)) best = { step, value };
      }
      if (!best) break;
      for (const unit of best.step) unit.level += 1;
      now = best.value;
    }
  }

  const groups: Group[] = [];
  let sweptGroups = 0;
  let moved = 0;
  let split = 0;
  let emptied = 0;
  for (const unit of units) {
    const chosen = planOf(unit, unit.level);
    groups.push(...chosen.groups);
    sweptGroups += chosen.started;
    moved += chosen.moved;
    split += chosen.split;
    emptied += chosen.emptied;
  }

  for (const g of groups) g.bearing = meanBearing(g.riders.map(homeBearing));
  const merged =
    emptied +
    mergeSmallGroups(groups, coverage, settings, { slots: 1, degrees: settings.mergeBearingDegrees }, asked) +
    mergeSmallGroups(groups, coverage, settings, { slots: 2, degrees: settings.mergeBearingDegrees * 2 }, asked);
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

  return { buses, unplaced, center, steps: { groups: sweptGroups, moved, split, merged, waiting } };
}
