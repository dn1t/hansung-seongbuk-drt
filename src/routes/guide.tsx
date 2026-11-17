import { Title } from "@solidjs/meta";
import { useNavigate } from "@solidjs/router";
import type { JSX } from "@solidjs/web";
import { For, Show } from "solid-js";
import { env } from "virtual:solid-env/client";

import {
  DriverPreview,
  NearbyRoutesPreview,
  ReaderPreview,
  RouteDetailPreview,
  SlotRoutesPreview,
} from "../components/guide/previews";
import { Header, RouteDots } from "../components/layout/screen";
import { RouteTimeline, type TimelineRow } from "../components/ride/route-timeline";

interface Step {
  title: string;
  description: string;
  where?: string[];
  extra?: JSX.Element;
}

const BEFORE: TimelineRow[] = [
  { key: "a", name: "탑승자 내림", mark: "route", below: "route" },
  { key: "b", name: "미탑승자 하차", mark: "route", below: "route" },
  { key: "c", name: "탑승자 내림", mark: "route" },
];

const AFTER: TimelineRow[] = [
  { key: "a", name: "탑승자 내림", mark: "alight", below: "rider" },
  { key: "b", name: "들르지 않아요", mark: "skip", below: "rider" },
  { key: "c", name: "탑승자 내림", mark: "alight" },
];

export default function Guide() {
  const nav = useNavigate();
  const back = () => (window.history.length > 1 ? window.history.back() : nav("/"));

  const booking: Step[] = [
    {
      title: "시간대별 전체 노선을 봐요",
      description:
        "사전 신청으로 만들어진 노선을 시간대마다 볼 수 있어요. 고를 수 있는 노선을 미리 비교해서 귀가 계획을 세우기 쉬워요.",
      where: ["사전 신청", "시간대별 노선 보기"],
      extra: <SlotRoutesPreview />,
    },
    {
      title: "바꾼 신청은 ‘오늘 귀가’에 반영돼요",
      description: "탑승 30분 전까지 바꾼 내용으로, 내 집 근처로 가는 노선을 골라 탈 수 있게 보여 줘요.",
      where: ["오늘 귀가", "내 집 근처로 가는 노선"],
      extra: <NearbyRoutesPreview />,
    },
    {
      title: "노선을 고르면 자세히 알려 줘요",
      description: "위치 서비스를 허용하면 지금 있는 곳에서 가까운 정류장을 기준으로 보여 줘요.",
      where: ["오늘 귀가", "노선 선택"],
      extra: <RouteDetailPreview />,
    },
  ];

  const boarding: Step[] = [
    {
      title: "버스에 탈 때 QR을 찍어요",
      description:
        "버스 단말기에 내 QR을 보여 주면 학생인지와 실제로 탔는지를 함께 확인해요. QR은 1분마다 바뀌고, 캡처한 QR은 10분이 지나면 쓸 수 없어요.",
      where: ["내 QR"],
      extra: <ReaderPreview />,
    },
    {
      title: "실제로 탄 학생의 하차 정류장을 확인해요",
      description: "찍힌 QR을 바탕으로, 타지 않은 학생만 내릴 예정이던 정류장을 가려내요.",
      extra: <DriverPreview />,
    },
    {
      title: "아무도 내리지 않는 정류장은 지나가요",
      description:
        "탄 학생 중 아무도 내리지 않는 정류장은 들르지 않아서 돌아가는 길이 줄어요. 기사님 화면에는 ‘지나쳐요’로 표시돼요.",
    },
  ];

  return (
    <div class="flex flex-1 flex-col px-5 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <Title>{`이용 설명서 - ${env.VITE_APP_NAME}`}</Title>
      <Header
        title="이용 설명서"
        description="신청부터 집 근처에서 내리기까지, 심야 귀가 버스를 타는 방법이에요."
        onBackClick={back}
      />

      <section class="mt-10" aria-labelledby="guide-booking">
        <h2 id="guide-booking" class="px-1 text-xl font-bold text-balance break-keep">
          탑승 30분 전까지 바꾸고, 오늘 귀가에서 노선을 골라요
        </h2>
        <div class="mt-4 flex items-start gap-x-3 rounded-2xl bg-sand-2 px-4 py-3.5">
          <PhClockBold aria-hidden="true" class="mt-0.5 shrink-0 text-lg text-amber-11" />
          <p class="flex flex-col gap-y-0.5 break-keep">
            <span class="font-semibold text-balance">날짜와 시간, 가는 곳은 탑승 시간 30분 전까지 바꿀 수 있어요.</span>
            <span class="text-sm font-medium text-sand-11">취소는 그 뒤에도 할 수 있어요.</span>
          </p>
        </div>
        <Steps steps={booking} />
      </section>

      <section class="mt-12 border-t border-sand-6 pt-10" aria-labelledby="guide-boarding">
        <h2 id="guide-boarding" class="px-1 text-xl font-bold text-balance break-keep">
          QR로 실제 탄 학생을 확인해, 필요 없는 경유를 줄여요
        </h2>
        <p class="mt-2 px-1 font-medium text-balance break-keep text-sand-11">
          타지 않은 학생만 내릴 정류장은 건너뛰고, 탄 학생들의 집 방향으로 달려요.
        </p>
        <Steps steps={boarding} />
        <SkipExample />
      </section>

      <section class="mt-12 border-t border-sand-6 px-1 pt-10">
        <RouteDots current={4} total={4} spacing="wide" />
        <h2 class="mt-5 text-xl font-bold text-balance break-keep">핵심은 집에 가는 시간을 줄이는 것</h2>
        <p class="mt-1.5 font-medium text-balance break-keep text-sand-11">
          실제로 탄 학생에 맞춰 필요 없는 정류장을 거치지 않고, 귀가 시간을 줄이는 게 목표예요.
        </p>
        <ul class="mt-5 flex flex-col gap-y-1.5 text-sm font-medium break-keep text-sand-11">
          <li>다른 탑승자가 내리는 정류장은 그대로 들러요.</li>
          <li>노쇼를 확정하는 시점과 세부 노선을 조정하는 기준은 앞으로 정할 예정이에요.</li>
        </ul>
        <p class="mt-10 text-sm font-semibold text-sand-11">하이파이브 · 데모 운영 구상</p>
      </section>
    </div>
  );
}

