import type { BusOption } from "../../lib/ride";
import { formatClock, minutesBetween } from "../../lib/time";
import { SectionRule } from "../layout/screen";
import { SampleBadge, SeatCount } from "./badges";
import { RouteTimeline, routeRows } from "./route-timeline";
import { TimeLegs } from "./time-legs";
import { WalkMap } from "./walk-map";

export function BusDetail(props: { option: BusOption; now: number }) {
  const board = () => props.option.stops[props.option.boardIndex];
  const alight = () => props.option.stops[props.option.alightIndex];

  return (
    <div class="flex flex-col">
      <div class="mt-4 flex items-center justify-between gap-x-3 px-1">
        <SeatCount riders={props.option.riders} capacity={props.option.capacity} />
        <SampleBadge />
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
      <RouteTimeline class="mt-4 px-1" rows={routeRows(props.option)} />
      <p class="mt-5 px-1 text-sm font-medium break-keep text-sand-11">
        노선은 사전 신청한 학생들의 집 방향으로 정해졌어요. 오늘은 출발 시간만 바뀔 수 있어요.
      </p>
    </div>
  );
}

export function busTitle(option: BusOption) {
  return `${option.routeName} ${formatClock(option.stops[option.boardIndex].at)} 버스`;
}
