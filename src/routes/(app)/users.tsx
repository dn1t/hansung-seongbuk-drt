import type { RouteDefinition } from "@solidjs/router";
import type { ParentProps } from "solid-js";
import { For, createMemo } from "solid-js";

import { getUsers } from "../../lib/users";
import { paths } from "../../router";

export const route = {
  preload: () => void getUsers(),
} satisfies RouteDefinition;

export default function UsersLayout(props: ParentProps) {
  const users = createMemo(() => getUsers());

  return (
    <main>
      <h1>Users</h1>
      <nav class="users-nav" aria-label="Users">
        <For each={users()}>{(user) => <a href={paths.users(user.id)}>{user.name}</a>}</For>
      </nav>
      {props.children}
    </main>
  );
}
