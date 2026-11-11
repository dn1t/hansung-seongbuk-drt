import { Title } from "@solidjs/meta";
import { useSearchParams } from "@solidjs/router";
import { createMemo, createSignal, Errored, For, Loading, onSettled, Show } from "solid-js";
import { env } from "virtual:solid-env/client";

import { keepScreenOn } from "../../components/common/wake-lock";
import { RouteChip } from "../../components/ride/badges";
import { defaultBus, type DriverView, driverViewNow, getDriverView, getTonightBuses } from "../../lib/boarding";
import { formatClock } from "../../lib/time";

const REFRESH_MS = 10_000;

export default function OperatorDriver() {
  const [params, setParams] = useSearchParams<{ bus?: string }>();
  const buses = createMemo(() => getTonightBuses());
  keepScreenOn();
  const busId = () => (buses().buses.some((b) => b.id === params.bus) ? params.bus : defaultBus(buses()));
  const view = createMemo(() => getDriverView(busId() ?? ""));
  const [latest, setLatest] = createSignal<{ busId: string; view: DriverView | undefined }>();
  const shown = () => {
    const recent = latest();
    return recent && recent.busId === (busId() ?? "") ? recent.view : view();
  };
  const nextSeq = () => {
    const current = shown();
    return current?.stops.find((stop) => stop.at >= current.now)?.seq;
  };

  onSettled(() => {
    const timer = setInterval(() => {
      const id = busId() ?? "";
      driverViewNow(id)
        .then((next) => setLatest({ busId: id, view: next }))
        .catch(() => undefined);
    }, REFRESH_MS);
    return () => clearInterval(timer);
  });

  return (
    <>
      <Title>{`기사님 화면 - 운영 - ${env.VITE_APP_NAME}`}</Title>
      <div class="mx-auto max-w-2xl">
        <header class="px-1">
          <h1 class="text-3xl font-bold">기사님 화면</h1>
          <p class="mt-2 font-medium text-balance break-keep text-sand-11">
            노선과 정류장마다 내릴 학생 수예요. QR을 찍은 학생이 생기면 10초 안에 바뀌어요.
          </p>
        </header>
        <Errored
          fallback={(_, reset) => (
            <div class="mt-6 px-1">
              <p class="font-semibold">버스 정보를 불러오지 못했어요.</p>
              <button type="button" class="mt-2 cursor-pointer font-semibold text-amber-11" onClick={reset}>
                다시 불러오기
              </button>
            </div>
          )}
        >
          <Loading fallback={<div class="h-96" />}>
            <Show
              when={buses().buses.length > 0}
              fallback={<p class="mt-6 px-1 font-medium break-keep text-sand-11">오늘 밤 운행하는 버스가 없어요.</p>}
            >
              <label class="mt-6 flex flex-col gap-y-1.5">
                <span class="ml-1 text-sm font-semibold text-sand-11">운전하는 버스</span>
                <select
                  class="h-13 cursor-pointer rounded-xl border border-sand-5 bg-sand-2 px-4 text-lg tabular-nums focus:border-amber-8 focus:ring-2 focus:ring-amber-5 focus:outline-none"
                  onChange={(e) => setParams({ bus: e.currentTarget.value })}
                >
                  <For each={buses().buses} keyed={(item) => item.id}>
                    {(item) => (
                      <option value={item().id} selected={item().id === busId()}>
                        {formatClock(item().departs)} {item().name} · {item().firstStop} 출발
                      </option>
                    )}
                  </For>
                </select>
              </label>
              <Show when={shown()}>
                {(current) => (
                  <>
                    <div class="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 px-1">
                      <RouteChip name={current().bus.name} />
                      <span class="text-lg font-bold tabular-nums">{formatClock(current().bus.departs)} 출발</span>
                      <span class="text-sm font-medium text-sand-11 tabular-nums">
                        탄 학생 <b class="font-bold text-sand-12">{current().bus.boarded}명</b>
                        <span class="px-1.5 text-sand-10">·</span>
                        탈 예정 {current().bus.load}/{current().bus.capacity}명
                      </span>
                    </div>
                    <Show when={current().unknownDropOff > 0}>
                      <p class="mt-2 px-1 text-sm font-semibold break-keep text-red-11">
                        내릴 곳을 모르는 학생이 {current().unknownDropOff}명 있어요. 내릴 때 말해 달라고 해 주세요.
                      </p>
                    </Show>
                    <ol class="mt-4 overflow-hidden rounded-2xl border border-sand-4">
                      <For each={current().stops} keyed={(stop) => stop.seq}>
                        {(stop) => {
                          const isNext = () => stop().seq === nextSeq();
                          const passed = () => stop().at < current().now;
                          return (
                            <li
                              aria-current={isNext() ? "step" : undefined}
                              class={[
                                "flex items-center gap-x-4 border-b border-sand-4 px-4 py-3 last:border-b-0",
                                isNext() && "bg-amber-3",
                                passed() && "text-sand-10",
                              ]}
                            >
                              <span class="w-12 shrink-0 font-semibold tabular-nums">{formatClock(stop().at)}</span>
                              <span class="flex min-w-0 flex-1 flex-col">
                                <span class={["text-lg break-keep", isNext() ? "font-bold" : "font-semibold"]}>
                                  {stop().name}
                                </span>
                                <span class="text-sm font-medium text-sand-11">
                                  {stop().kind === "board" ? "타는 곳" : "내리는 곳"}
                                  <Show when={isNext()}> · 다음 정류장</Show>
                                </span>
                              </span>
                              <Show when={stop().kind === "alight"}>
                                <span class="flex shrink-0 flex-col items-end tabular-nums">
                                  <span
                                    class={["text-xl font-bold", stop().getOff > 0 ? "text-amber-11" : "text-sand-10"]}
                                  >
                                    {stop().getOff}명
                                  </span>
                                  <Show when={stop().expected > 0}>
                                    <span class="text-xs font-medium text-sand-11">아직 안 탄 {stop().expected}명</span>
                                  </Show>
                                </span>
                              </Show>
                            </li>
                          );
                        }}
                      </For>
                    </ol>
                  </>
                )}
              </Show>
            </Show>
          </Loading>
        </Errored>
      </div>
    </>
  );
}
