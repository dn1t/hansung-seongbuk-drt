import { Title } from "@solidjs/meta";
import { type RouteDefinition, type RouteProps } from "@solidjs/router";
import { Show, createMemo, isPending } from "solid-js";

import { getCurrentUser, getUser, renameUser } from "../../../lib/users";

export const route = {
  preload: ({ params }) => {
    void getUser(params.id!);
    void getCurrentUser();
  },
} satisfies RouteDefinition;

export default function User(props: RouteProps<"/users/:id">) {
  const user = createMemo(() => getUser(props.params.id));
  const me = createMemo(() => getCurrentUser());

  return (
    <section style={{ opacity: isPending(user) ? 0.5 : 1 }}>
      <Title>{`User ${props.params.id} - Solid App`}</Title>
      <h2>{user().name}</h2>
      <p>{user().title}</p>
      <Show when={me()} fallback={<p>Sign in on the home page to rename users.</p>}>
        <form action={renameUser.with(props.params.id!)} method="post">
          <input name="name" value={user().name} required />
          <button type="submit">Rename</button>
        </form>
      </Show>
    </section>
  );
}
