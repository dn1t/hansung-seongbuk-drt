import { Title } from "@solidjs/meta";
import { useSearchParams } from "@solidjs/router";
import { createMemo, createSignal, Errored, For, Loading, Match, Show, Switch } from "solid-js";
import { env } from "virtual:solid-env/client";

import { Button } from "../../components/common/button";
import { SectionRule } from "../../components/layout/screen";
import { BusCard } from "../../components/operator/bus-card";
import { getOperatorPlan, type OperatorPlan, type PlanBusView, rebuildNightPlan } from "../../lib/operator";
import { formatClock, formatNight, slotRange } from "../../lib/time";

type Status = { kind: "saved" | "error"; text: string };

const csvCell = (value: string | number) => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

function downloadPlan(plan: OperatorPlan) {
  const header = ["출발 시간대", "버스", "출발", "순서", "정류장", "도착", "구분", "타는 학생", "내리는 학생"];
  const rows = plan.buses.flatMap((bus) =>
    bus.stops.map((stop, i) => [
      bus.slot,
      bus.name,
      formatClock(bus.departs),
      i + 1,
      stop.name,
      formatClock(stop.at),
      stop.kind === "board" ? "타는 곳" : "내리는 곳",
      stop.kind === "board" ? stop.riders : 0,
      stop.kind === "alight" ? stop.riders : 0,
    ]),
  );
  const text = "\uFEFF" + [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `배차표-${plan.night}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function OperatorRoutes() {
  const [params, setParams] = useSearchParams<{ night?: string }>();
  const plan = createMemo(() => getOperatorPlan(params.night ?? ""));
  const [rebuilding, setRebuilding] = createSignal(false);
  const [status, setStatus] = createSignal<Status>();

  const slots = createMemo(() => {
    const groups = new Map<string, PlanBusView[]>();
    for (const bus of plan().buses) groups.set(bus.slot, [...(groups.get(bus.slot) ?? []), bus]);
    return [...groups].map(([slot, buses]) => ({ slot, buses }));
  });

  async function rebuild() {
    setRebuilding(true);
    const result = await rebuildNightPlan(plan().night);
    setRebuilding(false);
    setStatus(result.ok ? { kind: "saved", text: "노선을 다시 만들었어요." } : { kind: "error", text: result.message });
  }

  return (
    <>
      <Title>{`노선 - 운영 - ${env.VITE_APP_NAME}`}</Title>
      <Errored
        fallback={(_, reset) => (
          <div class="px-1">
            <h1 class="text-3xl font-bold">노선</h1>
            <p class="mt-4 font-semibold">노선을 불러오지 못했어요.</p>
            <button type="button" class="mt-2 cursor-pointer font-semibold text-amber-11" onClick={reset}>
              다시 불러오기
            </button>
          </div>
        )}
      >
        <Loading fallback={<div class="h-96" />}>
          <header class="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 px-1">
            <div class="min-w-0">
              <h1 class="text-3xl font-bold">노선</h1>
              <p class="mt-2 font-medium text-balance break-keep text-sand-11">
                사전 신청이 마감되면 그날 노선이 정해져요. 마감 전에는 지금까지의 신청으로 미리 볼 수 있어요.
              </p>
            </div>
            <Show when={plan().nights.length > 0}>
              <label class="flex flex-col gap-y-1.5">
                <span class="ml-1 text-sm font-semibold text-sand-11">운행일</span>
                <select
                  class="h-13 cursor-pointer rounded-xl border border-sand-5 bg-sand-2 px-4 text-lg tabular-nums focus:border-amber-8 focus:ring-2 focus:ring-amber-5 focus:outline-none"
                  onChange={(e) => {
                    setStatus(undefined);
                    setParams({ night: e.currentTarget.value });
                  }}
                >
                  <For each={plan().nights}>
                    {(night) => (
                      <option value={night} selected={night === plan().night}>
                        {formatNight(night)}
                        {night < plan().tonight ? " · 지난 운행" : ""}
                      </option>
                    )}
                  </For>
                </select>
              </label>
            </Show>
          </header>

          <Switch>
            <Match when={plan().status === "none"}>
              <p class="mt-8 px-1 font-medium break-keep text-sand-11">
                다가오는 운행일이 없어요. 운행일에서 먼저 날짜를 넣어 주세요.
              </p>
            </Match>
            <Match when={true}>
              <div class="mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-1">
                <p class="text-sm font-medium text-sand-11 tabular-nums">
                  <b class={["font-bold", plan().status === "fixed" ? "text-amber-11" : "text-sand-12"]}>
                    {plan().status === "fixed" ? "확정" : "미리 보기"}
                  </b>
                  <span class="px-1.5 text-sand-10">·</span>
                  신청 <b class="font-bold text-sand-12">{plan().booked}명</b>
                  <span class="px-1.5 text-sand-10">·</span>
                  <Show when={plan().night >= plan().tonight && plan().booked > 0}>
                    예상 탑승 <b class="font-bold text-sand-12">{Math.round(plan().expected)}명</b>
                    <span class="px-1.5 text-sand-10">·</span>
                  </Show>
                  버스 <b class="font-bold text-sand-12">{plan().buses.length}대</b>
                  <Show when={plan().buses.length > 0}>
                    <span class="px-1.5 text-sand-10">·</span>
                    집까지 평균 <b class="font-bold text-sand-12">{Math.round(plan().averageWalk)}분</b>
                  </Show>
                  <Show when={plan().status === "fixed"}>
                    <span class="px-1.5 text-sand-10">·</span>
                    당일 신청 <b class="font-bold text-sand-12">{plan().dayOf}명</b>
                    <span class="px-1.5 text-sand-10">·</span>
                    탄 학생 <b class="font-bold text-sand-12">{plan().boarded}명</b>
                    <Show when={plan().booked > 0 && plan().night < plan().tonight}>
                      {" "}
                      (신청의 {Math.round((plan().boarded / plan().booked) * 100)}%)
                    </Show>
                  </Show>
                  <Show when={plan().unplaced > 0}>
                    <span class="px-1.5 text-sand-10">·</span>
                    <b class="font-bold text-red-11">버스에 못 넣은 학생 {plan().unplaced}명</b>
                  </Show>
                </p>
                <div class="flex items-center gap-x-2">
                  <Show when={plan().buses.length > 0}>
                    <button
                      type="button"
                      class="h-13 cursor-pointer rounded-xl px-4 font-semibold text-sand-11 hover:bg-sand-3 hover:text-sand-12"
                      onClick={() => downloadPlan(plan())}
                    >
                      배차표 내려받기
                    </button>
                  </Show>
                  <Show when={plan().canRebuild}>
                    <Button
                      type="button"
                      class="w-40"
                      variant={rebuilding() ? "loading" : "secondary"}
                      onClick={() => void rebuild()}
                    >
                      다시 만들기
                    </Button>
                  </Show>
                </div>
              </div>
              <p role="status" class="mt-2 min-h-6 px-1 font-semibold break-keep">
                <Show when={status()}>
                  {(current) => (
                    <span class={current().kind === "saved" ? "text-green-11" : "text-red-11"}>{current().text}</span>
                  )}
                </Show>
              </p>

              <Switch>
                <Match when={plan().candidates === 0}>
                  <p class="mt-4 px-1 font-medium break-keep text-sand-11">
                    정류장이 없어서 노선을 만들 수 없어요. 정류장에서 먼저 넣어 주세요.
                  </p>
                </Match>
                <Match when={plan().booked === 0}>
                  <p class="mt-4 px-1 font-medium break-keep text-sand-11">이날은 아직 신청한 학생이 없어요.</p>
                </Match>
                <Match when={true}>
                  <For each={slots()} keyed={(group) => group.slot}>
                    {(group) => (
                      <section>
                        <SectionRule title={`${slotRange(group().slot)} 출발`} class="mt-8" />
                        <ul class="mt-3 grid gap-3 lg:grid-cols-2">
                          <For each={group().buses} keyed={(bus) => bus.key}>
                            {(bus) => (
                              <li>
                                <BusCard bus={bus()} fixed={plan().status === "fixed"} />
                              </li>
                            )}
                          </For>
                        </ul>
                      </section>
                    )}
                  </For>
                </Match>
              </Switch>
            </Match>
          </Switch>
        </Loading>
      </Errored>
    </>
  );
}
