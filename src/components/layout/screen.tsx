import type { ComponentProps, JSX } from "@solidjs/web";
import { For, Repeat, Show } from "solid-js";
import { env } from "virtual:solid-env/client";

import { PASSWORD_RULES } from "../../lib/password";
import { Button } from "../common/button";

export function Wordmark() {
  return (
    <span class="rounded-sm bg-sand-12 px-1.5 text-[13px] leading-5 font-bold tracking-[0.06em] text-sand-1">
      {env.VITE_APP_NAME}
    </span>
  );
}

export function Header(props: {
  title: string;
  description?: string;
  isInitialPage?: boolean;
  onBackClick?: () => void;
  step?: { current: number; total: number };
}) {
  return (
    <div class="mb-2 px-1">
      <div class="mt-8 flex h-6.5 items-center justify-between">
        <Show when={!props.isInitialPage} fallback={<Wordmark />}>
          <button
            type="button"
            aria-label="뒤로 가기"
            class="-m-2.5 cursor-pointer rounded-full p-2.5 transition-colors active:bg-sand-3"
            onClick={() => props.onBackClick?.()}
          >
            <PhCaretLeft class="text-2xl text-sand-12" />
          </button>
        </Show>
        <Show when={props.step}>
          {(step) => (
            <div>
              <span class="sr-only">
                {step().total}단계 중 {step().current}단계
              </span>
              <RouteDots current={step().current} total={step().total} />
            </div>
          )}
        </Show>
      </div>
      <Show when={props.title}>
        <h1 class="mt-7 text-3xl font-bold text-balance break-keep">{props.title}</h1>
      </Show>
      <Show when={props.description}>
        <p class="mt-2 font-medium text-balance break-keep text-sand-11">{props.description}</p>
      </Show>
    </div>
  );
}

export function RouteDots(props: { current: number; total: number; spacing?: "tight" | "wide" }) {
  return (
    <div aria-hidden="true" class="flex items-center">
      <Repeat count={props.total}>
        {(i) => {
          const stop = i + 1;
          const isHome = () => stop === props.total;
          const isCurrent = () => stop === props.current;
          const reached = () => stop <= props.current;
          return (
            <>
              <Show when={i > 0}>
                <span
                  class={["h-0.5", props.spacing === "wide" ? "w-6" : "w-3.5", reached() ? "bg-amber-9" : "bg-sand-6"]}
                />
              </Show>
              <Show
                when={!isHome()}
                fallback={<PhHouseFill class={["ml-0.5 text-[15px]", reached() ? "text-amber-9" : "text-sand-7"]} />}
              >
                <span
                  class={[
                    "rounded-full",
                    isCurrent()
                      ? "size-2.5 bg-amber-9 ring-[3px] ring-amber-5"
                      : reached()
                        ? "size-2 bg-amber-9"
                        : "size-2 border-[1.5px] border-sand-7",
                  ]}
                />
              </Show>
            </>
          );
        }}
      </Repeat>
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
    <div class="mt-auto pt-6 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
      <Button type={props.type} class="w-full" onClick={props.onClick} variant={props.variant}>
        {props.buttonLabel}
      </Button>
      {props.children}
    </div>
  );
}
