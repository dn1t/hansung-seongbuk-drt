import { For } from "solid-js";

import { slotRange } from "../../lib/time";

export function SlotGrid(props: { slots: string[]; selected: string | undefined; onSelect: (slot: string) => void }) {
  return (
    <ul class="grid grid-cols-5 gap-1.5">
      <For each={props.slots}>
        {(slot) => {
          const active = () => props.selected === slot;
          return (
            <li>
              <button
                type="button"
                aria-pressed={active() ? "true" : "false"}
                aria-label={slotRange(slot)}
                class={[
                  "flex h-15 w-full cursor-pointer flex-col items-center justify-center rounded-xl border tabular-nums transition-colors",
                  active() ? "border-amber-8 bg-amber-3 text-amber-11 ring-2 ring-amber-5" : "border-sand-3 bg-sand-3",
                ]}
                onClick={() => props.onSelect(slot)}
              >
                <span class="leading-5 font-bold">{slot}</span>
                <span class={["text-[11px] font-medium", active() ? "text-amber-11" : "text-sand-11"]}>
                  ~{slotRange(slot).split("–")[1]}
                </span>
              </button>
            </li>
          );
        }}
      </For>
    </ul>
  );
}
