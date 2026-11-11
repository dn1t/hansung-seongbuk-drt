import { Title } from "@solidjs/meta";
import { useNavigate } from "@solidjs/router";
import type { JSX } from "@solidjs/web";
import { createMemo, createSignal, Errored, For, Loading, Match, onSettled, Show, Switch } from "solid-js";
import { env } from "virtual:solid-env/client";

import { Footer, RouteDots } from "../../components/layout/screen";
import { RouteChip, SeatCount } from "../../components/ride/badges";
import { createTickingNow } from "../../components/ride/clock";
import { RouteTimeline, ridingRows, tripRows } from "../../components/ride/route-timeline";
import { TimeLegs } from "../../components/ride/time-legs";
import { getTonight, refreshTonight, type RideState, type Tonight } from "../../lib/ride";
import { flowHref } from "../../lib/ride-flow";
import { formatClock, formatMinutes, formatNight, minutesBetween, withDirectionParticle } from "../../lib/time";

type StateOf<K extends Tonight["kind"]> = Extract<Tonight, { kind: K }>;

export default function Home() {
  const nav = useNavigate();
  const tonight = createMemo(() => getTonight());
  const [latest, setLatest] = createSignal<Tonight>();
  const stateOf = <K extends Tonight["kind"]>(kind: K) => {
    const current = latest() ?? tonight();
    return current.kind === kind ? (current as StateOf<K>) : undefined;
  };

  onSettled(() => {
    const timer = setInterval(() => {
      refreshTonight()
        .then((next) => setLatest(next))
        .catch(() => undefined);
    }, 60_000);
    return () => clearInterval(timer);
  });

  return (
    <div class="flex flex-1 flex-col px-5 pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <Title>{`오늘 귀가 - ${env.VITE_APP_NAME}`}</Title>
      <div class="mt-8 flex h-7 items-center justify-between px-1">
        <h1 class="text-xl font-bold">오늘 귀가</h1>
      </div>
      <Errored
        fallback={(_, reset) => (
          <Card>
            <p class="font-semibold">오늘 귀가 정보를 불러오지 못했어요.</p>
            <button type="button" class="mt-2 w-max cursor-pointer font-semibold text-amber-11" onClick={reset}>
              다시 불러오기
            </button>
          </Card>
        )}
      >
        <Loading fallback={<div class="flex-1" />}>
          <Switch>
            <Match when={stateOf("no-service")}>
              {(state) => (
                <Show
                  when={state().upcoming.length > 0}
                  fallback={
                    <Card>
                      <p class="text-xl font-bold">오늘은 운행하지 않아요</p>
                      <p class="mt-1.5 font-medium text-balance break-keep text-sand-11">
                        시험기간과 축제기간에만 운행해요. 신청 기간이 열리면 학교 이메일로 알려 드려요.
                      </p>
                    </Card>
                  }
                >
                  <Card flush>
                    <div class="px-5 py-5">
                      <p class="text-xl font-bold">오늘은 운행하지 않아요</p>
                      <p class="mt-1.5 font-medium text-balance break-keep text-sand-11">
                        다음 운행은 {formatNight(state().upcoming[0].night)} 밤이에요.
                      </p>
                    </div>
                    <ul class="border-t border-sand-4 px-5 py-2">
                      <For each={state().upcoming} keyed={(item) => item.night}>
                        {(item) => (
                          <li class="flex items-center justify-between gap-x-3 py-1.5">
                            <span class="font-semibold tabular-nums">{formatNight(item().night)}</span>
                            <span class={["text-sm font-semibold", item().booked ? "text-amber-11" : "text-sand-11"]}>
                              {item().booked ? "신청했어요" : "신청 전"}
                            </span>
                          </li>
                        )}
                      </For>
                      <Show when={state().more > 0}>
                        <li class="py-1.5 text-sm font-medium text-sand-11 tabular-nums">
                          {`그 뒤로 ${state().more}일 더 운행해요`}
                        </li>
                      </Show>
                    </ul>
                  </Card>
                  <a href="/booking" class="mt-4 flex w-max items-center gap-x-0.5 px-1 font-semibold">
                    사전 신청으로 가기
                    <PhCaretRightBold aria-hidden="true" class="text-sm text-sand-11" />
                  </a>
                </Show>
              )}
            </Match>
            <Match when={stateOf("not-booked")}>
              <Card>
                <p class="text-xl font-bold text-balance break-keep">오늘 밤 사전 신청 내역이 없어요</p>
                <p class="mt-1.5 font-medium text-balance break-keep text-sand-11">
                  노선은 미리 신청한 학생들의 집 방향으로 만들어져요. 다음 운행일은 사전 신청에서 미리 신청할 수 있어요.
                </p>
                <a href="/booking" class="mt-4 flex w-max items-center gap-x-0.5 font-semibold">
                  사전 신청으로 가기
                  <PhCaretRightBold aria-hidden="true" class="text-sm text-sand-11" />
                </a>
              </Card>
            </Match>
            <Match when={stateOf("booked")}>
              {(state) => (
                <>
                  <Card flush>
                    <div class="px-5 py-5">
                      <p class="text-xl font-bold text-balance break-keep tabular-nums">
                        {formatClock(state().slot.from)}–{formatClock(state().slot.to)}에 타기로 했어요
                      </p>
                      <p class="mt-1.5 font-medium text-balance break-keep text-sand-11">
                        버스를 고르지 않아도 내 QR로 탈 수 있어요.
                      </p>
                    </div>
                    <Show when={state().dropOff}>
                      {(dropOff) => (
                        <dl class="flex flex-col gap-y-0.5 border-t border-sand-4 px-5 py-3.5">
                          <dt class="text-sm font-medium text-sand-11">집에서 가까운 정류장</dt>
                          <dd class="flex flex-wrap items-baseline gap-x-1.5 font-semibold break-keep">
                            {dropOff().name}
                            <span class="text-sm font-medium whitespace-nowrap text-sand-11 tabular-nums">
                              걸어서 {dropOff().walkHome}분
                            </span>
                          </dd>
                        </dl>
                      )}
                    </Show>
                  </Card>
                  <p class="mt-4 px-1 text-sm font-medium text-balance break-keep text-sand-11">
                    당일 신청은 선택이에요. 출발할 곳과 시간, 내릴 정류장을 직접 고를 수 있어요.
                  </p>
                  <Footer
                    type="button"
                    buttonLabel="탈 버스 고르기"
                    aboveTabBar
                    onClick={() => nav(flowHref("/today/start", { ...state().resume }))}
                  />
                </>
              )}
            </Match>
            <Match when={stateOf("waiting")}>{(state) => <WaitingCard state={state()} />}</Match>
            <Match when={stateOf("missed")}>
              {(state) => (
                <>
                  <Card>
                    <div class="flex items-center gap-x-2">
                      <RouteChip name={state().ride.routeName} quiet />
                      <span class="text-sm font-semibold text-sand-11 tabular-nums">
                        {formatClock(state().ride.stops[state().ride.boardIndex].at)} 승차
                      </span>
                    </div>
                    <p class="mt-4 text-xl font-bold text-balance break-keep">고른 버스가 떠났어요</p>
                    <p class="mt-1.5 font-medium text-balance break-keep text-sand-11">
                      {state().ride.stops[state().ride.boardIndex].name}에서 타기로 했던 버스예요. 다른 버스를 고르거나,
                      오는 버스에 내 QR을 보여 주고 타요.
                    </p>
                  </Card>
                  <Footer
                    type="button"
                    buttonLabel="다른 버스 고르기"
                    aboveTabBar
                    onClick={() => nav(flowHref("/today/time", { start: state().resume.start }))}
                  />
                </>
              )}
            </Match>
            <Match when={stateOf("riding")}>{(state) => <RidingCard state={state()} />}</Match>
            <Match when={stateOf("arrived")}>
              {(state) => (
                <Card>
                  <RouteDots current={4} total={4} spacing="wide" />
                  <p class="mt-5 text-xl font-bold break-keep">
                    {state().ride.stops[state().ride.alightIndex].name}에서 내렸어요
                  </p>
                  <p class="mt-1.5 font-medium break-keep text-sand-11">
                    집까지 걸어서 {state().ride.walkHome}분이에요. 조심히 들어가요.
                  </p>
                </Card>
              )}
            </Match>
          </Switch>
        </Loading>
      </Errored>
    </div>
  );
}

