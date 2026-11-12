import { For, Show } from "solid-js";

import type { PlanBusView } from "../../lib/operator";
import { formatClock } from "../../lib/time";
import { RouteChip } from "../ride/badges";

export function BusCard(props: {
  bus: Omit<PlanBusView, "fixed"> & { demoRiders?: number };
  fixed: boolean;
  status?: "확정" | "예상";
  color?: string;
  onToggle?: (open: boolean) => void;
}) {
  const moved = () => props.bus.departs !== props.bus.plannedDeparts;

  return (
    <details
      class="group rounded-xl border border-sand-4 bg-sand-2 open:border-sand-6"
      onToggle={(e) => props.onToggle?.(e.currentTarget.open)}
    >
      <summary class="flex cursor-pointer list-none flex-col gap-y-1.5 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
        <span class="flex items-center gap-x-2">
          <span class="text-lg font-bold tabular-nums">{formatClock(props.bus.departs)}</span>
          <Show when={moved()}>
            <span class="text-sm font-medium text-sand-10 tabular-nums line-through">
              {formatClock(props.bus.plannedDeparts)}
            </span>
          </Show>
          <Show when={props.color}>
            {(color) => (
              <span
                aria-hidden="true"
                class="h-1.5 w-5 shrink-0 rounded-full"
                style={{ "background-color": color() }}
              />
            )}
          </Show>
          <RouteChip name={props.bus.name} quiet />
          <Show when={props.status}>
            {(status) => (
              <span
                class={[
                  "rounded-sm px-1.5 text-xs leading-5 font-semibold",
                  status() === "확정" ? "bg-green-3 text-green-11" : "bg-sand-3 text-sand-11",
                ]}
              >
                {status()}
              </span>
            )}
          </Show>
          <PhCaretDownBold
            aria-hidden="true"
            class="ml-auto text-sm text-sand-10 transition-transform group-open:rotate-180"
          />
        </span>
        <span class="text-sm font-medium text-sand-11 tabular-nums">
          <Show when={props.bus.vehicle > 0}>
            <b class="font-bold text-sand-12">{props.bus.vehicle}호차</b>
            <span class="px-1.5 text-sand-10">·</span>
          </Show>
          {props.bus.riders}/{props.bus.capacity}명
          <Show when={props.bus.demoRiders}>{(demo) => <> (데모 {demo()}명)</>}</Show>
          <Show when={props.fixed}>
            <span class="px-1.5 text-sand-10">·</span>
            탄 학생 {props.bus.boarded}명
          </Show>
          <span class="px-1.5 text-sand-10">·</span>
          정류장 {props.bus.stops.length}곳<span class="px-1.5 text-sand-10">·</span>
          {props.bus.duration}분<span class="px-1.5 text-sand-10">·</span>
          가장 먼 집까지 걸어서 {props.bus.longestWalk}분
        </span>
      </summary>
      <ol class="border-t border-sand-4 px-4 py-3">
        <For each={props.bus.stops} keyed={false}>
          {(stop) => (
            <li class="flex items-center gap-x-3 py-1 text-sm">
              <span class="w-11 shrink-0 font-medium text-sand-11 tabular-nums">{formatClock(stop().at)}</span>
              <span class={["min-w-0 flex-1 break-keep", stop().kind === "board" ? "font-semibold" : "font-medium"]}>
                {stop().name}
              </span>
              <span
                class={[
                  "shrink-0 font-semibold tabular-nums",
                  stop().kind === "board" ? "text-amber-11" : "text-sand-11",
                ]}
              >
                {stop().kind === "board" ? "타요" : "내려요"} {stop().riders}명
              </span>
            </li>
          )}
        </For>
      </ol>
    </details>
  );
}
