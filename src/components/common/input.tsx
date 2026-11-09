import type { ComponentProps, JSX } from "@solidjs/web";
import { omit, Show } from "solid-js";
import { cn } from "tailwind-variants";

interface InputProps extends ComponentProps<"input"> {
  label?: string;
  labelClass?: string;
  icon?: (props: ComponentProps<"svg">) => JSX.Element;
}

export function Input(props: InputProps) {
  const rest = omit(props, "class", "label", "labelClass");

  return (
    <label class={cn("flex flex-col gap-y-1.5", props.labelClass)}>
      <Show when={props.label}>
        <span class="ml-1 text-sm font-semibold text-sand-11">{props.label}</span>
      </Show>
      <div class="relative">
        <Show when={props.icon} keyed>
          {(Icon) => (
            <div class="absolute top-1/2 left-4 -translate-y-1/2 cursor-text">
              <Icon class="h-5 w-5 text-sand-9" />
            </div>
          )}
        </Show>
        <input
          {...rest}
          class={cn(
            "w-full rounded-xl border border-sand-4 bg-sand-2 px-4 py-2.75 text-lg caret-amber-9 focus:border-amber-8 focus:ring-2 focus:ring-amber-5 focus:outline-none",
            props.icon && "pl-11",
            props.class,
          )}
        />
      </div>
    </label>
  );
}
