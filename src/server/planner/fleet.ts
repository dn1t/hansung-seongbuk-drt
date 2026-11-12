import { distance, type Point } from "./geo.ts";
import { driveMinutes, type PlanSettings } from "./settings.ts";

export interface Trip {
  id: string;
  departs: number;
  duration: number;
  first: Point;
  last: Point;
}

export interface Fleet {
  size: number;
  vehicleOf: Map<string, number>;
  chains: string[][];
}

type FleetSettings = Pick<PlanSettings, "driveDetour" | "driveMetersPerMinute" | "turnMinutes" | "maxDeadheadMinutes">;

export function deadheadMinutes(from: Trip, to: Trip, settings: FleetSettings) {
  return driveMinutes(distance(from.last, to.first), settings);
}

export function canFollow(from: Trip, to: Trip, settings: FleetSettings) {
  const deadhead = deadheadMinutes(from, to, settings);
  return (
    deadhead <= settings.maxDeadheadMinutes &&
    from.departs + from.duration + deadhead + settings.turnMinutes <= to.departs
  );
}

export function assignVehicles(input: Trip[], settings: FleetSettings): Fleet {
  const trips = [...input].sort((a, b) => a.departs - b.departs || a.id.localeCompare(b.id));
  const next = trips.map((from) => trips.flatMap((to, j) => (to !== from && canFollow(from, to, settings) ? [j] : [])));
  const before: number[] = trips.map(() => -1);

  const extend = (i: number, seen: Set<number>): boolean => {
    for (const j of next[i]) {
      if (seen.has(j)) continue;
      seen.add(j);
      if (before[j] === -1 || extend(before[j], seen)) {
        before[j] = i;
        return true;
      }
    }
    return false;
  };
  for (let i = 0; i < trips.length; i++) extend(i, new Set());

  const after: number[] = trips.map(() => -1);
  before.forEach((i, j) => {
    if (i !== -1) after[i] = j;
  });

  const chains: string[][] = [];
  const vehicleOf = new Map<string, number>();
  trips.forEach((trip, i) => {
    if (before[i] !== -1) return;
    const chain: string[] = [];
    for (let k = i; k !== -1; k = after[k]) {
      chain.push(trips[k].id);
      vehicleOf.set(trips[k].id, chains.length + 1);
    }
    chains.push(chain);
  });
  return { size: chains.length, vehicleOf, chains };
}
