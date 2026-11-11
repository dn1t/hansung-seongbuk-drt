import { query } from "@solidjs/router";
import type { StartRequestEvent } from "@solidjs/vite-plugin";
import { getRequestEvent, parseCookieHeader, respond, serializeCookie } from "@solidjs/web";

import env from "./server-env";

const STAFF_COOKIE = "drt_staff";
const STAFF_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;
const SIGN_IN_WINDOW_MS = 10 * 60_000;
const SIGN_IN_MAX_ATTEMPTS = 10;

const signInAttempts = new Map<string, { count: number; since: number }>();

export interface StaffState {
  configured: boolean;
  signedIn: boolean;
}

export type StaffSignInResult = { ok: true } | { ok: false; message: string };

async function digest(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.AUTH_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`staff:${value}`));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function sameText(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function clientKey(event: StartRequestEvent) {
  const headers = event.request.headers;
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return headers.get("cf-connecting-ip") || forwarded || headers.get("x-real-ip") || "local";
}

function isSecure(event: StartRequestEvent) {
  return new URL(event.request.url).protocol === "https:";
}

export async function isStaff() {
  "use server";
  if (!env.STAFF_CODE) return false;
  const event = getRequestEvent();
  const token = event ? parseCookieHeader(event.request.headers.get("cookie"))[STAFF_COOKIE] : undefined;
  return token !== undefined && sameText(token, await digest(env.STAFF_CODE));
}

export async function requireStaff() {
  "use server";
  if (!(await isStaff())) throw new Error("운영자 코드를 다시 입력해 주세요.");
}

export const getStaffState = query(async (): Promise<StaffState> => {
  "use server";
  return { configured: Boolean(env.STAFF_CODE), signedIn: await isStaff() };
}, "staff-state");

export async function staffSignIn(code: string): Promise<StaffSignInResult> {
  "use server";
  const done = (result: StaffSignInResult) => respond(result, { revalidate: [getStaffState.key] });
  const event = getRequestEvent() as StartRequestEvent | undefined;
  if (!event || !env.STAFF_CODE) return done({ ok: false, message: "운영자 코드가 설정되지 않았어요." });

  const key = clientKey(event);
  const now = Date.now();
  const attempt = signInAttempts.get(key);
  const current = attempt && now - attempt.since < SIGN_IN_WINDOW_MS ? attempt : { count: 0, since: now };
  if (current.count >= SIGN_IN_MAX_ATTEMPTS) {
    return done({ ok: false, message: "너무 많이 틀렸어요. 10분 뒤에 다시 시도해 주세요." });
  }

  const expected = await digest(env.STAFF_CODE);
  if (!sameText(await digest(code.trim()), expected)) {
    signInAttempts.set(key, { count: current.count + 1, since: current.since });
    return done({ ok: false, message: "코드가 맞지 않아요. 다시 확인해 주세요." });
  }

  signInAttempts.delete(key);
  event.response.headers.append(
    "Set-Cookie",
    serializeCookie(STAFF_COOKIE, expected, {
      httpOnly: true,
      sameSite: "lax",
      secure: isSecure(event),
      maxAge: STAFF_COOKIE_MAX_AGE,
    }),
  );
  return done({ ok: true });
}

export async function staffSignOut(): Promise<StaffSignInResult> {
  "use server";
  const event = getRequestEvent() as StartRequestEvent | undefined;
  event?.response.headers.append(
    "Set-Cookie",
    serializeCookie(STAFF_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: event && isSecure(event), maxAge: 0 }),
  );
  return respond({ ok: true }, { revalidate: [getStaffState.key] });
}
