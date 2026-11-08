import { query } from "@solidjs/router";
import { getRequestEvent, redirect } from "@solidjs/web";

import { paths } from "../router";
import { auth } from "./auth";

export const getCurrentSession = query(async () => {
  "use server";
  const headers = getRequestEvent()?.request.headers;
  const user = headers ? await auth.api.getSession({ headers }) : null;

  return user;
}, "current-session");

export const requireSession = query(async () => {
  "use server";
  const session = await getCurrentSession();
  if (!session) throw redirect(paths["welcome"]());

  return session;
}, "require-session");
