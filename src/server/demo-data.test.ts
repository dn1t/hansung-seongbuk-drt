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
      assert.ok(SURVEY_WAYS.includes(answer.way));
      assert.ok(SURVEY_FARES.includes(answer.fare));
      assert.ok(slots.includes(answer.slot));
      assert.match(answer.startId, /^school-\d$/);
    }
  });

  it("starts some riders from a nightlife area when there is one", () => {
    const answers = demoSurveys(demoRiders(200), { slots: DEMO_SLOTS, areaIds: ["area-a"] });
    const fromArea = answers.filter((answer) => answer.startId === "area-a").length;
    assert.ok(fromArea > 20 && fromArea < 100);
  });

  it("falls back to the service window when it has no usual demo slot", () => {
    const answers = demoSurveys(demoRiders(10), { slots: ["21:00", "21:30"], areaIds: [] });
    assert.ok(answers.every((answer) => answer.slot === "21:00" || answer.slot === "21:30"));
  });
});
