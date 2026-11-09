import type { ComponentProps } from "@solidjs/web";
import { omit, Show } from "solid-js";
import { tv, type VariantProps } from "tailwind-variants";

const button = tv({
  slots: {
    base: "group flex h-13 cursor-pointer items-center justify-between gap-x-3 rounded-xl pr-4.5 pl-5 text-start font-bold transition-[background-color,color,scale] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
    arrow: "shrink-0 text-lg transition-[color,translate] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
  },
  variants: {
    variant: {
      primary: {
        base: "bg-amber-9 text-[#21201c] hover:bg-amber-10 active:scale-[0.98] active:bg-amber-10 motion-reduce:active:scale-100",
        arrow: "group-hover:translate-x-0.5 group-active:translate-x-1 motion-reduce:translate-x-0",
      },
      loading: {
        base: "cursor-progress bg-amber-9 text-[#21201c]",
      },
      disabled: {
        base: "cursor-not-allowed bg-sand-4 text-sand-11",
        arrow: "text-sand-8",
      },
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
  const styles = () => button({ variant: props.variant });

  return (
    <button
      onTouchStart={enableIOSActiveState}
      {...rest}
      disabled={props.disabled || props.variant === "disabled" || props.variant === "loading"}
      aria-busy={props.variant === "loading" ? "true" : undefined}
      class={styles().base({ class: props.class as any })}
    >
      <span class="truncate">{props.children}</span>
      <Show
        when={props.variant === "loading"}
        fallback={<PhArrowRightBold aria-hidden="true" class={styles().arrow()} />}
      >
        <PhCircleNotchBold aria-hidden="true" class="shrink-0 animate-spin text-lg" />
      </Show>
    </button>
  );
}
