import env from "../lib/server-env";
import { checkQrToken, makeQrToken } from "./qr-sign";

export { isQrToken } from "./qr-sign";

export function qrTokenFor(userId: string, now = Date.now()) {
  return makeQrToken(env.AUTH_SECRET, userId, now);
}

export function readQrToken(code: string, now = Date.now()) {
  return checkQrToken(env.AUTH_SECRET, code, now);
}
