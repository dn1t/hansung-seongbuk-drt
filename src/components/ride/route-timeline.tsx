import { For, Match, Show, Switch } from "solid-js";
import { cn } from "tailwind-variants";

import type { BusOption } from "../../lib/ride";
import { formatClock } from "../../lib/time";

type Mark = "board" | "alight" | "rider" | "route" | "start" | "home" | "bus" | "skip";
type Segment = "rider" | "route" | "walk";

export interface TimelineRow {
  key: string;
  name: string;
  mark: Mark;
  time?: number;
  tag?: "승차" | "하차";
  detail?: string;
  below?: Segment;
}

function segmentAfter(ride: BusOption, index: number): Segment | undefined {
  if (index === ride.alightIndex) return "walk";
  if (index >= ride.stops.length - 1) return undefined;
  return index >= ride.boardIndex && index < ride.alightIndex ? "rider" : "route";
}

function stopMark(ride: BusOption, index: number): Mark {
  if (index === ride.boardIndex) return "board";
  if (index === ride.alightIndex) return "alight";
  return index > ride.boardIndex && index < ride.alightIndex ? "rider" : "route";
}

export function tripRows(ride: BusOption): TimelineRow[] {
  const board = ride.stops[ride.boardIndex];
  const alight = ride.stops[ride.alightIndex];
  const skipped = ride.alightIndex - ride.boardIndex - 1;
  return [
    { key: "start", name: ride.start.name, mark: "start", detail: `걸어서 ${ride.walkToStop}분`, below: "walk" },
    { key: board.id, name: board.name, mark: "board", time: board.at, tag: "승차", below: "rider" },
    ...(skipped > 0
      ? [{ key: "skip", name: `${skipped}개 정류장 지나서`, mark: "skip" as const, below: "rider" as const }]
      : []),
    { key: alight.id, name: alight.name, mark: "alight", time: alight.at, tag: "하차", below: "walk" },
    { key: "home", name: "집", mark: "home", detail: `걸어서 ${ride.walkHome}분` },
  ];
}

export function routeRows(ride: BusOption): TimelineRow[] {
  return ride.stops.map((stop, i) => ({
    key: stop.id,
    name: stop.name,
    mark: stopMark(ride, i),
    time: stop.at,
    tag: i === ride.boardIndex ? "승차" : i === ride.alightIndex ? "하차" : undefined,
    detail:
      i === ride.boardIndex
        ? `${ride.start.name}에서 걸어서 ${ride.walkToStop}분`
        : i === ride.alightIndex
          ? `집까지 걸어서 ${ride.walkHome}분`
          : undefined,
    below: i === ride.alightIndex ? (i < ride.stops.length - 1 ? "route" : undefined) : segmentAfter(ride, i),
  }));
}

export function ridingRows(ride: BusOption, now: number): TimelineRow[] {
  const next = ride.stops.findIndex((s, i) => i > ride.boardIndex && s.at > now);
  const from = next === -1 ? ride.alightIndex : Math.min(next, ride.alightIndex);
  const ahead = ride.stops.slice(from, ride.alightIndex + 1).map((stop, offset) => {
    const i = from + offset;
    const isAlight = i === ride.alightIndex;
    return {
      key: stop.id,
      name: stop.name,
      mark: isAlight ? ("alight" as const) : ("rider" as const),
      time: stop.at,
      tag: isAlight ? ("하차" as const) : undefined,
      below: isAlight ? ("walk" as const) : ("rider" as const),
    };
  });
  return [
    { key: "bus", name: "지금 버스 위치", mark: "bus", below: "rider" },
    ...ahead,
    { key: "home", name: "집", mark: "home", detail: `걸어서 ${ride.walkHome}분` },
  ];
}

export function RouteTimeline(props: { rows: TimelineRow[]; onCard?: boolean; class?: string }) {
  const hollow = () => (props.onCard ? "bg-sand-2" : "bg-sand-1");

  return (
    <ol class={props.class}>
      <For each={props.rows}>
        {(row) => (
          <li class="relative flex gap-x-3 pb-3.5 last:pb-0">
            <Show when={row.below}>
              {(below) => (
                <span
                  aria-hidden="true"
                  class={cn(
                    "absolute top-3 -bottom-3 left-[7px]",
                    below() === "walk" ? "w-0 border-l-2 border-dotted border-sand-8" : "w-0.5",
                    below() === "rider" && "bg-amber-9",
                    below() === "route" && "bg-sand-6",
                  )}
                />
              )}
            </Show>
            <span aria-hidden="true" class="relative flex h-6 w-4 shrink-0 items-center justify-center">
              <Switch>
                <Match when={row.mark === "board" || row.mark === "alight"}>
                  <span class="size-3 rounded-full bg-amber-9" />
                </Match>
                <Match when={row.mark === "bus"}>
                  <span class="size-2.5 rounded-full bg-amber-9 ring-[3px] ring-amber-5" />
                </Match>
                <Match when={row.mark === "rider"}>
                  <span class={cn("size-2 rounded-full border-2 border-amber-9", hollow())} />
                </Match>
                <Match when={row.mark === "route"}>
                  <span class={cn("size-2 rounded-full border-[1.5px] border-sand-7", hollow())} />
                </Match>
                <Match when={row.mark === "start"}>
                  <span class="size-2 rounded-full bg-sand-8" />
                </Match>
                <Match when={row.mark === "home"}>
                  <PhHouseFill class="text-[15px] text-sand-11" />
                </Match>
              </Switch>
            </span>
            <div class="flex min-w-0 flex-1 flex-col">
              <div class="flex min-h-6 items-center gap-x-2">
                <span
                  class={cn(
                    "break-keep",
                    (row.mark === "board" || row.mark === "alight" || row.mark === "bus") && "font-bold",
                    row.mark === "rider" && "font-medium",
                    (row.mark === "route" || row.mark === "start" || row.mark === "home") && "text-sand-11",
                    row.mark === "skip" && "text-sm font-medium text-sand-11",
                  )}
                >
                  {row.name}
                </span>
                <Show when={row.tag}>
                  <span class="shrink-0 text-sm font-bold text-amber-11">{row.tag}</span>
                </Show>
                <Show when={row.time}>
                  {(time) => (
                    <span
                      class={cn(
                        "ml-auto shrink-0 pl-2 text-sm tabular-nums",
                        row.tag ? "font-bold text-sand-12" : "font-medium text-sand-11",
                      )}
                    >
                      {formatClock(time())}
                    </span>
                  )}
                </Show>
              </div>
              <Show when={row.detail}>
                <span class="text-sm break-keep text-sand-11">{row.detail}</span>
              </Show>
            </div>
          </li>
        )}
      </For>
    </ol>
  );
}
