import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";

import { isSchoolEmail, VERIFICATION_CODE_TTL } from "./schools";

export type JoinStep = "join-1" | "join-2" | "join-3" | "join-4" | "complete";

export interface JoinState {
  step: JoinStep;
  email?: string;
  name?: string;
  codeExpiresAt?: number;
}

export function isJoinedUser(user: object) {
  return Boolean((user as { homeAddress?: string | null }).homeAddress);
}

const SEND_OTP_PATH = "/email-otp/send-verification-otp";
const SIGN_IN_OTP_PATH = "/sign-in/email-otp";
const PENDING_COOKIE = "join_pending";
const PENDING_MAX_AGE = 60 * 60 * 24;

type HookContext = Parameters<Parameters<typeof createAuthMiddleware>[0]>[0];

function pendingCookie(ctx: HookContext) {
  return ctx.context.createAuthCookie(PENDING_COOKIE, { maxAge: PENDING_MAX_AGE });
}

function clearPendingCookie(ctx: HookContext) {
  const { name, attributes } = pendingCookie(ctx);
  ctx.setCookie(name, "", { ...attributes, maxAge: 0 });
}

export const joinFlow = () =>
  ({
    id: "join-flow",
    hooks: {
      before: [
        {
          matcher: (ctx) => ctx.path === SEND_OTP_PATH,
          handler: createAuthMiddleware(async (ctx) => {
            const email = String(ctx.body?.email ?? "")
              .trim()
              .toLowerCase();
            if (!isSchoolEmail(email)) {
              throw new APIError("BAD_REQUEST", { code: "NOT_SCHOOL_EMAIL", message: "가입할 수 없는 학교에요." });
            }
            if (ctx.body?.type !== "sign-in") return;
            const found = await ctx.context.internalAdapter.findUserByEmail(email);
            if (found && isJoinedUser(found.user)) {
              throw new APIError("BAD_REQUEST", {
                code: "ALREADY_JOINED",
                message: "이미 가입한 이메일이에요. 로그인해 주세요.",
              });
            }
          }),
        },
      ],
      after: [
        {
          matcher: (ctx) => ctx.path === SEND_OTP_PATH,
          handler: createAuthMiddleware(async (ctx) => {
            if (ctx.context.returned instanceof APIError || ctx.body?.type !== "sign-in") return;
            const { name, attributes } = pendingCookie(ctx);
            const value = JSON.stringify({
              email: String(ctx.body.email).trim().toLowerCase(),
              codeExpiresAt: Date.now() + VERIFICATION_CODE_TTL * 1000,
            });
            await ctx.setSignedCookie(name, value, ctx.context.secret, attributes);
          }),
        },
        {
          matcher: (ctx) => ctx.path === SIGN_IN_OTP_PATH,
          handler: createAuthMiddleware(async (ctx) => {
            if (ctx.context.returned instanceof APIError) return;
            clearPendingCookie(ctx);
          }),
        },
      ],
    },
    endpoints: {
      getJoinState: createAuthEndpoint("/join/state", { method: "GET" }, async (ctx) => {
        const session = await getSessionFromCtx(ctx);
        const user = session ? await ctx.context.internalAdapter.findUserById(session.user.id) : null;
        if (user) {
          const state = { email: user.email, name: user.name || undefined };
          if (!user.name) return ctx.json<JoinState>({ step: "join-3", ...state });
          if (!isJoinedUser(user)) return ctx.json<JoinState>({ step: "join-4", ...state });
          return ctx.json<JoinState>({ step: "complete", ...state });
        }

        const raw = await ctx.getSignedCookie(pendingCookie(ctx).name, ctx.context.secret);
        if (raw) {
          try {
            const { email, codeExpiresAt } = JSON.parse(raw) as { email: string; codeExpiresAt: number };
            return ctx.json<JoinState>({ step: "join-2", email, codeExpiresAt });
          } catch {}
        }
        return ctx.json<JoinState>({ step: "join-1" });
      }),
      resetJoin: createAuthEndpoint("/join/reset", { method: "POST" }, async (ctx) => {
        clearPendingCookie(ctx);
        return ctx.json({ success: true });
      }),
    },
  }) satisfies BetterAuthPlugin;
