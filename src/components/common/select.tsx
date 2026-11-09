import type { ComponentProps } from "@solidjs/web";
import { For, Show } from "solid-js";
import { cn } from "tailwind-variants";

interface SelectProps extends ComponentProps<"select"> {
  options: Record<string, string> | string[];
}

export function Select(props: SelectProps) {
  return (
    <div class="relative flex min-w-0 flex-1">
      <select
        {...props}
        class={cn(
          "h-max w-full cursor-pointer appearance-none truncate rounded-xl border border-sand-5 bg-sand-2 py-2.75 pr-10 pl-4 text-lg focus:border-amber-8 focus:ring-2 focus:ring-amber-5 focus:outline-none",
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
      <PhCaretDownBold
        aria-hidden="true"
        class="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm text-sand-11"
      />
    </div>
  );
}
