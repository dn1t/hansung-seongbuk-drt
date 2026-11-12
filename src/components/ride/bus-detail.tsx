import { createMemo, createSignal, Show } from "solid-js";

import { type BusOption, isFull } from "../../lib/ride";
import { formatClock, minutesBetween } from "../../lib/time";
import { SectionRule } from "../layout/screen";
import { SeatCount } from "./badges";
import { RouteMap } from "./route-map";
import { RouteTimeline, routeRows, type TimelineRow } from "./route-timeline";
import { TimeLegs } from "./time-legs";
import { WalkMap } from "./walk-map";

export function BusDetail(props: { option: BusOption; now: number }) {
  const board = () => props.option.stops[props.option.boardIndex];
  const alight = () => props.option.stops[props.option.alightIndex];
  const [expanded, setExpanded] = createSignal(false);
  const hidden = () => props.option.boardIndex + (props.option.stops.length - 1 - props.option.alightIndex);
  const rows = createMemo((): TimelineRow[] => {
    const all = routeRows(props.option);
    if (expanded()) return all;
    const { boardIndex, alightIndex, stops } = props.option;
    const before = boardIndex;
    const after = stops.length - 1 - alightIndex;
    return [
      ...(before > 0
        ? [{ key: "before", name: `앞 정류장 ${before}곳을 거쳐 와요`, mark: "skip" as const, below: "route" as const }]
        : []),
      ...all
        .slice(boardIndex, alightIndex + 1)
        .map((row, i, mine) => (i === mine.length - 1 && after === 0 ? { ...row, below: undefined } : row)),
      ...(after > 0 ? [{ key: "after", name: `뒤로 ${after}곳 더 가요`, mark: "skip" as const }] : []),
    ];
  });

  return (
    <div class="flex flex-col">
      <div class="mt-4 flex items-center justify-between gap-x-3 px-1">
        <SeatCount riders={props.option.riders} capacity={props.option.capacity} full={isFull(props.option)} />
      </div>
      <TimeLegs
        class="mt-3 rounded-xl border border-sand-4"
        walkToStop={props.option.walkToStop}
        wait={minutesBetween(props.now, board().at)}
        ride={minutesBetween(board().at, alight().at)}
        walkHome={props.option.walkHome}
      />
      <SectionRule title="정류장까지 걷기" class="mt-8" />
      <div class="mt-3">
        <WalkMap
          from={{ name: props.option.start.name, lat: props.option.startLat, lng: props.option.startLng }}
          to={board()}
          minutes={props.option.walkToStop}
        />
      </div>
      <SectionRule title="노선" class="mt-8" />
      <RouteMap option={props.option} />
      <RouteTimeline class="mt-4 px-1" rows={rows()} />
      <Show when={hidden() > 0}>
        <button
          type="button"
          aria-expanded={expanded() ? "true" : "false"}
          class="mt-3 flex h-11 w-full cursor-pointer items-center justify-center gap-x-1 rounded-xl bg-sand-3 text-sm font-semibold text-sand-12 active:bg-sand-4"
          onClick={() => setExpanded(!expanded())}
        >
          {expanded() ? "내 구간만 보기" : `전체 노선 펼치기 · 정류장 ${hidden()}곳 더`}
          <PhCaretDownBold
            aria-hidden="true"
            class={["text-xs text-sand-11 transition-transform", expanded() && "rotate-180"]}
          />
        </button>
      </Show>
      <p class="mt-5 px-1 text-sm font-medium break-keep text-sand-11">
        노선은 탑승 1시간 전에 신청한 학생들의 집 방향으로 정해졌어요. 탄 학생이 아무도 내리지 않는 정류장은 지나칠 수
        있어요.
      </p>
    </div>
  );
}

export function busTitle(option: BusOption) {
  return `${option.routeName} ${formatClock(option.stops[option.boardIndex].at)} 버스`;
}
