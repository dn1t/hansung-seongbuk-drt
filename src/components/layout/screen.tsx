import type { ComponentProps, JSX } from "@solidjs/web";
import { For, Show } from "solid-js";
import { env } from "virtual:solid-env/client";

import { PASSWORD_RULES } from "../../lib/password";
import { Button } from "../common/button";

export function Header(props: { title: string; isInitialPage?: boolean; onBackClick?: () => void }) {
  return (
    <div class="px-1">
      <div class="mt-8 h-6.5">
        <Show when={!props.isInitialPage} fallback={<div class="font-bold text-sand-11">{env.VITE_APP_NAME}</div>}>
          <button onClick={() => props.onBackClick?.()}>
            <PhCaretLeft class="text-2xl text-sand-12" />
          </button>
        </Show>
      </div>
      <h1 class="mt-7 mb-2 text-3xl font-bold">{props.title}</h1>
    </div>
  );
}

export function PasswordRules(props: { password: string }) {
  return (
    <div class="flex items-center gap-x-2.5 px-1 text-sm">
      <For each={PASSWORD_RULES}>
        {(rule) => (
          <div
            class={[
              "flex items-center gap-x-1",
              !props.password ? "text-sand-10" : rule.test(props.password) ? "text-green-11" : "text-red-11",
            ]}
          >
            <Show when={!props.password || rule.test(props.password)} fallback={<PhX class="text-xs" />}>
              <PhCheck class="text-xs" />
            </Show>
            <span>{rule.label}</span>
          </div>
        )}
      </For>
    </div>
  );
}

export function Footer(props: {
  type: "submit" | "button";
  onClick?: () => void;
  buttonLabel: string;
  children?: JSX.Element;
  variant?: ComponentProps<typeof Button>["variant"];
}) {
  return (
    <div class="mt-auto px-1 pb-7">
      <Button type={props.type} class="w-full" onClick={props.onClick} variant={props.variant}>
        {props.buttonLabel}
      </Button>
      {props.children}
    </div>
  );
}
