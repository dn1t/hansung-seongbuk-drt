import { query } from "@solidjs/router";
import { getRequestEvent, redirect } from "@solidjs/web";
import { GET } from "@solidjs/web/server-functions";

import { auth } from "./auth";
import type { JoinState } from "./auth-join";

export type { JoinState, JoinStep } from "./auth-join";

export const getJoinState = GET(async (): Promise<JoinState> => {
  "use server";
  const headers = getRequestEvent()?.request.headers;
  if (!headers) return { step: "join-1" };
  return auth.api.getJoinState({ headers });
});

export const getWelcomeState = query(async () => {
  "use server";
  const state = await getJoinState();
  if (state.step === "complete") throw redirect("/");
  return state;
}, "welcome-state");
