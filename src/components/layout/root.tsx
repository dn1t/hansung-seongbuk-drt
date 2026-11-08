import { useLocation } from "@solidjs/router";
import type { JSX } from "@solidjs/web";
import { Show } from "solid-js";

import { TabBar } from "./tab-bar";

export function Root(props: { children: JSX.Element }) {
  const loc = useLocation();

  return (
    <div class="mx-auto w-full max-w-xl">
      <div class="fixed top-0 bottom-0">
        <div class="relative -left-px h-full w-px bg-sand-3" />
      </div>
      <main class="flex h-full min-h-dvh flex-col select-auto">{props.children}</main>
      <div class="fixed top-0 bottom-0">
        <div class="relative left-(--container-xl) h-full w-px bg-sand-3" />
      </div>
      <Show when={loc.pathname !== "/welcome"}>
        <TabBar />
      </Show>
    </div>
  );
}
