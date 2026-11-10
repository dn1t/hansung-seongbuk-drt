import { Title } from "@solidjs/meta";
import { revalidate, useNavigate } from "@solidjs/router";
import { createMemo, createSignal, Loading, Show } from "solid-js";
import { env } from "virtual:solid-env/client";

import { Input } from "../../../components/common/input";
import { Footer, Header } from "../../../components/layout/screen";
import { NAME_MAX_LENGTH } from "../../../lib/account";
import { authClient } from "../../../lib/auth-client";
import { getProfile } from "../../../lib/profile";
import { revalidateSession } from "../../../lib/session";

export default function EditName() {
  const nav = useNavigate();
  const profile = createMemo(() => getProfile());
  const [name, setName] = createSignal<string>();
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal("");
  const value = () => (name() ?? profile().name).trim();
  const ready = () => value() !== "" && value() !== profile().name;

  async function save() {
    setError("");
    setSaving(true);
    try {
      const { error } = await authClient.updateUser({ name: value() });
      if (error) throw new Error("이름을 바꾸지 못했어요. 다시 시도해 주세요.");
      revalidate(getProfile.key);
      revalidateSession();
      nav("/me?saved=name", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "이름을 바꾸지 못했어요. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div class="flex flex-1 flex-col px-5">
      <Title>{`이름 바꾸기 - ${env.VITE_APP_NAME}`}</Title>
      <Header title="이름을 바꿔요" description="내 QR 카드에 이 이름이 보여요." onBackClick={() => nav("/me")} />
      <Loading fallback={<div class="flex-1" />}>
        <form
          class="flex flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div class="mt-4 flex flex-col gap-y-3.5">
            <Input
              type="text"
              name="name"
              label="이름"
              autocomplete="name"
              required
              maxlength={NAME_MAX_LENGTH}
              value={profile().name}
              onInput={(e) => setName(e.currentTarget.value)}
            />
            <Show when={error()}>
              <p class="px-1 font-medium break-keep text-red-11">{error()}</p>
            </Show>
          </div>
          <Footer type="submit" buttonLabel="저장" variant={saving() ? "loading" : ready() ? "primary" : "disabled"} />
        </form>
      </Loading>
    </div>
  );
}
