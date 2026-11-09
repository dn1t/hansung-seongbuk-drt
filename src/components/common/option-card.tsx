import type { JSX } from "@solidjs/web";
import { cn } from "tailwind-variants";

export function OptionCard(props: { selected: boolean; onClick: () => void; children: JSX.Element; class?: string }) {
  return (
    <button
      type="button"
      aria-pressed={props.selected ? "true" : "false"}
      class={cn(
        "flex w-full cursor-pointer flex-col gap-y-0.5 rounded-xl border px-4 py-3 text-start transition-colors",
        props.selected ? "border-amber-8 bg-amber-2 ring-2 ring-amber-5" : "border-sand-5 bg-sand-2",
        props.class,
      )}
      onClick={() => props.onClick()}
    >
      {props.children}
    </button>
  );
}
