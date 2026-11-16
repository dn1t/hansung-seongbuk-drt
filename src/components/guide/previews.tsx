import type { JSX } from "@solidjs/web";
import { For, Show } from "solid-js";

import { formatClock } from "../../lib/time";
import { RouteChip, SeatCount } from "../ride/badges";
import { RouteTimeline, type TimelineRow } from "../ride/route-timeline";
import { TimeLegs } from "../ride/time-legs";

const at = (hour: number, minute: number) => Date.UTC(2026, 0, 1, hour - 9, minute);

function Preview(props: { label: string; children: JSX.Element }) {
  return (
    <figure role="img" aria-label={props.label} class="mt-3 overflow-hidden rounded-2xl border border-sand-4 bg-sand-1">
      <div aria-hidden="true" inert class="pointer-events-none select-none">
        <p class="border-b border-sand-4 py-1.5 text-center text-xs font-medium text-sand-11">화면 예시</p>
        {props.children}
      </div>
    </figure>
  );
}

function Fixed(props: { fixed: boolean }) {
  return (
    <span
      class={[
        "rounded-sm px-1.5 text-xs leading-5 font-semibold",
        props.fixed ? "bg-green-3 text-green-11" : "bg-sand-3 text-sand-11",
      ]}
    >
      {props.fixed ? "확정" : "예상"}
    </span>
  );
}

export function SlotRoutesPreview() {
  const routes = [
    { name: "노원행", fixed: true, from: "한성대정문", to: "상계주공2단지", riders: 18 },
    { name: "중랑행", fixed: true, from: "성신여대정문앞", to: "중화역", riders: 9 },
    { name: "강북행", fixed: false, from: "국민대학교앞", to: "수유역", riders: 6 },
  ];
  return (
    <Preview label="시간대별 노선 화면 예시: 시간대 탭과 그 시간대의 노선 목록">
      <div class="px-3.5 pt-3 pb-3.5">
        <p class="font-bold">시간대별 노선</p>
        <div class="mt-2.5 grid grid-cols-3 gap-1.5">
          <For each={["23:30", "00:30", "01:30"]}>
            {(clock, i) => (
              <span
                class={[
                  "flex h-9 items-center justify-center rounded-lg border text-sm font-bold tabular-nums",
                  i() === 1 ? "border-amber-8 bg-amber-3 text-amber-11" : "border-sand-3 bg-sand-3",
                ]}
              >
                {clock}
              </span>
            )}
          </For>
        </div>
        <ul class="mt-2.5 flex flex-col gap-y-1.5">
          <For each={routes}>
            {(route) => (
              <li class="flex flex-col gap-y-1 rounded-xl border border-sand-4 bg-sand-2 px-3 py-2.5">
                <span class="flex items-center gap-x-1.5">
                  <span class="text-sm font-bold tabular-nums">00:30</span>
                  <RouteChip name={route.name} quiet />
                  <Fixed fixed={route.fixed} />
                  <PhCaretDownBold class="ml-auto text-xs text-sand-10" />
                </span>
                <span class="flex items-center justify-between gap-x-2 text-xs font-medium text-sand-11">
                  <span class="truncate">
                    {route.from} → {route.to}
                  </span>
                  <span class="shrink-0 tabular-nums">{route.riders}/28명</span>
                </span>
              </li>
            )}
          </For>
        </ul>
      </div>
    </Preview>
  );
}

export function NearbyRoutesPreview() {
  const options = [
    { name: "노원행", time: at(0, 30), board: "한성대정문", alight: "장위시장", walk: 4, full: false },
    { name: "중랑행", time: at(0, 34), board: "성신여대정문앞", alight: "돌곶이역", walk: 7, full: false },
    { name: "강북행", time: at(0, 41), board: "국민대학교앞", alight: "월곡역", walk: 9, full: true },
  ];
  return (
    <Preview label="오늘 귀가 화면 예시: 내 집 근처로 가는 노선 목록과 노선 선택 버튼">
      <div class="px-3.5 pt-3 pb-3.5">
        <p class="font-bold">오늘 귀가</p>
        <p class="mt-1 text-xs font-medium text-sand-11">
          한성대학교에서 출발 <span class="font-semibold text-amber-11">바꾸기</span>
        </p>
        <ul class="mt-2.5 overflow-hidden rounded-xl bg-sand-2">
          <For each={options}>
            {(option, i) => (
              <li class={["flex items-center gap-x-2.5 py-2.5 pr-2.5 pl-3", i() > 0 && "border-t border-sand-4"]}>
                <span class="flex min-w-0 flex-1 flex-col gap-y-0.5">
                  <span class="flex items-center gap-x-1.5">
                    <span class="text-sm font-bold tabular-nums">{formatClock(option.time)}</span>
                    <RouteChip name={option.name} quiet />
                  </span>
                  <span class="text-xs font-medium break-keep text-sand-11">
                    {option.board}에서 타서 {option.alight}에서 내려요 · 집까지 {option.walk}분
                  </span>
                </span>
                <span
                  class={[
                    "flex h-8 shrink-0 items-center rounded-lg px-2.5 text-xs font-bold",
                    option.full ? "bg-sand-3 text-sand-11" : "bg-sand-4 text-sand-12",
                  ]}
                >
                  {option.full ? "자리 없음" : "노선 선택"}
                </span>
              </li>
            )}
          </For>
        </ul>
      </div>
    </Preview>
  );
}

