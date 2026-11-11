import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { checkQrToken, isQrToken, makeQrToken, QR_VALID_WINDOWS, QR_WINDOW_MS } from "./qr-sign.ts";

const SECRET = "test-secret-test-secret-test-secret";
const NOW = Date.parse("2026-11-11T01:00:00+09:00");

describe("signed QR", () => {
  it("accepts a fresh token and returns the student id", async () => {
    const { value } = await makeQrToken(SECRET, "user123", NOW);
    assert.ok(isQrToken(value));
    assert.deepEqual(await checkQrToken(SECRET, value, NOW + 30_000), { ok: true, userId: "user123" });
  });

  it("expires after the valid windows", async () => {
    const { value } = await makeQrToken(SECRET, "user123", NOW);
    const late = NOW + QR_VALID_WINDOWS * QR_WINDOW_MS + 1;
    assert.deepEqual(await checkQrToken(SECRET, value, late), { ok: false, reason: "expired" });
  });

  it("rejects tampering, another secret, and plain text", async () => {
    const { value } = await makeQrToken(SECRET, "user123", NOW);
    const swapped = value.replace("user123", "user999");
    assert.equal((await checkQrToken(SECRET, swapped, NOW)).ok, false);
    assert.equal((await checkQrToken("other-secret", value, NOW)).ok, false);
    assert.equal((await checkQrToken(SECRET, "user123", NOW)).ok, false);
    assert.equal((await checkQrToken(SECRET, "D1.user123.zz.00", NOW)).ok, false);
  });

  it("rejects a token from the future", async () => {
    const { value } = await makeQrToken(SECRET, "user123", NOW + 5 * QR_WINDOW_MS);
    assert.deepEqual(await checkQrToken(SECRET, value, NOW), { ok: false, reason: "expired" });
  });
});