function Card(props: { flush?: boolean; children: JSX.Element }) {
  return (
    <section class={["mt-5 overflow-hidden rounded-2xl bg-sand-2", !props.flush && "px-5 py-5"]}>
      {props.children}
    </section>
  );
}

function WaitingCard(props: { state: RideState }) {
  const ride = () => props.state.ride;
  const board = () => ride().stops[ride().boardIndex];
  const alight = () => ride().stops[ride().alightIndex];
  const now = createTickingNow(() => props.state.now);
  const wait = () => minutesBetween(now(), board().at);
  const countdown = () => (wait() < 1 ? "곧 와요" : `${formatMinutes(wait())} 후`);

  return (
    <Card flush>
      <div class="px-5 pt-5">
        <div class="flex items-center gap-x-2">
          <RouteChip name={ride().routeName} />
          <span class="text-sm font-semibold text-sand-11 tabular-nums">{formatClock(board().at)} 승차</span>
        </div>
        <p class="mt-4 text-[32px] leading-10 font-bold tracking-[-0.03em] text-amber-11 tabular-nums">
          <span class="sr-only">
            {ride().routeName} 버스가 {board().name}에{" "}
          </span>
          {countdown()}
        </p>
        <p aria-hidden="true" class="mt-1 font-medium break-keep text-sand-11">
          {board().name}에 와요
        </p>
        <Show when={ride().plannedBoardAt}>
          {(planned) => (
            <p class="mt-3 flex items-start gap-x-1.5 text-sm font-semibold break-keep">
              <PhClockCounterClockwiseBold aria-hidden="true" class="mt-0.75 shrink-0 text-amber-11" />
              <span>
                출발이 {formatClock(planned())} → {withDirectionParticle(formatClock(board().at))} 당겨졌어요
              </span>
            </p>
          )}
        </Show>
      </div>
      <TimeLegs
        class="mt-5 border-y border-sand-4"
        inset="pl-5"
        walkToStop={ride().walkToStop}
        wait={wait()}
        ride={minutesBetween(board().at, alight().at)}
        walkHome={ride().walkHome}
      />
      <RouteTimeline class="px-5 py-4" onCard rows={tripRows(ride())} />
      <div class="flex items-center justify-between gap-x-3 border-t border-sand-4 py-1 pr-2 pl-5">
        <SeatCount riders={ride().riders} capacity={ride().capacity} />
        <div class="flex items-center text-sm font-semibold">
          <a
            href={flowHref("/today/route", {
              bus: ride().busId,
              start: ride().start.id,
              alight: alight().id,
            })}
            class="px-3 py-2.5"
          >
            노선 보기
          </a>
          <a href={flowHref("/today/buses", { ...props.state.resume })} class="px-3 py-2.5">
            버스 바꾸기
          </a>
        </div>
      </div>
    </Card>
  );
}

