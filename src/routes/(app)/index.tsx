import { Title } from "@solidjs/meta";
import { revalidate, useNavigate } from "@solidjs/router";
import { createMemo, Show } from "solid-js";

import { authClient } from "../../lib/auth-client";
import { getCurrentSession } from "../../lib/session";

export default function Home() {
  const nav = useNavigate();
  const session = createMemo(() => getCurrentSession());

  async function signOut() {
    await authClient.signOut();
    revalidate();
    nav("/welcome", { replace: true });
  }

  return (
    <main>
      <Title>Home - Solid App</Title>
      <h1 class="text-4xl font-bold">Hello Solid!</h1>
      <p>
        Edit <code>src/routes/index.tsx</code> and save to reload.
      </p>
      <Show when={session()}>
        {(current) => (
          <p>
            Signed in as {current().user.name}.{" "}
            <button type="button" onClick={signOut}>
              Sign out
            </button>
          </p>
        )}
      </Show>
      <a href="https://v2.solidjs.com/" target="_blank" rel="noopener noreferrer">
        Learn Solid
      </a>
    </main>
  );
}
