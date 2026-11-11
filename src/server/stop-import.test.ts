import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { prepareImport } from "./stop-import.ts";

const options = { center: { lat: 37.597, lng: 127.03 }, radiusMeters: 8000, maxName: 40 };
const row = (name: string, lat: number, lng: number, code = "") => ({ name, code, lat, lng });

describe("prepareImport", () => {
  it("skips a stop with the same name close to an existing one", () => {
    const result = prepareImport([row("월계역", 37.6332, 127.0588)], [row("월계역", 37.6331, 127.0587)], options);
    assert.equal(result.stops.length, 0);
    assert.equal(result.skipped, 1);
  });

  it("names a far-away twin by its stop number, or by district without one", () => {
    const existing = [row("월계역", 37.6331, 127.0587)];
    const result = prepareImport(
      [row("월계역", 37.65, 127.07, "08003"), row("월계역", 37.655, 127.065)],
      existing,
      options,
    );
    assert.deepEqual(
      result.stops.map((stop) => stop.name),
      ["월계역 (08003)", "월계역 (노원구)"],
    );
  });

  it("skips places outside the radius and bad rows", () => {
    const result = prepareImport(
      [row("강남역", 37.4979, 127.0276), row("", 37.6, 127.0), row("x", NaN, 127)],
      [],
      options,
    );
    assert.equal(result.stops.length, 0);
    assert.equal(result.skipped, 3);
  });

  it("does not add the same stop twice from one file", () => {
    const result = prepareImport([row("노원역", 37.6553, 127.0613), row("노원역", 37.6554, 127.0614)], [], options);
    assert.equal(result.stops.length, 1);
    assert.match(result.stops[0].address, /^서울 노원구/);
  });
});