function RidingCard(props: { state: RideState }) {
  const ride = () => props.state.ride;
  const alight = () => ride().stops[ride().alightIndex];
  const now = createTickingNow(() => props.state.now);
  const stopsLeft = () =>
    ride().stops.filter((stop, i) => i > ride().boardIndex && i <= ride().alightIndex && stop.at > now()).length;

  return (
    <Card flush>
      <div class="px-5 pt-5">
        <div class="flex items-center gap-x-2">
          <RouteChip name={ride().routeName} />
          <span class="text-sm font-semibold text-sand-11">타고 있어요</span>
        </div>
        <p class="mt-4 text-[32px] leading-10 font-bold tracking-[-0.03em] text-amber-11 tabular-nums">
          {stopsLeft() === 0 ? "곧 내려요" : `${stopsLeft()}정거장 남았어요`}
        </p>
        <p class="mt-1 font-medium break-keep text-sand-11 tabular-nums">
          {alight().name}에 {formatClock(alight().at)} 도착 예정
        </p>
      </div>
      <RouteTimeline class="mt-5 border-t border-sand-4 px-5 py-4" onCard rows={ridingRows(ride(), now())} />
      <p class="border-t border-sand-4 px-5 py-3.5 text-sm font-medium break-keep text-sand-11">
        기사님 화면에 내릴 정류장이 표시돼 있어요.
      </p>
    </Card>
  );
}