function Steps(props: { steps: Step[] }) {
  return (
    <ol class="mt-6 flex flex-col gap-y-6">
      <For each={props.steps}>
        {(step, index) => (
          <li class="relative flex gap-x-3.5">
            <Show when={index() < props.steps.length - 1}>
              <span aria-hidden="true" class="absolute top-8 -bottom-5 left-3.25 w-0.5 rounded-full bg-sand-6" />
            </Show>
            <div class="flex aspect-square h-max w-7 shrink-0 items-center justify-center rounded-full bg-sand-3 text-sm font-semibold tabular-nums">
              {index() + 1}
            </div>
            <div class="flex min-w-0 flex-1 flex-col">
              <h3 class="font-semibold text-balance break-keep">{step.title}</h3>
              <p class="mt-0.5 text-sm break-keep text-sand-11">{step.description}</p>
              <Show when={step.where}>
                {(where) => (
                  <p class="mt-2 flex flex-wrap items-center gap-x-1 text-sm font-semibold text-sand-12">
                    <span class="sr-only">찾는 곳:</span>
                    <For each={where()}>
                      {(part, i) => (
                        <>
                          <Show when={i() > 0}>
                            <PhCaretRightBold aria-hidden="true" class="text-xs text-sand-8" />
                          </Show>
                          <span>{part}</span>
                        </>
                      )}
                    </For>
                  </p>
                )}
              </Show>
              {step.extra}
            </div>
          </li>
        )}
      </For>
    </ol>
  );
}

function SkipExample() {
  return (
    <figure class="mt-6 rounded-2xl border border-sand-4 px-4 pt-3.5 pb-4">
      <div class="grid grid-cols-2 gap-x-4">
        <div>
          <p class="text-sm font-bold text-sand-11">신청 기준</p>
          <RouteTimeline class="mt-3" rows={BEFORE} />
        </div>
        <div>
          <p class="text-sm font-bold text-amber-11">탑승 확인 후</p>
          <RouteTimeline class="mt-3" rows={AFTER} />
        </div>
      </div>
      <figcaption class="mt-3.5 border-t border-sand-4 pt-3 text-sm break-keep text-sand-11">
        가운데 정류장은 타지 않은 학생만 내릴 곳이라, 탑승을 확인한 뒤에는 들르지 않고 지나가요.
      </figcaption>
    </figure>
  );
}
