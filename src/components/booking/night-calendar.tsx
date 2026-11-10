import { createMemo, For, Show } from "solid-js";
import { cn } from "tailwind-variants";

const DAY = 24 * 60 * 60_000;
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

interface Cell {
  night: string;
  day: number;
  month: number;
  showMonth: boolean;
}

function toNight(time: number) {
  return new Date(time).toISOString().slice(0, 10);
}

export function NightCalendar(props: {
  open: string[];
  booked: string[];
  selected: string[];
  onToggle: (night: string) => void;
}) {
  const cells = createMemo(() => {
    if (props.open.length === 0) return [];
    const first = Date.parse(`${props.open[0]}T00:00:00Z`);
    const last = Date.parse(`${props.open.at(-1)}T00:00:00Z`);
    const start = first - new Date(first).getUTCDay() * DAY;
    const end = last + (6 - new Date(last).getUTCDay()) * DAY;
    const result: Cell[] = [];
    for (let time = start; time <= end; time += DAY) {
      const date = new Date(time);
      result.push({
        night: toNight(time),
        day: date.getUTCDate(),
        month: date.getUTCMonth() + 1,
        showMonth: time === start || date.getUTCDate() === 1,
      });
    }
    return result;
  });

  return (
    <div>
      <div class="grid grid-cols-7 gap-1.5 pb-1.5">
        <For each={WEEKDAYS}>
          {(weekday) => <span class="text-center text-xs font-medium text-sand-10">{weekday}</span>}
        </For>
      </div>
      <ul class="grid grid-cols-7 gap-1.5">
        <For each={cells()}>
          {(cell) => {
            const open = () => props.open.includes(cell.night);
            const selected = () => props.selected.includes(cell.night);
            const booked = () => props.booked.includes(cell.night);
            return (
              <li>
                <button
                  type="button"
                  disabled={!open()}
                  aria-pressed={open() ? (selected() ? "true" : "false") : undefined}
                  aria-label={`${cell.month}월 ${cell.day}일${booked() ? ", 신청함" : ""}${open() ? "" : ", 운행 안 함"}`}
                  class={cn(
                    "relative flex h-12 w-full flex-col items-center justify-center rounded-xl border tabular-nums transition-colors",
                    !open() && "cursor-default border-transparent text-sand-8",
                    open() && !selected() && "cursor-pointer border-sand-3 bg-sand-3 font-semibold",
                    selected() &&
                      "cursor-pointer border-amber-8 bg-amber-3 font-bold text-amber-11 ring-2 ring-amber-5",
                  )}
                  onClick={() => props.onToggle(cell.night)}
                >
                  <Show when={cell.showMonth}>
                    <span class="text-[10px] leading-3 font-semibold">{cell.month}월</span>
                  </Show>
                  <span class="leading-5">{cell.day}</span>
                  <Show when={booked()}>
                    <span
                      aria-hidden="true"
                      class={cn("absolute bottom-1.5 size-1 rounded-full", selected() ? "bg-amber-11" : "bg-amber-9")}
                    />
                  </Show>
                </button>
              </li>
            );
          }}
        </For>
      </ul>
    </div>
  );
}
