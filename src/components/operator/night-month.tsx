import { createMemo, For, Show } from "solid-js";
import { cn } from "tailwind-variants";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export interface NightCell {
  night: string;
  operating: boolean;
  bookings: number;
  pending: boolean;
}

function monthNights(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1));
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const nights: (string | null)[] = Array.from({ length: first.getUTCDay() }, () => null);
  for (let day = 1; day <= days; day++) nights.push(new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10));
  return nights;
}

export function NightMonth(props: {
  year: number;
  month: number;
  today: string;
  cell: (night: string) => NightCell;
  onToggle: (cell: NightCell) => void;
}) {
  const nights = createMemo(() => monthNights(props.year, props.month));

  return (
    <section aria-label={`${props.year}년 ${props.month + 1}월`}>
      <h3 class="px-1 font-bold tabular-nums">
        {props.year}년 {props.month + 1}월
      </h3>
      <div class="mt-3 grid grid-cols-7 gap-1 pb-1">
        <For each={WEEKDAYS}>
          {(weekday) => <span class="text-center text-xs font-medium text-sand-10">{weekday}</span>}
        </For>
      </div>
      <ul class="grid grid-cols-7 gap-1">
        <For each={nights()}>
          {(night) => (
            <li>
              <Show when={night} fallback={<span class="block h-13" />}>
                {(value) => {
                  const cell = () => props.cell(value());
                  const past = () => value() < props.today;
                  const day = () => Number(value().slice(8));
                  return (
                    <button
                      type="button"
                      disabled={past()}
                      aria-pressed={cell().operating ? "true" : "false"}
                      aria-label={`${props.month + 1}월 ${day()}일${cell().operating ? ", 운행" : ""}${cell().bookings > 0 ? `, 신청 ${cell().bookings}명` : ""}${value() === props.today ? ", 오늘" : ""}`}
                      class={cn(
                        "relative flex h-13 w-full flex-col items-center justify-center rounded-xl border tabular-nums transition-colors",
                        past() && "cursor-default border-transparent",
                        past() && (cell().operating ? "bg-sand-3 text-sand-11" : "text-sand-8"),
                        !past() &&
                          !cell().operating &&
                          "cursor-pointer border-sand-4 hover:border-sand-6 hover:bg-sand-2",
                        !past() &&
                          cell().operating &&
                          "cursor-pointer border-amber-8 bg-amber-3 font-bold text-amber-11 hover:bg-amber-4",
                        cell().pending && "opacity-60",
                      )}
                      onClick={() => props.onToggle(cell())}
                    >
                      <span
                        class={["leading-5", value() === props.today && "underline decoration-2 underline-offset-4"]}
                      >
                        {day()}
                      </span>
                      <Show when={cell().bookings > 0}>
                        <span class="text-[11px] leading-3.5 font-semibold">{cell().bookings}명</span>
                      </Show>
                    </button>
                  );
                }}
              </Show>
            </li>
          )}
        </For>
      </ul>
    </section>
  );
}
