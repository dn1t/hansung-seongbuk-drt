import type { RouteDefinition, RouteSectionProps } from "@solidjs/router";
import { createMemo, Show } from "solid-js";

import { requireSession } from "../lib/session";

export const route = {
  preload: () => void requireSession(),
} satisfies RouteDefinition;

export default function AppLayout(props: RouteSectionProps) {
  const session = createMemo(() => requireSession());

  return <Show when={session()}>{props.children}</Show>;
}
