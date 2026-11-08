import type { ComponentProps } from "@solidjs/web";
import { omit } from "solid-js";
import { tv, type VariantProps } from "tailwind-variants";

const button = tv({
  base: "cursor-pointer rounded-xl px-7 py-3.5 font-bold",
  variants: {
    variant: {
      primary: "bg-amber-9 text-[#21201c]",
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
    <button {...rest} class={button({ variant: props.variant, class: props.class as any })}>
      {props.children}
    </button>
  );
}
