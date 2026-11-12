import { centroid, distance, type Point } from "./geo.ts";
import { driveMinutes, type PlanSettings } from "./settings.ts";

export interface Place extends Point {
  id: string;
  name: string;
  address?: string;
}

export interface RouteRider {
  id: string;
  home: Point;
  board: Place;
}

export interface RouteStop {
  place: Place;
  kind: "board" | "alight";
  offset: number;
}

export interface RouteSeat {
  riderId: string;
  board: number;
  alight: number;
  walkMeters: number;
}

export interface Route {
  stops: RouteStop[];
  seats: RouteSeat[];
  duration: number;
  longestRide: number;
  rideTotal: number;
}

export interface Coverage {
  candidates: Place[];
  near: Map<string, number[]>;
  nearMeters: Map<string, number[]>;
  walks: Map<string, Map<number, number>>;
  legs: Map<number, number>;
  tally: { count: Int32Array; walk: Float64Array };
}

type Home = { id: string; home: Point };

export function coverageOf(riders: Home[], candidates: Place[], maxWalkMeters: number) {
  const near = new Map<string, number[]>();
  const nearMeters = new Map<string, number[]>();
  const walks = new Map<string, Map<number, number>>();
  for (const rider of riders) {
    const list: number[] = [];
    const lengths: number[] = [];
    const meters = new Map<number, number>();
    candidates.forEach((stop, i) => {
      const d = distance(stop, rider.home);
      if (d > maxWalkMeters) return;
      list.push(i);
      lengths.push(d);
      meters.set(i, d);
    });
    near.set(rider.id, list);
    nearMeters.set(rider.id, lengths);
    walks.set(rider.id, meters);
  }
  return {
    candidates,
    near,
    nearMeters,
    walks,
    legs: new Map(),
    tally: { count: new Int32Array(candidates.length), walk: new Float64Array(candidates.length) },
  } satisfies Coverage;
}

function walkTo(coverage: Coverage, rider: Home, i: number) {
  return coverage.walks.get(rider.id)?.get(i) ?? distance(coverage.candidates[i], rider.home);
}

function inReach(coverage: Coverage, rider: Home, i: number) {
  return coverage.walks.get(rider.id)?.has(i) ?? false;
}

function legBetween(coverage: Coverage, i: number, j: number) {
  if (i === j) return 0;
  const key = i < j ? i * coverage.candidates.length + j : j * coverage.candidates.length + i;
  let d = coverage.legs.get(key);
  if (d === undefined) coverage.legs.set(key, (d = distance(coverage.candidates[i], coverage.candidates[j])));
  return d;
}

export function chooseDropOffs(riders: Home[], coverage: Coverage) {
  const { candidates } = coverage;
  const assignment = new Map<string, number>();
  if (candidates.length === 0) return assignment;

  const uncovered = new Set(riders.filter((r) => (coverage.near.get(r.id) ?? []).length > 0));
  const chosen = new Set<number>();

  const { count, walk } = coverage.tally;
  while (uncovered.size > 0) {
    const touched: number[] = [];
    for (const rider of uncovered) {
      const list = coverage.near.get(rider.id)!;
      const lengths = coverage.nearMeters.get(rider.id)!;
      for (let k = 0; k < list.length; k++) {
        const i = list[k];
        if (count[i] === 0) touched.push(i);
        count[i] += 1;
        walk[i] += lengths[k];
      }
    }
    let best = -1;
    let bestCount = 0;
    let bestWalk = Infinity;
    for (const i of touched) {
      if (count[i] > bestCount || (count[i] === bestCount && walk[i] < bestWalk)) {
        best = i;
        bestCount = count[i];
        bestWalk = walk[i];
      }
      count[i] = 0;
      walk[i] = 0;
    }
    chosen.add(best);
    for (const rider of uncovered) {
      if (inReach(coverage, rider, best)) uncovered.delete(rider);
    }
  }

  const nearestOf = (rider: Home, pool: Iterable<number>) => {
    let best = -1;
    let bestDistance = Infinity;
    for (const i of pool) {
      const d = walkTo(coverage, rider, i);
      if (d < bestDistance) {
        best = i;
        bestDistance = d;
      }
    }
    return best;
  };

  for (const rider of riders) {
    if ((coverage.near.get(rider.id) ?? []).length === 0) chosen.add(nearestOf(rider, candidates.keys()));
  }
  for (const rider of riders) assignment.set(rider.id, nearestOf(rider, chosen));
  return assignment;
}

