import { createMemo, Errored, Loading, Show } from "solid-js";

import { type BookingRoute, getBookingRoute, type MyRoute } from "../../lib/night-routes";
import { formatClock } from "../../lib/time";
import { SectionRule } from "../layout/screen";
import { RouteChip, SeatCount } from "../ride/badges";
import { RouteTimeline, type TimelineRow } from "../ride/route-timeline";

function myRows(route: MyRoute, home: string): TimelineRow[] {
  const board = route.stops[route.board];
  const alight = route.stops[route.alight];
  const passed = route.alight - route.board - 1;
  return [
    { key: "board", name: board.name, mark: "board", time: board.at, tag: "승차", below: "rider" },
    ...(passed > 0
      ? [{ key: "skip", name: `${passed}개 정류장 지나서`, mark: "skip" as const, below: "rider" as const }]
      : []),
    { key: "alight", name: alight.name, mark: "alight", time: alight.at, tag: "하차", below: "walk" },
    { key: "home", name: home, mark: "home", detail: `걸어서 ${route.walkHome}분` },
  ];
}

const routesHref = (data: BookingRoute, slot: string) =>
  `/booking/routes?night=${data.night}&slot=${encodeURIComponent(slot)}`;

export function BookingRouteCard(props: { id: string; home: string }) {
  const data = createMemo(() => getBookingRoute(props.id));

  return (
    <section>
      <SectionRule title="지금 노선" class="mt-8" />
      <Errored
        fallback={(_, reset) => (
          <p class="mt-3 px-1 text-sm font-medium break-keep text-sand-11">
            노선을 불러오지 못했어요.{" "}
            <button type="button" class="cursor-pointer font-semibold text-amber-11" onClick={reset}>
              다시 불러오기
            </button>
          </p>
        )}
      >
        <Loading fallback={<div class="mt-3 h-52 rounded-2xl bg-sand-2" />}>
          <Show when={data()}>
            {(current) => (
              <div class="mt-3 overflow-hidden rounded-2xl border border-sand-4 bg-sand-2">
                <Show
                  when={current().route}
                  fallback={
                    <div class="px-4 py-4">
                      <p class="font-semibold break-keep">
                        {current().closed ? "이 시간 노선에 들어가지 못했어요" : "아직 이 시간에 생긴 노선이 없어요"}
                      </p>
                      <p class="mt-1 text-sm font-medium break-keep text-sand-11">
                        {current().closed
                          ? "오늘 귀가에서 집 근처로 가는 다른 버스를 골라 탈 수 있어요."
                          : `같은 시간에 신청한 학생이 모이면 노선이 생기고, ${formatClock(current().fixesAt)}에 정해져요.`}
                      </p>
                    </div>
                  }
                >
                  {(route) => (
                    <>
                      <div class="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 pt-3.5">
                        <span class="text-lg font-bold tabular-nums">{formatClock(route().departs)}</span>
                        <RouteChip name={route().name} quiet />
                        <Show
                          when={route().fixed}
                          fallback={
                            <span class="rounded-sm bg-sand-3 px-1.5 text-xs leading-5 font-semibold text-sand-11">
                              예상
                            </span>
                          }
                        >
                          <span class="rounded-sm bg-green-3 px-1.5 text-xs leading-5 font-semibold text-green-11">
                            확정
                          </span>
                        </Show>
                        <span class="ml-auto text-sm font-medium text-sand-11">
                          <SeatCount riders={route().riders} capacity={route().capacity} />
                        </span>
                      </div>
                      <Show when={route().slot !== current().slot}>
                        <p class="px-4 pt-1.5 text-sm font-medium break-keep text-sand-11">
                          이 시간에 탈 학생이 적어서 {route().slot} 버스와 합쳐졌어요.
                        </p>
                      </Show>
                      <RouteTimeline onCard class="px-4 pt-3.5 pb-1" rows={myRows(route(), props.home)} />
                      <Show when={!route().fixed}>
                        <p class="px-4 pt-2 pb-3.5 text-sm font-medium break-keep text-sand-11">
                          {formatClock(current().fixesAt)}에 정해져요. 그 전까지는 다른 학생들의 신청에 따라 바뀔 수
                          있어요.
                        </p>
                      </Show>
                    </>
                  )}
                </Show>
                <a
                  href={routesHref(current(), current().route?.slot ?? current().slot)}
                  class="flex items-center justify-between border-t border-sand-4 px-4 py-3 font-semibold active:bg-sand-3"
                >
                  {current().route ? "전체 노선 보기" : "시간대별 노선 보기"}
                  <PhCaretRightBold aria-hidden="true" class="text-sm text-sand-11" />
                </a>
              </div>
            )}
          </Show>
        </Loading>
      </Errored>
    </section>
  );
}
