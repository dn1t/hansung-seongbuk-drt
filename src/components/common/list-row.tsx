import type { JSX } from "@solidjs/web";
import { Show } from "solid-js";

const rowClass = "flex h-13 w-full items-center gap-x-3 pl-4 text-start transition-colors active:bg-sand-3";

export function LinkRow(props: { href: string; icon: JSX.Element; title: string; value?: string; divided?: boolean }) {
  return (
    <li class={props.divided ? "border-t border-sand-4" : undefined}>
      <a href={props.href} class={[rowClass, "pr-3"]}>
        <span aria-hidden="true" class="shrink-0 text-xl text-sand-11">
          {props.icon}
        </span>
        <span class="shrink-0 font-medium">{props.title}</span>
        <span class="min-w-0 flex-1 truncate text-end text-sm text-sand-11 tabular-nums">{props.value}</span>
        <PhCaretRightBold aria-hidden="true" class="shrink-0 text-sm text-sand-8" />
      </a>
    </li>
  );
}

export function ActionRow(props: {
  icon: JSX.Element;
  title: string;
  danger?: boolean;
  divided?: boolean;
  onClick: () => void;
}) {
  return (
    <li class={props.divided ? "border-t border-sand-4" : undefined}>
      <button
        type="button"
        class={[rowClass, "cursor-pointer pr-4 font-medium", props.danger && "text-red-11"]}
        onClick={() => props.onClick()}
      >
        <span aria-hidden="true" class={["shrink-0 text-xl", !props.danger && "text-sand-11"]}>
          {props.icon}
        </span>
        {props.title}
      </button>
    </li>
  );
}

export function SavedNotice(props: { message: string | undefined; class?: string }) {
  return (
    <Show when={props.message}>
      <p role="status" class={["flex items-center gap-x-1.5 px-1 font-semibold text-green-11", props.class]}>
        <PhCheckCircle aria-hidden="true" class="shrink-0" />
        {props.message}
      </p>
    </Show>
  );
}
