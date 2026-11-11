import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { adjustDepartures, type DispatchBus } from "./dispatch.ts";
import { distance, type Point } from "./geo.ts";
import { districtOf, planNight, type PlanRider } from "./plan.ts";
import { chooseDropOffs, coverageOf, orderPath, type Place } from "./route.ts";
import { DISPATCH_SETTINGS, PLAN_SETTINGS, walkMinutes } from "./settings.ts";

function random(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32;
    return seed / 2 ** 32;
  };
}

const SLOTS = ["23:00", "23:30", "00:00", "00:30", "01:00", "01:30", "02:00", "02:30", "03:00", "03:30"];

const SCHOOLS: Place[] = [
  { id: "korea", name: "고려대학교 앞", lat: 37.5894, lng: 127.0323 },
  { id: "kookmin", name: "국민대학교 앞", lat: 37.6109, lng: 126.9969 },
  { id: "sungshin", name: "성신여자대학교 앞", lat: 37.5913, lng: 127.0221 },
  { id: "hansung", name: "한성대학교 앞", lat: 37.5826, lng: 127.0102 },
];

const DISTRICTS = [
  { name: "노원", lat: 37.655, lng: 127.065 },
  { name: "강북", lat: 37.635, lng: 127.025 },
  { name: "동대문", lat: 37.58, lng: 127.05 },
  { name: "중랑", lat: 37.6, lng: 127.09 },
  { name: "도봉", lat: 37.665, lng: 127.035 },
];

function stopGrid(): Place[] {
  const stops: Place[] = [];
  for (let lat = 37.56; lat <= 37.68; lat += 0.006) {
    for (let lng = 126.98; lng <= 127.11; lng += 0.007) {
      const nearest = DISTRICTS.reduce((best, d) =>
        distance(d, { lat, lng }) < distance(best, { lat, lng }) ? d : best,
      );
      stops.push({
        id: `s${stops.length}`,
        name: `정류장 ${stops.length}`,
        address: `서울 ${nearest.name}구 어딘가`,
        lat,
        lng,
      });
    }
  }
  return stops;
}

function riders(count: number, seed: number): PlanRider[] {
  const next = random(seed);
  return Array.from({ length: count }, (_, i) => {
    const district = DISTRICTS[Math.floor(next() * DISTRICTS.length)];
    return {
      id: `r${i}`,
      slot: SLOTS[Math.floor(next() * SLOTS.length)],
      home: { lat: district.lat + (next() - 0.5) * 0.03, lng: district.lng + (next() - 0.5) * 0.03 },
      board: SCHOOLS[Math.floor(next() * SCHOOLS.length)],
    };
  });
}

describe("orderPath", () => {
  it("visits points on a line in order", () => {
    const line: Point[] = [0, 4, 1, 3, 2].map((k) => ({ lat: 37.6, lng: 127 + k * 0.01 }));
    const order = orderPath(line, { lat: 37.6, lng: 126.99 });
    assert.deepEqual(
      order.map((i) => line[i].lng),
      [127, 127.01, 127.02, 127.03, 127.04],
    );
  });

  it("ends next to the given end point", () => {
    const points: Point[] = [
      { lat: 37.6, lng: 127.0 },
      { lat: 37.6, lng: 127.02 },
      { lat: 37.6, lng: 127.01 },
    ];
    const order = orderPath(points, undefined, { lat: 37.6, lng: 127.05 });
    assert.equal(points[order.at(-1)!].lng, 127.02);
    assert.equal(points[order[0]].lng, 127.0);
  });

  it("removes a crossing with 2-opt", () => {
    const square: Point[] = [
      { lat: 37.6, lng: 127.0 },
      { lat: 37.61, lng: 127.01 },
      { lat: 37.6, lng: 127.01 },
      { lat: 37.61, lng: 127.0 },
    ];
    const order = orderPath(square, { lat: 37.595, lng: 127.0 });
    const length = order.reduce((sum, idx, k) => sum + (k === 0 ? 0 : distance(square[order[k - 1]], square[idx])), 0);
    const best = 2 * distance(square[0], square[2]) + distance(square[0], square[3]);
    assert.ok(length <= best + 1, `${length} > ${best}`);
  });
});

