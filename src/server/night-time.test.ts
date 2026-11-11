import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ALL_SLOTS, demoMoment, isSlot, kstDate, nightClock, nightOf, slotEnd, slotsBetween } from "./night-time.ts";

const kst = (text: string) => Date.parse(`${text}+09:00`);

describe("night time", () => {
  it("puts after-midnight slots on the next calendar day", () => {
    assert.equal(nightClock("2026-11-10", "23:30"), kst("2026-11-10T23:30:00"));
    assert.equal(nightClock("2026-11-10", "01:00"), kst("2026-11-11T01:00:00"));
    assert.equal(slotEnd("2026-11-10", "23:30"), kst("2026-11-11T00:00:00"));
  });

  it("keeps the same night until noon the next day", () => {
    assert.equal(nightOf(kst("2026-11-11T01:30:00")), "2026-11-10");
    assert.equal(nightOf(kst("2026-11-11T11:59:00")), "2026-11-10");
    assert.equal(nightOf(kst("2026-11-11T12:00:00")), "2026-11-11");
    assert.equal(kstDate(kst("2026-11-11T00:10:00")), "2026-11-11");
  });

  it("lists slots in night order across midnight", () => {
    assert.equal(ALL_SLOTS[0], "18:00");
    assert.equal(ALL_SLOTS.at(-1), "05:30");
    assert.deepEqual(slotsBetween("23:00", "00:30"), ["23:00", "23:30", "00:00", "00:30"]);
    assert.ok(isSlot("03:30"));
    assert.ok(!isSlot("12:00"));
    assert.ok(!isSlot(undefined));
  });
});

describe("demoMoment", () => {
  const now = Date.parse("2026-11-11T03:00:00Z");

  it("puts a bare time on tonight", () => {
    assert.equal(demoMoment("01:00", now), Date.parse("2026-11-11T16:00:00Z"));
  });

  it("reads the date as the night, so 01:00 lands on the next calendar day", () => {
    assert.equal(demoMoment("2026-12-08 01:00", now), Date.parse("2026-12-08T16:00:00Z"));
    assert.equal(demoMoment("2026-12-08T22:30", now), Date.parse("2026-12-08T13:30:00Z"));
  });

  it("ignores empty and invalid values", () => {
    assert.equal(demoMoment("", now), undefined);
    assert.equal(demoMoment("25:00", now), undefined);
    assert.equal(demoMoment("2026-02-30 01:00", now), undefined);
  });
});
