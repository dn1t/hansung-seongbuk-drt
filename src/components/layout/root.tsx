import { useLocation } from "@solidjs/router";
import type { JSX } from "@solidjs/web";
import { Show } from "solid-js";

import { TabBar } from "./tab-bar";

const FULLSCREEN_PATHS = ["/welcome", "/reset-password"];
const FULLSCREEN_PREFIXES = ["/today/"];

const isFullscreen = (pathname: string) =>
  FULLSCREEN_PATHS.includes(pathname) || FULLSCREEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));

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
      <Show when={!isFullscreen(loc.pathname)}>
        <TabBar />
      </Show>
    </div>
  );
}
