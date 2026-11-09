import { useNavigate, useSearchParams } from "@solidjs/router";
import { createSignal, Show } from "solid-js";

import { Input } from "../components/common/input";
import { Footer, Header, PasswordRules } from "../components/layout/screen";
import { authClient } from "../lib/auth-client";
import { isValidPassword, PASSWORD_MAX_LENGTH } from "../lib/password";
import type { WelcomeLocationState, WelcomePage } from "./welcome";

export default function ResetPassword() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams<{ token?: string; error?: string }>();
  const linkValid = () => Boolean(searchParams.token) && searchParams.error !== "INVALID_TOKEN";

  const [password, setPassword] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal("");

  function toWelcome(page: WelcomePage, notice?: string) {
    nav("/welcome", { replace: true, state: { page, notice } satisfies WelcomeLocationState });
  }

  async function changePassword(nextPassword: string) {
    const { error } = await authClient.resetPassword({ newPassword: nextPassword, token: searchParams.token ?? "" });
    if (error) {
      if (error.code === "INVALID_TOKEN")
        throw new Error("링크가 만료됐거나 이미 썼어요. 재설정을 다시 요청해 주세요.");
      if (error.status === 429) throw new Error("요청이 너무 많아요. 잠시 후 다시 시도해 주세요.");
      throw new Error(error.message ?? "비밀번호를 바꾸지 못했어요. 다시 시도해 주세요.");
    }
    toWelcome("login", "비밀번호를 바꿨어요. 새 비밀번호로 로그인해 주세요.");
  }

  return (
    <div class="flex flex-1 flex-col px-5">
      <Header title="새 비밀번호를 정해 주세요" onBackClick={() => toWelcome("login")} />
      <Show
        when={linkValid()}
        fallback={
          <div class="flex flex-1 flex-col">
            <span class="my-4 px-1 font-medium text-balance break-keep text-sand-11">
              링크가 만료됐거나 이미 썼어요. 비밀번호 재설정을 다시 요청해 주세요.
            </span>
            <Footer type="button" buttonLabel="다시 요청하기" onClick={() => toWelcome("reset-password")} />
          </div>
        }
      >
        <form
          class="flex flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            setLoading(true);
            changePassword(password())
              .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
              .finally(() => setLoading(false));
          }}
        >
          <div class="mt-4 flex flex-col gap-y-3.5">
            <Input
              name="password"
              label="새 비밀번호"
              placeholder="••••••••"
              autocomplete="new-password"
              required
              maxlength={PASSWORD_MAX_LENGTH}
              onInput={(e) => setPassword(e.currentTarget.value)}
            />
            <PasswordRules password={password()} />
            <Show when={error()}>
              <p class="px-1 font-medium text-red-11">{error()}</p>
            </Show>
          </div>
          <Footer
            type="submit"
            buttonLabel="비밀번호 바꾸기"
            variant={loading() ? "loading" : isValidPassword(password()) ? "primary" : "disabled"}
          />
        </form>
      </Show>
    </div>
  );
}
