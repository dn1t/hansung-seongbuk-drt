import type { ComponentProps } from "@solidjs/web";
import { omit, Show } from "solid-js";
import { tv, type VariantProps } from "tailwind-variants";

const button = tv({
  base: "cursor-pointer rounded-xl px-7 py-3.5 font-bold",
  variants: {
    variant: {
      primary: "bg-amber-9 text-[#21201c]",
      loading: "flex cursor-progress items-center justify-center gap-x-2 bg-amber-8 text-[#21201c]",
      disabled: "cursor-not-allowed bg-sand-4 text-sand-9",
    },
  },
  defaultVariants: {
    variant: "primary",
  },
});

interface ButtonProps extends ComponentProps<"button"> {
  variant?: VariantProps<typeof button>["variant"];
}

export function Button(props: ButtonProps) {
  const rest = omit(props, "children", "class");

  return (
    <button
      {...rest}
      disabled={props.disabled || props.variant === "disabled" || props.variant === "loading"}
      class={button({ variant: props.variant, class: props.class as any })}
    >
      <Show when={props.variant === "loading"}>
        <PhCircleNotch class="mt-px animate-spin text-lg" />
      </Show>
      {props.children}
    </button>
  );
}
