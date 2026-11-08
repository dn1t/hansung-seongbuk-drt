import type { ComponentProps } from "@solidjs/web";
import { For, Show } from "solid-js";
import { cn } from "tailwind-variants";

interface SelectProps extends ComponentProps<"select"> {
  options: Record<string, string> | string[];
}

export function Select(props: SelectProps) {
  return (
    <select
      {...props}
      class={cn(
        "h-max appearance-none rounded-xl border border-sand-4 bg-sand-2 px-4 py-2.75 text-lg focus:border-amber-8 focus:ring-2 focus:ring-amber-5 focus:outline-none",
        props.class,
      )}
    >
      <Show
        when={Array.isArray(props.options)}
        fallback={
          <For each={Object.entries(props.options)}>{([value, label]) => <option value={value}>{label}</option>}</For>
        }
      >
        <For each={props.options as string[]}>{(value) => <option value={value}>{value}</option>}</For>
      </Show>
    </select>
  );
}