describe("chooseDropOffs", () => {
  it("picks one shared stop when it covers everyone", () => {
    const shared: Place = { id: "shared", name: "가운데", lat: 37.6, lng: 127.0 };
    const left: Place = { id: "left", name: "왼쪽", lat: 37.6, lng: 126.995 };
    const homes = [
      { id: "a", home: { lat: 37.6, lng: 126.997 } },
      { id: "b", home: { lat: 37.6, lng: 127.003 } },
      { id: "c", home: { lat: 37.6015, lng: 127.0 } },
    ];
    const coverage = coverageOf(homes, [left, shared], PLAN_SETTINGS.maxWalkMeters);
    const assignment = chooseDropOffs(homes, coverage);
    assert.deepEqual([...new Set(assignment.values())], [1]);
  });

  it("sends a rider with no stop in reach to the nearest stop", () => {
    const far: Place = { id: "far", name: "먼 곳", lat: 37.7, lng: 127.1 };
    const homes = [{ id: "a", home: { lat: 37.6, lng: 127.0 } }];
    const coverage = coverageOf(homes, [far], PLAN_SETTINGS.maxWalkMeters);
    assert.equal(chooseDropOffs(homes, coverage).get("a"), 0);
  });
});

describe("planNight", () => {
  const candidates = stopGrid();
  const input = riders(260, 7);
  const result = planNight({ slots: SLOTS, riders: input, candidates, settings: PLAN_SETTINGS });

  it("counts the steps it took", () => {
    assert.ok(result.steps.groups >= result.buses.length);
    assert.equal(result.steps.groups - result.steps.merged, result.buses.length);
    assert.ok(result.steps.moved >= 0);
  });

  it("puts every rider on exactly one bus", () => {
    const seen = result.buses.flatMap((bus) => bus.route.seats.map((s) => s.riderId));
    assert.equal(seen.length, input.length);
    assert.equal(new Set(seen).size, input.length);
    assert.deepEqual(result.unplaced, []);
  });

  it("keeps buses within capacity and ride time", () => {
    for (const bus of result.buses) {
      assert.ok(bus.route.seats.length <= PLAN_SETTINGS.capacity, `${bus.name} has ${bus.route.seats.length}`);
      if (bus.route.seats.length > 1) assert.ok(bus.route.longestRide <= PLAN_SETTINGS.maxRideMinutes);
    }
  });

  it("boards before it drops off, in time order", () => {
    for (const bus of result.buses) {
      const { stops, seats } = bus.route;
      for (let k = 1; k < stops.length; k++) assert.ok(stops[k].offset >= stops[k - 1].offset);
      const firstAlight = stops.findIndex((s) => s.kind === "alight");
      assert.ok(stops.slice(0, firstAlight).every((s) => s.kind === "board"));
      assert.ok(stops.slice(firstAlight).every((s) => s.kind === "alight"));
      for (const seat of seats) {
        assert.equal(stops[seat.board].kind, "board");
        assert.equal(stops[seat.alight].kind, "alight");
        assert.ok(seat.board < seat.alight);
      }
    }
  });

  it("stops only where someone gets off, within walking distance", () => {
    for (const bus of result.buses) {
      const used = new Set(bus.route.seats.map((s) => s.alight));
      bus.route.stops.forEach((stop, k) => {
        if (stop.kind === "alight") assert.ok(used.has(k), `${bus.name} stops at ${stop.place.name} for nobody`);
      });
      for (const seat of bus.route.seats) assert.ok(seat.walkMeters <= PLAN_SETTINGS.maxWalkMeters);
    }
  });

  it("merges small groups where a neighbor has room", () => {
    const small = result.buses.filter((b) => b.route.seats.length < PLAN_SETTINGS.minRiders);
    assert.ok(small.length <= result.buses.length / 3, `${small.length} of ${result.buses.length} buses are small`);
  });

  it("names buses by the district of the last stop", () => {
    for (const bus of result.buses) assert.match(bus.name, /^(노원|강북|동대문|중랑|도봉)행( \d)?$/);
  });

  it("is deterministic", () => {
    const again = planNight({ slots: SLOTS, riders: input, candidates, settings: PLAN_SETTINGS });
    assert.deepEqual(
      again.buses.map((b) => [b.slot, b.name, b.route.seats.length]),
      result.buses.map((b) => [b.slot, b.name, b.route.seats.length]),
    );
  });

  it("moves a lone rider into the next slot's bus going the same way", () => {
    const base = riders(40, 3).map((r) => ({ ...r, slot: "01:30", home: { lat: 37.655, lng: 127.065 } }));
    const lone: PlanRider = { ...base[0], id: "lone", slot: "01:00" };
    const plan = planNight({
      slots: SLOTS,
      riders: [lone, ...base.slice(1, 12)],
      candidates,
      settings: PLAN_SETTINGS,
    });
    assert.equal(plan.buses.length, 1);
    assert.equal(plan.buses[0].slot, "01:30");
    assert.equal(plan.buses[0].route.seats.length, 12);
  });

  it("plans nothing without stops", () => {
    const plan = planNight({ slots: SLOTS, riders: input.slice(0, 3), candidates: [], settings: PLAN_SETTINGS });
    assert.equal(plan.buses.length, 0);
    assert.equal(plan.unplaced.length, 3);
  });
});

