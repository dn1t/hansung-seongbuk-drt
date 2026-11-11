const PREFIX = "D1";
export const QR_WINDOW_MS = 60_000;
export const QR_VALID_WINDOWS = 10;

export type QrCheck = { ok: true; userId: string } | { ok: false; reason: "expired" | "invalid" };

async function sign(secret: string, userId: string, window: number) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`qr:${userId}:${window}`));
  return Array.from(new Uint8Array(signature).slice(0, 12), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function isQrToken(code: string) {
  return code.startsWith(`${PREFIX}.`);
}

export async function makeQrToken(secret: string, userId: string, now: number) {
  const window = Math.floor(now / QR_WINDOW_MS);
  return {
    value: `${PREFIX}.${userId}.${window.toString(36)}.${await sign(secret, userId, window)}`,
    refreshAt: (window + 1) * QR_WINDOW_MS,
  };
}

export async function checkQrToken(secret: string, code: string, now: number): Promise<QrCheck> {
  const parts = code.trim().split(".");
  if (parts.length !== 4 || parts[0] !== PREFIX) return { ok: false, reason: "invalid" };
  const [, userId, windowText, signature] = parts;
  const window = parseInt(windowText, 36);
  if (!userId || !Number.isFinite(window)) return { ok: false, reason: "invalid" };
  const expected = await sign(secret, userId, window);
  let diff = expected.length === signature.length ? 0 : 1;
  for (let i = 0; i < Math.min(expected.length, signature.length); i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  if (diff !== 0) return { ok: false, reason: "invalid" };
  const current = Math.floor(now / QR_WINDOW_MS);
  if (window > current + 1 || current - window >= QR_VALID_WINDOWS) return { ok: false, reason: "expired" };
  return { ok: true, userId };
}
