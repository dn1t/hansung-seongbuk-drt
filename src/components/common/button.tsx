import type { ComponentProps } from "@solidjs/web";
import { omit, Show } from "solid-js";
import { tv, type VariantProps } from "tailwind-variants";

const button = tv({
  base: "flex h-13 cursor-pointer items-center justify-center gap-x-2 rounded-xl px-5 text-center font-bold transition-[background-color,color,scale] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
  variants: {
    variant: {
      primary:
        "bg-amber-9 text-[#21201c] hover:bg-amber-10 active:scale-[0.98] active:bg-amber-10 motion-reduce:active:scale-100",
      loading: "cursor-progress bg-amber-9 text-[#21201c]",
      disabled: "cursor-not-allowed bg-sand-4 text-sand-11",
      secondary: "bg-sand-4 text-sand-12 hover:bg-sand-5 active:scale-[0.98] motion-reduce:active:scale-100",
      danger: "bg-red-9 text-white hover:bg-red-10 active:scale-[0.98] motion-reduce:active:scale-100",
    },
  },
  defaultVariants: {
    variant: "primary",
  },
});

interface ButtonProps extends ComponentProps<"button"> {
  variant?: VariantProps<typeof button>["variant"];
}

const enableIOSActiveState = () => {};

export function Button(props: ButtonProps) {
  const rest = omit(props, "children", "class", "variant");

  return (
    <button
      onTouchStart={enableIOSActiveState}
      {...rest}
      disabled={props.disabled || props.variant === "disabled" || props.variant === "loading"}
      aria-busy={props.variant === "loading" ? "true" : undefined}
      class={button({ variant: props.variant, class: props.class as any })}
    >
      <Show when={props.variant === "loading"}>
        <PhCircleNotchBold aria-hidden="true" class="shrink-0 animate-spin text-lg" />
      </Show>
      <span class="truncate">{props.children}</span>
    </button>
  );
}
