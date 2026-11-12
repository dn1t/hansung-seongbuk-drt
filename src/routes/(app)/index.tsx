import { Title } from "@solidjs/meta";
import { useNavigate } from "@solidjs/router";
import type { JSX } from "@solidjs/web";
import { createMemo, createSignal, Errored, For, Loading, Match, onSettled, Show, Switch } from "solid-js";
import { env } from "virtual:solid-env/client";

import { DemoNotice } from "../../components/common/demo-notice";
import { Footer, RouteDots } from "../../components/layout/screen";
import { RouteChip, SeatCount } from "../../components/ride/badges";
import { createTickingNow } from "../../components/ride/clock";
import { RouteTimeline, ridingRows, tripRows } from "../../components/ride/route-timeline";
import { TimeLegs } from "../../components/ride/time-legs";
import { type Coords, currentPosition, distanceMeters, locationPermission } from "../../lib/geo";
import {
  getBusOptions,
  getStartPoints,
  getTonight,
  isFull,
  refreshTonight,
  type RideState,
  type Tonight,
} from "../../lib/ride";
import { flowHref } from "../../lib/ride-flow";
import { formatClock, formatMinutes, formatNight, minutesBetween, withDirectionParticle } from "../../lib/time";

type StateOf<K extends Tonight["kind"]> = Extract<Tonight, { kind: K }>;

const NEAR_START_METERS = 1500;

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
      <DemoNotice class="mt-6" />
      <div class="mt-6 flex h-7 items-center justify-between px-1">
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
                  <Show when={state().fixesAt} fallback={<NearbyRoutes state={state()} />}>
                    {(fixesAt) => (
                      <section class="mt-3 rounded-2xl border border-sand-4 px-5 py-4">
                        <p class="font-semibold break-keep tabular-nums">노선은 {formatClock(fixesAt())}에 정해져요</p>
                        <p class="mt-1 text-sm font-medium break-keep text-sand-11">
                          탑승 1시간 전에 그때까지의 신청으로 노선이 정해지고, 그 전까지는 사전 신청에서 시간과 가는
                          곳을 바꿀 수 있어요.
                        </p>
                        <a
                          href={`/booking/routes?slot=${encodeURIComponent(state().range.from)}`}
                          class="mt-3 flex w-max items-center gap-x-0.5 font-semibold"
                        >
                          지금 생길 노선 미리 보기
                          <PhCaretRightBold aria-hidden="true" class="text-sm text-sand-11" />
                        </a>
                      </section>
                    )}
                  </Show>
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

function NearbyRoutes(props: { state: StateOf<"booked"> }) {
  const nav = useNavigate();
  const points = createMemo(() => getStartPoints());
  const [here, setHere] = createSignal<Coords>();
  const startId = createMemo(() => {
    const list = points().points;
    if (props.state.resume.start && list.some((p) => p.id === props.state.resume.start)) {
      return props.state.resume.start;
    }
    const near = here();
    if (near) {
      const nearest = [...list].sort((a, b) => distanceMeters(a, near) - distanceMeters(b, near))[0];
      if (nearest && distanceMeters(nearest, near) <= NEAR_START_METERS) return nearest.id;
    }
    return list[0]?.id ?? "";
  });
  const start = () => points().points.find((p) => p.id === startId());
  const options = createMemo(() => getBusOptions(startId(), props.state.range.from, props.state.range.to));
  const flow = (busId?: string) =>
    flowHref(busId ? `/today/buses/${busId}` : "/today/buses", {
      start: startId(),
      from: props.state.range.from,
      to: props.state.range.to,
    });

  onSettled(() => {
    void locationPermission().then((permission) => {
      if (permission !== "granted") return;
      currentPosition()
        .then((coords) => setHere(coords))
        .catch(() => undefined);
    });
  });

  return (
    <section class="mt-8">
      <div class="flex items-center gap-x-3 px-1">
        <h2 class="shrink-0 text-sm font-bold text-sand-11">내 집 근처로 가는 노선</h2>
        <span aria-hidden="true" class="h-px flex-1 bg-sand-4" />
      </div>
      <Loading fallback={<div class="h-40" />}>
        <p class="mt-3 flex flex-wrap items-center gap-x-1.5 px-1 text-sm font-medium break-keep text-sand-11">
          <Show
            when={here() && start()?.id !== points().points[0]?.id}
            fallback={<span>{start()?.name}에서 출발</span>}
          >
            <span>지금 위치에서 가까운 {start()?.name}에서 출발</span>
          </Show>
          <a href={flowHref("/today/start", { start: startId() })} class="font-semibold text-amber-11">
            바꾸기
          </a>
        </p>
        <Show
          when={(options()?.options.length ?? 0) > 0}
          fallback={
            <p class="mt-3 px-1 font-medium break-keep text-sand-11">
              이 시간에 고를 수 있는 노선이 없어요. 내 QR로 오는 버스에 타면 돼요.
            </p>
          }
        >
          <ul class="mt-3 overflow-hidden rounded-2xl bg-sand-2">
            <For each={options()?.options ?? []} keyed={(option) => option.busId}>
              {(option, i) => {
                const board = () => option().stops[option().boardIndex];
                const alight = () => option().stops[option().alightIndex];
                return (
                  <li class={i() > 0 ? "border-t border-sand-4" : undefined}>
                    <div class="flex items-center gap-x-3 py-3.5 pr-3 pl-4">
                      <div class="flex min-w-0 flex-1 flex-col gap-y-1">
                        <span class="flex items-center gap-x-2">
                          <span class="font-bold tabular-nums">{formatClock(board().at)}</span>
                          <RouteChip name={option().routeName} quiet />
                          <Show when={option().mine}>
                            <span class="text-sm font-semibold text-amber-11">고른 노선</span>
                          </Show>
                        </span>
                        <span class="text-sm font-medium break-keep text-sand-11">
                          {board().name}에서 타서 {alight().name}에서 내려요 · 집까지 걸어서 {option().walkHome}분
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={isFull(option())}
                        class={[
                          "h-10 shrink-0 rounded-xl px-3.5 text-sm font-bold whitespace-nowrap",
                          isFull(option())
                            ? "cursor-not-allowed bg-sand-3 text-sand-11"
                            : "cursor-pointer bg-sand-4 text-sand-12 active:bg-sand-5",
                        ]}
                        onClick={() => nav(flow(option().busId))}
                      >
                        {isFull(option()) ? "자리 없음" : "노선 선택"}
                      </button>
                    </div>
                  </li>
                );
              }}
            </For>
          </ul>
        </Show>
        <p class="mt-3 px-1 text-sm font-medium break-keep text-sand-11">
          노선을 고르면 탈 정류장까지 걷는 시간, 기다리는 시간, 타고 가는 시간, 내려서 집까지 걷는 시간을 볼 수 있어요.
          고르지 않아도 내 QR로 탈 수 있어요.
        </p>
      </Loading>
    </section>
  );
}
