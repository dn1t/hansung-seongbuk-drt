import { createCookie } from "@remix-run/cookie";
import type { RequestEvent, ResponseStub } from "@solidjs/web";
import { getRequestEvent } from "@solidjs/web";
import { env } from "virtual:solid-env/server";

export interface SessionData {
  userId?: string;
}

const MAX_AGE = 60 * 60 * 24 * 7;

const secrets = (env.AUTH_SECRET ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
if (secrets.length === 0) {
  throw new Error("session: AUTH_SECRET is not set — generate one with `openssl rand -base64 32`");
}

const cookie = createCookie("session", {
  secrets,
  httpOnly: true,
  secure: true,
  sameSite: "Lax",
  maxAge: MAX_AGE,
});

function event(): RequestEvent & { response: ResponseStub } {
  const e = getRequestEvent();
  if (!e) {
    throw new Error("session: no request event — call within a server function, SSR handler, or middleware");
  }
  return e as RequestEvent & { response: ResponseStub };
}

export async function getSession(): Promise<SessionData | null> {
  const raw = await cookie.parse(event().request.headers.get("cookie"));
  if (!raw) return null;
  try {
    const { data, exp } = JSON.parse(raw) as { data: SessionData; exp: number };
    return typeof exp === "number" && Date.now() < exp * 1000 ? data : null;
  } catch {
    return null;
  }
}

export async function setSession(data: SessionData): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  event().response.headers.append("set-cookie", await cookie.serialize(JSON.stringify({ data, exp })));
}

export async function clearSession(): Promise<void> {
  event().response.headers.append("set-cookie", await cookie.serialize("", { maxAge: 0 }));
}
