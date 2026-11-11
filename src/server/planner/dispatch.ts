import { angleBetween } from "./geo.ts";
import type { DispatchSettings } from "./settings.ts";

export interface DispatchBus {
  id: string;
  slot: number;
  bearing: number;
  planned: number;
  departs: number;
  capacity: number;
  load: number;
}

const MINUTE = 60_000;

export function previousBus(bus: DispatchBus, buses: DispatchBus[], settings: DispatchSettings) {
  let best: DispatchBus | undefined;
  for (const other of buses) {
    if (other.slot !== bus.slot - 1) continue;
    const angle = angleBetween(other.bearing, bus.bearing);
    if (angle > settings.linkBearingDegrees) continue;
    if (!best || angle < angleBetween(best.bearing, bus.bearing)) best = other;
  }
  return best;
}

export function adjustDepartures(buses: DispatchBus[], now: number, settings: DispatchSettings) {
  const result = new Map<string, number>();
  const sorted = [...buses].sort((a, b) => a.planned - b.planned);

  for (const bus of sorted) {
    const soonest = Math.min(bus.planned, bus.departs);
    if (soonest - now < settings.freezeMinutes * MINUTE) {
      result.set(bus.id, bus.departs);
      continue;
    }
    const before = previousBus(bus, buses, settings);
    const busy = before !== undefined && before.load >= settings.busyShare * before.capacity;
    const quiet = bus.load <= settings.quietShare * bus.capacity;
    if (!before || !busy || !quiet) {
      result.set(bus.id, bus.planned);
      continue;
    }
    const beforeDeparts = result.get(before.id) ?? before.departs;
    const target = Math.max(
      bus.planned - settings.shiftMinutes * MINUTE,
      beforeDeparts + settings.minHeadwayMinutes * MINUTE,
      now + settings.freezeMinutes * MINUTE,
    );
    result.set(bus.id, Math.min(bus.planned, target));
  }
  return result;
}
