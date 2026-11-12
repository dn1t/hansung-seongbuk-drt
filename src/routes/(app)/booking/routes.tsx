import { Title } from "@solidjs/meta";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { createMemo, createSignal, Errored, For, isPending, Loading, Show } from "solid-js";
import { env } from "virtual:solid-env/client";

import { Header } from "../../../components/layout/screen";
import { RouteChip, SeatCount } from "../../../components/ride/badges";
import { RouteTimeline, type TimelineRow } from "../../../components/ride/route-timeline";
import { getNightRoutes, type NightRoute } from "../../../lib/night-routes";
import { formatClock, formatDate, formatNight } from "../../../lib/time";

const slotOf = (route: NightRoute) => route.slot;

function stopRows(route: NightRoute): TimelineRow[] {
  return route.stops.map((stop, i) => ({
    key: `${i}`,
    name: stop.name,
    mark: "route",
    time: stop.at,
    tag: stop.kind === "board" ? "승차" : undefined,
    below: i < route.stops.length - 1 ? "route" : undefined,
  }));
}

export default function BookingRoutes() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams<{ night?: string; slot?: string }>();
  const data = createMemo(() => getNightRoutes(params.night ?? ""));
  const working = createMemo(() => isPending(() => data()));
  const [picked, setPicked] = createSignal<string>();

  const slots = createMemo(() => [...new Set((data()?.routes ?? []).map(slotOf))]);
  const mySlot = createMemo(() => data()?.routes.find((route) => route.mine)?.slot ?? data()?.booking?.slot);
  const slot = createMemo(() => {
    const wanted = picked() ?? params.slot ?? mySlot();
    if (wanted && slots().includes(wanted)) return wanted;
    return slots()[0];
  });
  const shown = createMemo(() => (data()?.routes ?? []).filter((route) => route.slot === slot()));

  return (
    <div class="flex flex-1 flex-col px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
      <Title>{`시간대별 노선 - ${env.VITE_APP_NAME}`}</Title>
      <Header
        title="시간대별 노선"
        description="지금까지의 사전 신청으로 생긴 노선이에요. 탑승 1시간 전에 정해지고, 그 전에는 신청에 따라 바뀔 수 있어요."
        onBackClick={() => nav("/booking")}
      />
      <Errored
        fallback={(_, reset) => (
          <div class="mt-6 px-1">
            <p class="font-semibold">노선을 불러오지 못했어요.</p>
            <button type="button" class="mt-2 cursor-pointer font-semibold text-amber-11" onClick={reset}>
              다시 불러오기
            </button>
          </div>
        )}
      >
        <Loading fallback={<div class="flex-1" />}>
          <Show
            when={data()}
            fallback={<p class="mt-4 px-1 font-medium break-keep text-sand-11">다가오는 운행일이 없어요.</p>}
          >
            {(current) => (
              <div class={["flex flex-col transition-opacity", working() ? "opacity-60" : ""]}>
                <div class="-mx-5 mt-4 flex [scrollbar-width:none] gap-x-1.5 overflow-x-auto px-5">
                  <For each={current().nights} keyed={(item) => item.night}>
                    {(item) => (
                      <Chip
                        active={item().night === current().night}
                        onClick={() => {
                          setPicked(undefined);
                          setParams({ night: item().night, slot: undefined });
                        }}
                      >
                        {formatDate(item().night)}
                        <Show when={item().booked}>
                          <span aria-label="신청한 날" class="size-1.5 rounded-full bg-amber-9" />
                        </Show>
                      </Chip>
                    )}
                  </For>
                </div>

                <Show
                  when={slots().length > 0}
                  fallback={
                    <p class="mt-6 px-1 font-medium break-keep text-sand-11">
                      {formatNight(current().night)} 밤은 아직 신청한 학생이 없어서 노선이 없어요.
                    </p>
                  }
                >
                  <div role="tablist" aria-label="출발 시간대" class="mt-4 grid grid-cols-4 gap-1.5">
                    <For each={slots()}>
                      {(clock) => (
                        <button
                          type="button"
                          role="tab"
                          aria-selected={clock === slot() ? "true" : "false"}
                          class={[
                            "flex h-12 cursor-pointer flex-col items-center justify-center rounded-xl border font-bold tabular-nums transition-colors",
                            clock === slot()
                              ? "border-amber-8 bg-amber-3 text-amber-11 ring-2 ring-amber-5"
                              : "border-sand-3 bg-sand-3",
                          ]}
                          onClick={() => {
                            setPicked(clock);
                            setParams({ slot: clock });
                          }}
                        >
                          {clock}
                          <Show when={clock === mySlot()}>
                            <span class="text-[11px] leading-3 font-semibold">내 시간</span>
                          </Show>
                        </button>
                      )}
                    </For>
                  </div>

                  <ul class="mt-4 flex flex-col gap-y-2.5">
                    <For each={shown()} keyed={(route) => route.key}>
                      {(route) => (
                        <li>
                          <RouteCard route={route()} />
                        </li>
                      )}
                    </For>
                  </ul>
                  <p class="mt-4 px-1 text-sm font-medium break-keep text-sand-11">
                    오늘 귀가에서 내 집 근처로 가는 노선을 골라 탈 수 있어요. 노선을 고르지 않아도 내 QR로 탈 수 있어요.
                  </p>
                </Show>
              </div>
            )}
          </Show>
        </Loading>
      </Errored>
    </div>
  );
}

