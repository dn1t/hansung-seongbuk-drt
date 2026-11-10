import { Title } from "@solidjs/meta";
import { useNavigate } from "@solidjs/router";
import { createSignal, Show } from "solid-js";
import { env } from "virtual:solid-env/client";

import { Input } from "../../../components/common/input";
import { Footer, Header, PasswordRules } from "../../../components/layout/screen";
import { authClient } from "../../../lib/auth-client";
import { isValidPassword, PASSWORD_MAX_LENGTH } from "../../../lib/password";

export default function EditPassword() {
  const nav = useNavigate();
  const [current, setCurrent] = createSignal("");
  const [next, setNext] = createSignal("");
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal("");
  const ready = () => current() !== "" && isValidPassword(next());

  async function save() {
    setError("");
    setSaving(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword: current(),
        newPassword: next(),
        revokeOtherSessions: true,
      });
      if (error) {
        if (error.code === "INVALID_PASSWORD") throw new Error("지금 비밀번호가 맞지 않아요.");
        if (error.code === "WEAK_PASSWORD") throw new Error("새 비밀번호 조건을 확인해 주세요.");
        if (error.status === 429) throw new Error("요청이 너무 많아요. 잠시 후 다시 시도해 주세요.");
        throw new Error("비밀번호를 바꾸지 못했어요. 다시 시도해 주세요.");
      }
      nav("/me?saved=password", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "비밀번호를 바꾸지 못했어요. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div class="flex flex-1 flex-col px-5">
      <Title>{`비밀번호 바꾸기 - ${env.VITE_APP_NAME}`}</Title>
      <Header
        title="비밀번호를 바꿔요"
        description="바꾸면 다른 기기에서는 로그아웃돼요."
        onBackClick={() => nav("/me")}
      />
      <form
        class="flex flex-1 flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div class="mt-4 flex flex-col gap-y-3.5">
          <Input
            type="password"
            name="current-password"
            label="지금 비밀번호"
            placeholder="••••••••"
            autocomplete="current-password"
            required
            onInput={(e) => setCurrent(e.currentTarget.value)}
          />
          <Input
            name="new-password"
            label="새 비밀번호"
            placeholder="••••••••"
            labelClass="mt-1.5"
            autocomplete="new-password"
            required
            maxlength={PASSWORD_MAX_LENGTH}
            onInput={(e) => setNext(e.currentTarget.value)}
          />
          <PasswordRules password={next()} />
          <Show when={error()}>
            <p class="px-1 font-medium break-keep text-red-11">{error()}</p>
          </Show>
        </div>
        <Footer
          type="submit"
          buttonLabel="비밀번호 바꾸기"
          variant={saving() ? "loading" : ready() ? "primary" : "disabled"}
        />
      </form>
    </div>
  );
}
