import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SURVEY_FARES, SURVEY_FREQUENCIES, SURVEY_WAYS } from "../lib/survey-options.ts";
import { DEMO_SLOTS, demoRiders, demoSurveys } from "./demo-data.ts";

describe("demo data", () => {
  it("makes the same riders for the same count, and a longer list starts the same", () => {
    const short = demoRiders(40);
    assert.deepEqual(demoRiders(40), short);
    assert.deepEqual(demoRiders(120).slice(0, 40), short);
    assert.equal(new Set(short.map((rider) => rider.email)).size, 40);
  });

  it("answers every question with an allowed value inside the given slots", () => {
    const riders = demoRiders(200);
    const slots = DEMO_SLOTS.slice(2, 8);
    const answers = demoSurveys(riders, { slots, areaIds: [] });
    assert.equal(answers.length, riders.length);
    for (const answer of answers) {
      assert.ok(SURVEY_FREQUENCIES.includes(answer.frequency));
      assert.ok(answer.ways.length > 0 && answer.ways.every((way) => SURVEY_WAYS.includes(way)));
      assert.ok(SURVEY_FARES.includes(answer.fare));
      assert.ok(answer.slots.length > 0 && answer.slots.every((slot) => slots.includes(slot)));
      assert.match(answer.startId, /^school-\d$/);
    }
  });

  it("starts some riders from a nightlife area when there is one", () => {
    const answers = demoSurveys(demoRiders(200), { slots: DEMO_SLOTS, areaIds: ["area-a"] });
    const fromArea = answers.filter((answer) => answer.startId === "area-a").length;
    assert.ok(fromArea > 20 && fromArea < 100);
  });

  it("lets some riders pick a second slot and a second way home", () => {
    const answers = demoSurveys(demoRiders(200), { slots: DEMO_SLOTS, areaIds: [] });
    const twoSlots = answers.filter((answer) => answer.slots.length === 2).length;
    const twoWays = answers.filter((answer) => answer.ways.length === 2).length;
    assert.ok(twoSlots > 20 && twoSlots < 120, `${twoSlots} riders picked two slots`);
    assert.ok(twoWays > 20 && twoWays < 120, `${twoWays} riders picked two ways`);
  });

  it("falls back to the service window when it has no usual demo slot", () => {
    const answers = demoSurveys(demoRiders(10), { slots: ["21:00", "21:30"], areaIds: [] });
    assert.ok(answers.every((answer) => answer.slots.every((slot) => slot === "21:00" || slot === "21:30")));
  });
});