function Chip(props: { active: boolean; onClick: () => void; children: unknown }) {
  return (
    <button
      type="button"
      aria-pressed={props.active ? "true" : "false"}
      class={[
        "flex h-9 shrink-0 cursor-pointer items-center gap-x-1.5 rounded-lg border px-3 text-sm font-semibold tabular-nums transition-colors",
        props.active ? "border-amber-8 bg-amber-3 text-amber-11" : "border-sand-4 bg-sand-2 text-sand-11",
      ]}
      onClick={() => props.onClick()}
    >
      {props.children as string}
    </button>
  );
}

function RouteCard(props: { route: NightRoute }) {
  const boards = () => props.route.stops.filter((stop) => stop.kind === "board").length;
  const first = () => props.route.stops[0];
  const last = () => props.route.stops.at(-1)!;

  return (
    <details class="group rounded-2xl border border-sand-4 bg-sand-2">
      <summary class="flex cursor-pointer list-none flex-col gap-y-1.5 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
        <span class="flex items-center gap-x-2">
          <span class="text-lg font-bold tabular-nums">{formatClock(props.route.departs)}</span>
          <RouteChip name={props.route.name} quiet />
          <Show
            when={props.route.fixed}
            fallback={
              <span class="rounded-sm bg-sand-3 px-1.5 text-xs leading-5 font-semibold text-sand-11">예상</span>
            }
          >
            <span class="rounded-sm bg-green-3 px-1.5 text-xs leading-5 font-semibold text-green-11">확정</span>
          </Show>
          <PhCaretDownBold
            aria-hidden="true"
            class="ml-auto text-sm text-sand-10 transition-transform group-open:rotate-180"
          />
        </span>
        <span class="text-sm font-medium break-keep text-sand-11">
          {first().name} → {last().name}
        </span>
        <span class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-sand-11 tabular-nums">
          <SeatCount riders={props.route.riders} capacity={props.route.capacity} />
          <span class="text-sand-10">·</span>
          <span>
            타는 곳 {boards()} · 내리는 곳 {props.route.stops.length - boards()}
          </span>
          <Show
            when={props.route.mine}
            fallback={
              <Show when={props.route.nearHome}>
                <span class="font-semibold text-amber-11">· 내 집 근처</span>
              </Show>
            }
          >
            <span class="font-semibold text-amber-11">· 내가 탈 노선</span>
          </Show>
        </span>
      </summary>
      <div class="border-t border-sand-4 px-4 pt-3.5 pb-4">
        <RouteTimeline onCard rows={stopRows(props.route)} />
      </div>
    </details>
  );
}