describe("adjustDepartures", () => {
  const MIN = 60_000;
  const now = 0;
  const bus = (id: string, slot: number, planned: number, load: number): DispatchBus => ({
    id,
    slot,
    bearing: 30,
    planned: planned * MIN,
    departs: planned * MIN,
    capacity: 28,
    load,
  });

  it("moves a quiet bus earlier after a busy one", () => {
    const result = adjustDepartures([bus("a", 0, 120, 20), bus("b", 1, 150, 5)], now, DISPATCH_SETTINGS);
    assert.equal(result.get("a"), 120 * MIN);
    assert.equal(result.get("b"), 135 * MIN);
  });

  it("leaves balanced buses alone", () => {
    const result = adjustDepartures([bus("a", 0, 120, 12), bus("b", 1, 150, 11)], now, DISPATCH_SETTINGS);
    assert.equal(result.get("b"), 150 * MIN);
  });

  it("does not touch a bus about to leave", () => {
    const result = adjustDepartures([bus("a", 0, 0, 20), bus("b", 1, 20, 2)], now, DISPATCH_SETTINGS);
    assert.equal(result.get("b"), 20 * MIN);
  });

  it("keeps the minimum gap and never moves into the frozen window", () => {
    const tight = { ...DISPATCH_SETTINGS, shiftMinutes: 40 };
    const result = adjustDepartures([bus("a", 0, 120, 25), bus("b", 1, 150, 1)], now, tight);
    assert.equal(result.get("b"), 130 * MIN);
    const late = adjustDepartures([bus("a", 0, 20, 25), bus("b", 1, 45, 1)], now, DISPATCH_SETTINGS);
    assert.equal(late.get("b"), 30 * MIN);
  });

  it("puts a bus back when demand evens out", () => {
    const moved = { ...bus("b", 1, 150, 15), departs: 135 * MIN };
    const result = adjustDepartures([bus("a", 0, 120, 20), moved], now, DISPATCH_SETTINGS);
    assert.equal(result.get("b"), 150 * MIN);
  });
});

describe("helpers", () => {
  it("reads the district from an address", () => {
    assert.equal(districtOf("서울 노원구 상계동 123"), "노원");
    assert.equal(districtOf("서울특별시 성북구 보문로 1"), "성북");
    assert.equal(districtOf("경기 구리시 인창동"), undefined);
  });

  it("falls back to the nearest district office", async () => {
    const { nearestDistrict } = await import("./districts.ts");
    assert.equal(nearestDistrict({ lat: 37.6553, lng: 127.0613 }), "노원");
    assert.equal(nearestDistrict({ lat: 37.5904, lng: 127.0358 }), "성북");
  });

  it("estimates walking minutes", () => {
    assert.equal(walkMinutes(0, PLAN_SETTINGS), 1);
    assert.equal(walkMinutes(700, PLAN_SETTINGS), 13);
  });
});
