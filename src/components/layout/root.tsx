import { useLocation } from "@solidjs/router";
import type { JSX } from "@solidjs/web";
import { Show } from "solid-js";

import { TabBar } from "./tab-bar";

const TAB_PATHS = ["/", "/booking", "/qr", "/me"];

const isOperator = (pathname: string) => pathname === "/operator" || pathname.startsWith("/operator/");

export function Root(props: { children: JSX.Element }) {
  const loc = useLocation();

  return (
    <Show when={!isOperator(loc.pathname)} fallback={<main class="min-h-dvh select-auto">{props.children}</main>}>
      <div class="mx-auto w-full max-w-xl">
        <div class="fixed top-0 bottom-0">
          <div class="relative -left-px h-full w-px bg-sand-3" />
        </div>
        <main class="flex h-full min-h-dvh flex-col select-auto">{props.children}</main>
        <div class="fixed top-0 bottom-0">
          <div class="relative left-(--container-xl) h-full w-px bg-sand-3" />
        </div>
        <Show when={TAB_PATHS.includes(loc.pathname)}>
          <TabBar />
        </Show>
      </div>
    </Show>
  );
}