export function RouteDetailPreview() {
  const rows: TimelineRow[] = [
    { key: "start", name: "한성대학교", mark: "start", detail: "걸어서 5분", below: "walk" },
    { key: "board", name: "한성대정문", mark: "board", time: at(0, 30), tag: "승차", below: "rider" },
    { key: "skip", name: "2개 정류장 지나서", mark: "skip", below: "rider" },
    { key: "alight", name: "장위시장", mark: "alight", time: at(0, 44), tag: "하차", below: "walk" },
    { key: "home", name: "집", mark: "home", detail: "걸어서 4분" },
  ];
  return (
    <Preview label="노선 상세 화면 예시: 정류장까지 5분, 기다림 7분, 타고 가요 14분, 집까지 4분과 승차·하차 정류장">
      <div class="px-3.5 pt-3 pb-3.5">
        <p class="flex items-center gap-x-1.5 font-bold">
          <RouteChip name="노원행" quiet />
          <span class="tabular-nums">00:30 버스</span>
        </p>
        <span class="mt-2 block">
          <SeatCount riders={18} capacity={28} />
        </span>
        <TimeLegs class="mt-2.5 rounded-xl border border-sand-4" walkToStop={5} wait={7} ride={14} walkHome={4} />
        <RouteTimeline class="mt-3.5 px-0.5 text-sm" rows={rows} />
      </div>
    </Preview>
  );
}

export function ReaderPreview() {
  return (
    <Preview label="탑승 확인 단말 화면 예시: 탈 수 있어요, 장위시장에서 내려요">
      <div class="px-3.5 pt-3 pb-3.5">
        <p class="flex items-center justify-between font-bold">
          탑승 확인
          <span class="text-xs font-medium text-sand-11 tabular-nums">
            탄 학생 <b class="font-bold text-sand-12">12명</b> · 탈 예정 18/28명
          </span>
        </p>
        <div class="mt-2.5 flex items-center gap-x-3 rounded-xl border border-green-7 bg-green-3 px-3.5 py-3">
          <PhCheckCircleFill class="shrink-0 text-2xl text-green-11" />
          <span class="flex min-w-0 flex-col">
            <span class="font-bold text-green-11">탈 수 있어요</span>
            <span class="text-xs font-medium text-sand-12">데모 학생 · 한성대학교</span>
            <span class="mt-0.5 text-xs font-semibold break-keep text-sand-12">
              장위시장에서 내려요 · 집까지 걸어서 4분
            </span>
          </span>
        </div>
      </div>
    </Preview>
  );
}

export function DriverPreview() {
  const stops = [
    { time: at(0, 42), name: "동덕여대후문", kind: "board" as const },
    { time: at(0, 46), name: "장위시장", kind: "alight" as const, off: 2 },
    { time: at(0, 51), name: "어해랑앞", kind: "skip" as const },
    { time: at(0, 56), name: "상계주공2단지", kind: "alight" as const, off: 1, next: true },
  ];
  return (
    <Preview label="기사님 화면 예시: 탄 학생이 내리는 정류장에는 내릴 학생 수가, 아무도 내리지 않는 정류장에는 지나쳐요가 표시돼요">
      <div class="px-3.5 pt-3 pb-3.5">
        <p class="font-bold">기사님 화면</p>
        <p class="mt-1 text-xs font-semibold break-keep">탄 학생이 내리지 않는 정류장 1곳은 들르지 않고 지나가요.</p>
        <ul class="mt-2.5 overflow-hidden rounded-xl border border-sand-4">
          <For each={stops}>
            {(stop, i) => (
              <li
                class={[
                  "flex items-center gap-x-3 px-3 py-2",
                  i() > 0 && "border-t border-sand-4",
                  stop.next && "bg-amber-3",
                  stop.kind === "skip" && "text-sand-10",
                ]}
              >
                <span class="w-10 shrink-0 text-xs font-medium tabular-nums">{formatClock(stop.time)}</span>
                <span class="flex min-w-0 flex-1 flex-col">
                  <span class={["text-sm font-semibold break-keep", stop.kind === "skip" && "line-through"]}>
                    {stop.name}
                  </span>
                  <span class="text-xs font-medium text-sand-11">
                    {stop.kind === "board"
                      ? "타는 곳"
                      : stop.kind === "skip"
                        ? "내리는 학생이 없어 지나쳐요"
                        : "내리는 곳"}
                    <Show when={stop.next}> · 다음 정류장</Show>
                  </span>
                </span>
                <Show when={stop.off}>
                  {(off) => (
                    <span class="flex shrink-0 items-center gap-x-1 text-sm font-bold text-amber-11 tabular-nums">
                      <PhCheckBold class="text-xs" />
                      {off()}명
                    </span>
                  )}
                </Show>
                <Show when={stop.kind === "skip"}>
                  <PhMinusBold class="shrink-0 text-sm text-sand-10" />
                </Show>
              </li>
            )}
          </For>
        </ul>
      </div>
    </Preview>
  );
}