function refineDropOffs(
  order: number[],
  assignment: Map<string, number>,
  riders: Home[],
  coverage: Coverage,
  from: Point,
  settings: PlanSettings,
) {
  const { candidates } = coverage;
  const walkCost = (meters: number) =>
    ((meters * settings.walkDetour) / settings.walkMetersPerMinute) * settings.walkWeight;
  const drive = (meters: number) => driveMinutes(meters, settings);
  const fromStart = new Map<number, number>();
  const leg = (a: number | undefined, b: number) => {
    if (a !== undefined) return legBetween(coverage, a, b);
    let d = fromStart.get(b);
    if (d === undefined) fromStart.set(b, (d = distance(from, candidates[b])));
    return d;
  };
  const at = new Map<number, Home[]>();
  for (const rider of riders) {
    const stop = assignment.get(rider.id)!;
    at.set(stop, [...(at.get(stop) ?? []), rider]);
  }

  for (let round = 0, changed = true; changed && round < order.length * 3 + 3; round++) {
    changed = false;
    for (let pos = 0; pos < order.length && !changed; pos++) {
      const stop = order[pos];
      const here = at.get(stop) ?? [];
      if (here.some((r) => (coverage.near.get(r.id) ?? []).length === 0)) continue;

      const prev = pos > 0 ? order[pos - 1] : undefined;
      const next = pos < order.length - 1 ? order[pos + 1] : undefined;
      const legs = (i: number) => leg(prev, i) + (next === undefined ? 0 : legBetween(coverage, i, next));
      const current = legs(stop);
      const walked = here.reduce((sum, r) => sum + walkTo(coverage, r, stop), 0);

      let best: { gain: number; apply: () => void } | undefined;
      const consider = (gain: number, apply: () => void) => {
        if (gain > 0.05 && (!best || gain > best.gain)) best = { gain, apply };
      };

      if (order.length > 1) {
        const moves = here.map((rider) => {
          let target = -1;
          for (const other of order) {
            if (other === stop || !inReach(coverage, rider, other)) continue;
            if (target === -1 || walkTo(coverage, rider, other) < walkTo(coverage, rider, target)) target = other;
          }
          return { rider, target };
        });
        if (moves.every((move) => move.target !== -1)) {
          const rewalked = moves.reduce((sum, m) => sum + walkTo(coverage, m.rider, m.target), 0);
          const saved = drive(current - (next === undefined ? 0 : leg(prev, next))) + settings.dwellMinutes;
          consider(saved - walkCost(rewalked - walked), () => {
            for (const move of moves) {
              assignment.set(move.rider.id, move.target);
              at.get(move.target)!.push(move.rider);
            }
            at.delete(stop);
            order.splice(pos, 1);
          });
        }
      }

      const [first, ...rest] = here;
      for (const i of first ? coverage.near.get(first.id)! : []) {
        if (i === stop || at.has(i) || rest.some((r) => !inReach(coverage, r, i))) continue;
        const rewalked = here.reduce((sum, r) => sum + walkTo(coverage, r, i), 0);
        consider(drive(current - legs(i)) - walkCost(rewalked - walked), () => {
          for (const r of here) assignment.set(r.id, i);
          at.set(i, here);
          at.delete(stop);
          order[pos] = i;
        });
      }

      if (best) {
        best.apply();
        changed = true;
      }
    }
  }
}

