import { getRequestEvent, respond } from "@solidjs/web";
import { APIError } from "better-auth/api";

import { auth } from "./auth";
import { isJoinedUser } from "./auth-join";
import { isValidPassword } from "./password";

export const NAME_MAX_LENGTH = 30;

export type SetupAccountResult = { ok: true } | { ok: false; message: string };

export async function setupAccount(name: string, password: string): Promise<SetupAccountResult> {
  "use server";
  const done = (result: SetupAccountResult) => respond(result, { revalidate: "" });

  name = name.trim();
  if (!name || name.length > NAME_MAX_LENGTH) {
    return done({ ok: false, message: `이름은 1~${NAME_MAX_LENGTH}자로 입력해 주세요.` });
  }
  if (!isValidPassword(password)) {
    return done({ ok: false, message: "비밀번호 조건을 확인해 주세요." });
  }

  const headers = getRequestEvent()?.request.headers;
  const session = headers ? await auth.api.getSession({ headers }) : null;
  if (!headers || !session) {
    return done({ ok: false, message: "인증이 만료됐어요. 처음부터 다시 진행해 주세요." });
  }

  try {
    const ctx = await auth.$context;
    const user = await ctx.internalAdapter.findUserById(session.user.id);
    if (!user || isJoinedUser(user)) return done({ ok: false, message: "이미 가입한 계정이에요. 로그인해 주세요." });

    try {
      await auth.api.setPassword({ headers, body: { newPassword: password } });
    } catch (err) {
      if (!(err instanceof APIError && err.body?.code === "PASSWORD_ALREADY_SET")) throw err;
      await ctx.internalAdapter.updatePassword(user.id, await ctx.password.hash(password));
      await auth.api.revokeOtherSessions({ headers });
    }
    await auth.api.updateUser({ headers, body: { name } });
    return done({ ok: true });
  } catch (err) {
    if (err instanceof APIError && err.body?.code === "SESSION_NOT_FRESH") {
      return done({ ok: false, message: "인증한 지 오래됐어요. 처음부터 다시 진행해 주세요." });
    }
    console.error("setupAccount:", err);
    return done({ ok: false, message: "저장하지 못했어요. 다시 시도해 주세요." });
  }
}
