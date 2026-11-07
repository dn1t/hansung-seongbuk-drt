import { Title } from "@solidjs/meta";
import type { RouteDefinition } from "@solidjs/router";
import { For, Show, createMemo } from "solid-js";

import { getCurrentUser, getUsers, login, logout } from "../lib/users";

export const route = {
  preload: () => {
    void getCurrentUser();
    void getUsers();
  },
} satisfies RouteDefinition;

export default function Home() {
  const me = createMemo(() => getCurrentUser());
  const users = createMemo(() => getUsers());

  return (
    <main>
      <Title>Home - Solid App</Title>
      <h1 class="text-4xl font-bold">Hello Solid!</h1>
      <p>
        Edit <code>src/routes/index.tsx</code> and save to reload.
      </p>
      {/* The session pillar: login/logout are form actions posting to server
          functions — plain form posts, so they work before hydration too. */}
      <Show
        when={me()}
        fallback={
          <form action={login} method="post">
            <select name="id">
              <For each={users()}>{(user) => <option value={user.id}>{user.name}</option>}</For>
            </select>{" "}
            <button type="submit">Sign in</button>
          </form>
        }
      >
        {(user) => (
          <form action={logout} method="post">
            Signed in as {user().name}. <button type="submit">Sign out</button>
          </form>
        )}
      </Show>
      <a href="https://v2.solidjs.com/" target="_blank" rel="noopener noreferrer">
        Learn Solid
      </a>
    </main>
  );
}
