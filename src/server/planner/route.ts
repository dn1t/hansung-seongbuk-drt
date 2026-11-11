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
}

export interface Coverage {
  candidates: Place[];
  near: Map<string, number[]>;
}

export function coverageOf(riders: { id: string; home: Point }[], candidates: Place[], maxWalkMeters: number) {
  const near = new Map<string, number[]>();
  for (const rider of riders) {
    const list: number[] = [];
    candidates.forEach((stop, i) => {
      if (distance(stop, rider.home) <= maxWalkMeters) list.push(i);
    });
    near.set(rider.id, list);
  }
  return { candidates, near } satisfies Coverage;
}

export function chooseDropOffs(riders: { id: string; home: Point }[], coverage: Coverage) {
  const { candidates } = coverage;
  const assignment = new Map<string, number>();
  if (candidates.length === 0) return assignment;

  const uncovered = new Set(riders.filter((r) => (coverage.near.get(r.id) ?? []).length > 0).map((r) => r.id));
  const homeOf = new Map(riders.map((r) => [r.id, r.home]));
  const chosen = new Set<number>();

  while (uncovered.size > 0) {
    const gain = new Map<number, { count: number; walk: number }>();
    for (const riderId of uncovered) {
      for (const i of coverage.near.get(riderId)!) {
        const entry = gain.get(i) ?? { count: 0, walk: 0 };
        entry.count += 1;
        entry.walk += distance(candidates[i], homeOf.get(riderId)!);
        gain.set(i, entry);
      }
    }
    let best = -1;
    let bestGain = { count: 0, walk: Infinity };
    for (const [i, entry] of gain) {
      if (entry.count > bestGain.count || (entry.count === bestGain.count && entry.walk < bestGain.walk)) {
        best = i;
        bestGain = entry;
      }
    }
    chosen.add(best);
    for (const riderId of uncovered) {
      if (coverage.near.get(riderId)!.includes(best)) uncovered.delete(riderId);
    }
  }

  const nearestOf = (home: Point, pool: Iterable<number>) => {
    let best = -1;
    let bestDistance = Infinity;
    for (const i of pool) {
      const d = distance(candidates[i], home);
      if (d < bestDistance) {
        best = i;
        bestDistance = d;
      }
    }
    return best;
  };

  for (const rider of riders) {
    if ((coverage.near.get(rider.id) ?? []).length === 0) chosen.add(nearestOf(rider.home, candidates.keys()));
  }
  for (const rider of riders) assignment.set(rider.id, nearestOf(rider.home, chosen));
  return assignment;
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

  const path: (Point | number)[] = [...(from ? [from] : []), ...order, ...(to ? [to] : [])];
  const pointAt = (k: number) => {
    const entry = path[k];
    return typeof entry === "number" ? nodes[entry] : entry;
  };
  const lo = from ? 1 : 0;
  const hi = path.length - (to ? 2 : 1);
  const last = path.length - 1;

  for (let round = 0, improved = true; improved && round < 50; round++) {
    improved = false;
    for (let i = lo; i < hi; i++) {
      for (let j = i + 1; j <= hi; j++) {
        const before =
          (i > 0 ? distance(pointAt(i - 1), pointAt(i)) : 0) + (j < last ? distance(pointAt(j), pointAt(j + 1)) : 0);
        const after =
          (i > 0 ? distance(pointAt(i - 1), pointAt(j)) : 0) + (j < last ? distance(pointAt(i), pointAt(j + 1)) : 0);
        if (after < before - 0.01) {
          const segment = path.slice(i, j + 1).reverse();
          path.splice(i, segment.length, ...segment);
          improved = true;
        }
      }
    }
  }

  return path.slice(lo, hi + 1) as number[];
}

export function buildRoute(riders: RouteRider[], coverage: Coverage, settings: PlanSettings): Route | undefined {
  if (riders.length === 0 || coverage.candidates.length === 0) return undefined;

  const pickups = [...new Map(riders.map((r) => [r.board.id, r.board])).values()];
  const assignment = chooseDropOffs(riders, coverage);
  const dropIndexes = [...new Set(assignment.values())];
  const drops = dropIndexes.map((i) => coverage.candidates[i]);

  const pickupOrder = orderPath(pickups, undefined, centroid(drops));
  const lastPickup = pickups[pickupOrder.at(-1)!];
  const dropOrder = orderPath(drops, lastPickup);

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
      walkMeters: distance(stops[alight].place, rider.home),
    };
  });

  return {
    stops,
    seats,
    duration: stops.at(-1)!.offset,
    longestRide: Math.max(...seats.map((s) => stops[s.alight].offset - stops[s.board].offset)),
  };
}
