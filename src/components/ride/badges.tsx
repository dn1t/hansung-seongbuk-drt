import { Show } from "solid-js";

export function RouteChip(props: { name: string; quiet?: boolean }) {
  return (
    <span
      class={[
        "inline-flex h-6 shrink-0 items-center rounded-sm px-1.5 text-sm font-bold",
        props.quiet ? "bg-amber-3 text-amber-11" : "bg-amber-9 text-[#21201c]",
      ]}
    >
      {props.name}
    </span>
  );
}

export function SampleBadge() {
  return (
    <span class="inline-flex h-5 shrink-0 items-center rounded-sm bg-sand-3 px-1.5 text-xs font-semibold text-sand-11">
      예시 데이터
    </span>
  );
}

export function SeatCount(props: { riders: number; capacity: number }) {
  const almostFull = () => props.riders / props.capacity >= 0.85;

  return (
    <span class="inline-flex items-center gap-x-1 text-sm font-medium text-sand-11 tabular-nums">
      <PhUsersBold aria-hidden="true" class="text-[13px]" />
      <span>
        {props.riders}/{props.capacity}명
      </span>
      <Show when={almostFull()}>
        <span class="font-semibold text-sand-12">· 거의 찼어요</span>
      </Show>
    </span>
  );
}
