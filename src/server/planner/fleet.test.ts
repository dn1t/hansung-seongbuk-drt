import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assignVehicles, canFollow, type Trip } from "./fleet.ts";
import { PLAN_SETTINGS } from "./settings.ts";

const campus = { lat: 37.5826, lng: 127.0102 };
const nowon = { lat: 37.6553, lng: 127.0613 };
const nearby = { lat: 37.585, lng: 127.012 };

const trip = (id: string, departs: number, duration: number, first = campus, last = nowon): Trip => ({
  id,
  departs,
  duration,
  first,
  last,
});

describe("assignVehicles", () => {
  it("sends a bus back out when it can reach the next start in time", () => {
    const back = trip("back", 60, 20, nowon, campus);
    const first = trip("first", 0, 40, campus, nowon);
    assert.ok(canFollow(first, back, PLAN_SETTINGS));
    const fleet = assignVehicles([first, back], PLAN_SETTINGS);
    assert.equal(fleet.size, 1);
    assert.deepEqual(fleet.chains, [["first", "back"]]);
  });

  it("needs another bus when the next run starts before this one can get there", () => {
    const first = trip("first", 0, 40);
    const soon = trip("soon", 45, 30);
    assert.equal(canFollow(first, soon, PLAN_SETTINGS), false);
    assert.equal(assignVehicles([first, soon], PLAN_SETTINGS).size, 2);
  });

  it("never chains across more than the allowed empty drive", () => {
    const far = { lat: 37.75, lng: 127.25 };
    const first = trip("first", 0, 40, campus, far);
    const later = trip("later", 300, 30, nearby, nowon);
    assert.equal(canFollow(first, later, PLAN_SETTINGS), false);
  });

  it("uses as few buses as the timetable allows", () => {
    const runs = [
      trip("a", 0, 40, campus, nearby),
      trip("b", 0, 40, campus, nearby),
      trip("c", 60, 40, nearby, nearby),
      trip("d", 60, 40, nearby, nearby),
      trip("e", 120, 40, nearby, nearby),
    ];
    const fleet = assignVehicles(runs, PLAN_SETTINGS);
    assert.equal(fleet.size, 2);
    assert.equal(new Set(fleet.vehicleOf.values()).size, 2);
  });
});
