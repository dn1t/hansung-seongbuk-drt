import { Title } from "@solidjs/meta";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { createMemo, For, Loading, Show } from "solid-js";
import { env } from "virtual:solid-env/client";

import { Header } from "../../../../components/layout/screen";
import { RouteChip, SampleBadge, SeatCount } from "../../../../components/ride/badges";
import { TimeLegs } from "../../../../components/ride/time-legs";
import { getBusOptions } from "../../../../lib/ride";
import { FLOW_TOTAL_STEPS, flowHref } from "../../../../lib/ride-flow";
import { formatClock, minutesBetween } from "../../../../lib/time";

export default function TodayBuses() {
  const nav = useNavigate();
  const [params] = useSearchParams<{ start?: string; from?: string; to?: string }>();
  const data = createMemo(() => getBusOptions(params.start ?? "", params.from ?? "", params.to ?? ""));

  return (
    <div class="flex flex-1 flex-col px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
      <Title>{`버스 고르기 - ${env.VITE_APP_NAME}`}</Title>
      <Header
        title="탈 버스를 골라요"
        description="타는 시간이 이른 순서예요."
        step={{ current: 3, total: FLOW_TOTAL_STEPS }}
        onBackClick={() => nav(flowHref("/today/time", { ...params }))}
      />
      <Loading fallback={<div class="flex-1" />}>
        <Show
          when={data()}
          fallback={
            <Notice
              text="출발할 곳이나 시간대를 다시 골라 주세요."
              action="처음부터 고르기"
              href={flowHref("/today/start", {})}
            />
          }
        >
          {(result) => (
            <>
              <div class="mt-4 flex items-center justify-between gap-x-3 px-1">
                <span class="text-sm font-semibold break-keep text-sand-11 tabular-nums">
                  {result().start.name} · {formatClock(result().range.from)}–{formatClock(result().range.to)}
                </span>
                <SampleBadge />
              </div>
              <Show
                when={result().options.length > 0}
                fallback={
                  <Notice
                    text="이 시간대에는 탈 수 있는 버스가 없어요."
                    action="시간대 바꾸기"
                    href={flowHref("/today/time", { ...params })}
                  />
                }
              >
                <ul class="mt-3 flex flex-col gap-y-2">
                  <For each={result().options}>
                    {(option) => {
                      const board = () => option.stops[option.boardIndex];
                      const alight = () => option.stops[option.alightIndex];
                      return (
                        <li>
                          <a
                            href={flowHref(`/today/buses/${option.busId}`, { ...params })}
                            class="block overflow-hidden rounded-xl border border-sand-5 bg-sand-2 transition-colors active:bg-sand-3"
                          >
                            <div class="flex items-center gap-x-2 px-4 pt-3.5">
                              <span class="text-xl font-bold tabular-nums">{formatClock(board().at)}</span>
                              <span class="text-sm font-semibold text-sand-11">승차</span>
                              <span class="ml-auto">
                                <RouteChip name={option.routeName} quiet />
                              </span>
                              <PhCaretRightBold aria-hidden="true" class="-mr-1 text-sm text-sand-8" />
                            </div>
                            <p class="mt-0.5 px-4 text-sm font-medium break-keep text-sand-11">
                              {board().name}에서 타서 {alight().name}에서 내려요
                            </p>
                            <TimeLegs
                              class="mt-3 border-t border-sand-4"
                              inset="pl-4"
                              walkToStop={option.walkToStop}
                              wait={minutesBetween(result().now, board().at)}
                              ride={minutesBetween(board().at, alight().at)}
                              walkHome={option.walkHome}
                            />
                            <div class="border-t border-sand-4 px-4 py-2.5">
                              <SeatCount riders={option.riders} capacity={option.capacity} />
                            </div>
                          </a>
                        </li>
                      );
                    }}
                  </For>
                </ul>
              </Show>
            </>
          )}
        </Show>
      </Loading>
    </div>
  );
}

function Notice(props: { text: string; action: string; href: string }) {
  return (
    <div class="mt-4 flex flex-col gap-y-2 px-1">
      <p class="font-medium break-keep text-sand-11">{props.text}</p>
      <a href={props.href} class="flex w-max items-center gap-x-0.5 font-semibold text-amber-11">
        {props.action}
        <PhCaretRightBold aria-hidden="true" class="text-sm" />
      </a>
    </div>
  );
}