export function orderPath(nodes: Point[], from?: Point, to?: Point) {
  if (nodes.length <= 1) return nodes.map((_, i) => i);

  const remaining = new Set(nodes.keys());
  const order: number[] = [];
  let current: Point;
  if (from) {
    current = from;
  } else {
    const anchor = to ?? centroid(nodes);
    let first = 0;
    for (const i of remaining) if (distance(nodes[i], anchor) > distance(nodes[first], anchor)) first = i;
    order.push(first);
    remaining.delete(first);
    current = nodes[first];
  }
  while (remaining.size > 0) {
    let next = -1;
    for (const i of remaining) {
      if (next === -1 || distance(current, nodes[i]) < distance(current, nodes[next])) next = i;
    }
    order.push(next);
    remaining.delete(next);
    current = nodes[next];
  }

  const FROM = nodes.length;
  const TO = nodes.length + 1;
  const points = [...nodes, from ?? nodes[0], to ?? nodes[0]];
  const size = points.length;
  const known = new Float64Array(size * size).fill(-1);
  const between = (a: number, b: number) => {
    const key = a * size + b;
    if (known[key] < 0) known[key] = known[b * size + a] = distance(points[a], points[b]);
    return known[key];
  };
  const path: number[] = [...(from ? [FROM] : []), ...order, ...(to ? [TO] : [])];
  const lo = from ? 1 : 0;
  const hi = path.length - (to ? 2 : 1);
  const last = path.length - 1;

  for (let round = 0, improved = true; improved && round < 50; round++) {
    improved = false;
    for (let i = lo; i < hi; i++) {
      for (let j = i + 1; j <= hi; j++) {
        const before = (i > 0 ? between(path[i - 1], path[i]) : 0) + (j < last ? between(path[j], path[j + 1]) : 0);
        const after = (i > 0 ? between(path[i - 1], path[j]) : 0) + (j < last ? between(path[i], path[j + 1]) : 0);
        if (after < before - 0.01) {
          const segment = path.slice(i, j + 1).reverse();
          path.splice(i, segment.length, ...segment);
          improved = true;
        }
      }
    }
  }

  return path.slice(lo, hi + 1);
}

export function buildRoute(riders: RouteRider[], coverage: Coverage, settings: PlanSettings): Route | undefined {
  if (riders.length === 0 || coverage.candidates.length === 0) return undefined;

  const pickups = [...new Map(riders.map((r) => [r.board.id, r.board])).values()];
  const assignment = chooseDropOffs(riders, coverage);
  const firstDrops = [...new Set(assignment.values())];

  const pickupOrder = orderPath(pickups, undefined, centroid(firstDrops.map((i) => coverage.candidates[i])));
  const lastPickup = pickups[pickupOrder.at(-1)!];
  const visitOrder = (indexes: number[]) => {
    const order = orderPath(
      indexes.map((i) => coverage.candidates[i]),
      lastPickup,
    );
    return order.map((k) => indexes[k]);
  };

  const refined = visitOrder(firstDrops);
  refineDropOffs(refined, assignment, riders, coverage, lastPickup, settings);
  const dropIndexes = visitOrder(refined);
  const drops = dropIndexes.map((i) => coverage.candidates[i]);
  const dropOrder = dropIndexes.map((_, k) => k);

  const places: Omit<RouteStop, "offset">[] = [
    ...pickupOrder.map((i) => ({ place: pickups[i], kind: "board" as const })),
    ...dropOrder.map((i) => ({ place: drops[i], kind: "alight" as const })),
  ];

  let elapsed = 0;
  const stops: RouteStop[] = places.map((stop, k) => {
    if (k > 0) elapsed += driveMinutes(distance(places[k - 1].place, stop.place), settings) + settings.dwellMinutes;
    return { ...stop, offset: Math.round(elapsed) };
  });

  const boardIndex = new Map(stops.flatMap((s, k) => (s.kind === "board" ? [[s.place.id, k] as const] : [])));
  const alightIndex = new Map(
    stops.flatMap((s, k) => (s.kind === "alight" ? [[dropIndexes[dropOrder[k - pickups.length]], k] as const] : [])),
  );

  const seats = riders.map((rider) => {
    const alight = alightIndex.get(assignment.get(rider.id)!)!;
    return {
      riderId: rider.id,
      board: boardIndex.get(rider.board.id)!,
      alight,
      walkMeters: walkTo(coverage, rider, assignment.get(rider.id)!),
    };
  });

  const rides = seats.map((s) => stops[s.alight].offset - stops[s.board].offset);
  return {
    stops,
    seats,
    duration: stops.at(-1)!.offset,
    longestRide: Math.max(...rides),
    rideTotal: rides.reduce((sum, ride) => sum + ride, 0),
  };
}
