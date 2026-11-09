import { Title } from "@solidjs/meta";
import { revalidate, useNavigate } from "@solidjs/router";
import { createMemo, Show } from "solid-js";
import { env } from "virtual:solid-env/client";

import { authClient } from "../../../lib/auth-client";
import { getCurrentSession } from "../../../lib/session";

export default function UsersIndex() {
  const nav = useNavigate();
  const session = createMemo(() => getCurrentSession());

  async function signOut() {
    await authClient.signOut();
    revalidate();
    nav("/welcome", { replace: true });
  }

  return (
    <div class="flex flex-1 flex-col px-5 pb-24">
      <Title>{`준비 중 - ${env.VITE_APP_NAME}`}</Title>
      <p class="mt-8 px-1 font-medium text-sand-11">준비 중인 화면이에요.</p>
      <Show when={session()}>
        {(current) => (
          <p class="mt-6 px-1 text-sm font-medium text-sand-11">
            {current().user.name} 님으로 로그인했어요.{" "}
            <button type="button" class="ml-0.5 cursor-pointer font-semibold text-amber-11" onClick={signOut}>
              로그아웃
            </button>
          </p>
        )}
      </Show>
    </div>
  );
}
