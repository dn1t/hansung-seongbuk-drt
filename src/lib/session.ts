import { query, revalidate } from "@solidjs/router";
import { getRequestEvent, redirect } from "@solidjs/web";

import { auth } from "./auth";
import { getJoinState } from "./join";

export const getCurrentSession = query(async () => {
  "use server";
  const headers = getRequestEvent()?.request.headers;
  const user = headers ? await auth.api.getSession({ headers }) : null;

  return user;
}, "current-session");

export const requireSession = query(async () => {
  "use server";
  const [session, join] = await Promise.all([getCurrentSession(), getJoinState()]);
  if (!session || join.step !== "complete") {
    const { paths } = await import("../router");
    throw redirect(paths["welcome"]());
  }

  return session;
}, "require-session");

export function revalidateSession() {
  revalidate([getCurrentSession.key, requireSession.key]);
}
