import { For } from "solid-js";

import { slotRange } from "../../lib/time";

export function SlotGrid(props: {
  slots: string[];
  selected: string | undefined;
  onSelect: (slot: string) => void;
  closed?: string[];
  routes?: Record<string, number>;
}) {
  return (
    <ul class="grid grid-cols-5 gap-1.5">
      <For each={props.slots}>
        {(slot) => {
          const active = () => props.selected === slot;
          const closed = () => props.closed?.includes(slot) ?? false;
          const routes = () => props.routes?.[slot] ?? 0;
          const note = () =>
            closed()
              ? "마감"
              : props.routes
                ? routes() > 0
                  ? `노선 ${routes()}개`
                  : "노선 없음"
                : `~${slotRange(slot).split("–")[1]}`;
          return (
            <li>
              <button
                type="button"
                aria-pressed={active() ? "true" : "false"}
                aria-label={props.routes || closed() ? `${slotRange(slot)}, ${note()}` : slotRange(slot)}
                disabled={closed()}
                class={[
                  "flex h-15 w-full flex-col items-center justify-center rounded-xl border tabular-nums transition-colors",
                  closed()
                    ? "cursor-not-allowed border-sand-3 bg-transparent text-sand-9"
                    : active()
                      ? "cursor-pointer border-amber-8 bg-amber-3 text-amber-11 ring-2 ring-amber-5"
                      : "cursor-pointer border-sand-3 bg-sand-3",
                ]}
                onClick={() => props.onSelect(slot)}
              >
                <span class="leading-5 font-bold">{slot}</span>
                <span
                  class={[
                    "text-[11px] font-medium",
                    closed() ? "text-sand-9" : active() ? "text-amber-11" : "text-sand-11",
                  ]}
                >
                  {note()}
                </span>
              </button>
            </li>
          );
        }}
      </For>
    </ul>
  );
}
