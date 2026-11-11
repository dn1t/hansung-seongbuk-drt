import { Title } from "@solidjs/meta";
import { useSearchParams } from "@solidjs/router";
import type { JSX } from "@solidjs/web";
import { createMemo, createSignal, Errored, For, Loading, Match, onSettled, Show, Switch } from "solid-js";
import { env } from "virtual:solid-env/client";

import { RouteDots, Wordmark } from "../../components/layout/screen";
import { BarList, Columns } from "../../components/operator/bars";
import { PlanMap } from "../../components/operator/plan-map";
import {
  type ResearchParams,
  researchInput,
  researchQuery,
  Steps,
  Summary,
} from "../../components/operator/research-view";
import { getResearchPlan, getSurveyReport, type ResearchFilter } from "../../lib/research";

const SLIDES = [
  "표지",
  "누가 답했나요",
  "언제, 어떻게 집에 가나요",
  "얼마나 자주, 얼마에",
  "노선을 만드는 순서",
  "결과",
  "지도",
];

export default function Present() {
  const [params] = useSearchParams<ResearchParams>();
  const plan = createMemo(() => getResearchPlan(researchInput(params)));
  const filter = createMemo((): ResearchFilter => {
    const input = researchInput(params);
    return input.demo ? (input.real ? "all" : "demo") : "real";
  });
  const report = createMemo(() => getSurveyReport(filter()));
  const [index, setIndex] = createSignal(0);
  const [slot, setSlot] = createSignal<string>();

  const go = (step: number) => setIndex((current) => Math.min(SLIDES.length - 1, Math.max(0, current + step)));

  onSettled(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;
      if (["ArrowRight", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        go(1);
      } else if (["ArrowLeft", "PageUp"].includes(e.key)) {
        e.preventDefault();
        go(-1);
      } else if (e.key === "Home") {
        setIndex(0);
      } else if (e.key === "End") {
        setIndex(SLIDES.length - 1);
      } else if (e.key === "f") {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const dataLabel = () => {
    const { input, respondents } = plan();
    const parts = [
      ...(input.real ? [`실제 응답 ${respondents.real}명`] : []),
      ...(input.demo ? [`데모 ${respondents.demo}명`] : []),
    ];
    return `${parts.join(" + ") || "답변 없음"} · ${input.demand === "all" ? "모두 탄다면" : "답한 횟수만큼 탄다면"}`;
  };

  return (
    <div class="flex h-dvh flex-col overflow-hidden bg-sand-1 px-12 pt-8 pb-6 text-sand-12">
      <Title>{`발표 - ${env.VITE_APP_NAME}`}</Title>
      <Errored
        fallback={(_, reset) => (
          <div class="m-auto max-w-md text-center">
            <p class="text-2xl font-bold">발표 화면을 열지 못했어요.</p>
            <button type="button" class="mt-3 cursor-pointer text-lg font-semibold text-amber-11" onClick={reset}>
              다시 불러오기
            </button>
          </div>
        )}
      >
        <Loading fallback={<div class="flex-1" />}>
          <header class="flex items-center gap-x-4">
            <Wordmark />
            <span class="text-lg font-semibold text-sand-11">{SLIDES[index()]}</span>
            <Show when={plan().input.demo}>
              <span class="rounded-sm bg-sand-3 px-2 py-0.5 text-sm font-semibold text-sand-11">데모 데이터 포함</span>
            </Show>
            <a
              href={`/operator/simulate?${researchQuery(plan().input)}`}
              class="ml-auto flex items-center gap-x-1.5 font-semibold text-sand-11 hover:text-sand-12"
            >
              <PhXBold aria-hidden="true" />
              발표 끝내기
            </a>
          </header>

          <main class="flex min-h-0 flex-1 flex-col py-8" aria-live="polite">
            <Switch>
              <Match when={index() === 0}>
                <div class="my-auto">
                  <RouteDots current={1} total={5} spacing="wide" />
                  <h1 class="mt-8 max-w-4xl text-7xl leading-[1.1] font-bold tracking-[-0.03em] text-balance break-keep">
                    가입 조사로 만든 하룻밤 노선
                  </h1>
                  <p class="mt-6 text-3xl font-medium break-keep text-sand-11">
                    성북구 대학생 전용 심야 귀가 버스, 신청한 학생의 집 방향으로 그날 노선이 생겨요.
                  </p>
                  <p class="mt-12 text-2xl font-semibold tabular-nums">{dataLabel()}</p>
                </div>
              </Match>
              <Match when={index() === 1}>
                <Slide title={`${report().totals.shown.toLocaleString()}명이 답했어요`}>
                  <Pair
                    left={["학교", <BarList large items={report().schools} total={report().totals.shown} />]}
                    right={["사는 곳", <BarList large items={report().districts} total={report().totals.shown} />]}
                  />
                </Slide>
              </Match>
              <Match when={index() === 2}>
                <Slide title="언제, 어떻게 집에 가나요">
                  <Pair
                    left={["집에 가는 시간", <Columns large items={report().slots} />]}
                    right={["지금 막차 뒤에는", <BarList large items={report().ways} total={report().totals.shown} />]}
                  />
                </Slide>
              </Match>
              <Match when={index() === 3}>
                <Slide title="얼마나 자주, 얼마에 탈까요">
                  <Pair
                    left={[
                      "시험·축제 기간에",
                      <BarList large items={report().frequency} total={report().totals.shown} />,
                    ]}
                    right={[
                      "한 번에 낼 수 있는 요금",
                      <BarList large items={report().fares} total={report().totals.shown} />,
                    ]}
                  />
                </Slide>
              </Match>
              <Match when={index() === 4}>
                <Slide title="노선은 이렇게 만들어요">
                  <div class="max-w-5xl">
                    <Steps large plan={plan()} />
                  </div>
                </Slide>
              </Match>
              <Match when={index() === 5}>
                <Slide title={`버스 ${plan().buses.length}대로 ${plan().riders.total - plan().unplaced}명이 집에 가요`}>
                  <Summary large plan={plan()} />
                </Slide>
              </Match>
              <Match when={index() === 6}>
                <Slide title="노선 지도">
                  <div class="flex min-h-0 flex-1 gap-x-8">
                    <PlanMap
                      buses={plan().buses.filter((bus) => !slot() || bus.slot === slot())}
                      class="h-full flex-1"
                      label={`${slot() ?? "모든 시간"} 출발 버스 노선 지도`}
                    />
                    <ul class="flex w-72 shrink-0 flex-col gap-y-1 overflow-y-auto">
                      <SlotRow active={!slot()} onClick={() => setSlot(undefined)}>
                        <span>모든 시간</span>
                        <span>{plan().buses.length}대</span>
                      </SlotRow>
                      <For each={plan().slots}>
                        {(entry) => (
                          <SlotRow active={slot() === entry.slot} onClick={() => setSlot(entry.slot)}>
                            <span>{entry.slot}</span>
                            <span class="font-medium text-sand-11">
                              {entry.buses}대 · {entry.riders}명
                            </span>
                          </SlotRow>
                        )}
                      </For>
                    </ul>
                  </div>
                </Slide>
              </Match>
            </Switch>
          </main>

          <footer class="flex items-center gap-x-6 text-lg">
            <span class="font-medium text-sand-11 tabular-nums">{dataLabel()}</span>
            <span class="ml-auto font-semibold text-sand-11 tabular-nums">
              {index() + 1} / {SLIDES.length}
            </span>
            <div class="flex gap-x-2">
              <NavButton label="이전" disabled={index() === 0} onClick={() => go(-1)}>
                <PhArrowLeftBold aria-hidden="true" />
              </NavButton>
              <NavButton label="다음" disabled={index() === SLIDES.length - 1} onClick={() => go(1)}>
                <PhArrowRightBold aria-hidden="true" />
              </NavButton>
            </div>
          </footer>
        </Loading>
      </Errored>
    </div>
  );
}

function Slide(props: { title: string; children: JSX.Element }) {
  return (
    <section class="flex min-h-0 flex-1 flex-col">
      <h1 class="text-5xl leading-tight font-bold tracking-[-0.03em] break-keep tabular-nums">{props.title}</h1>
      <div class="mt-10 flex min-h-0 flex-1 flex-col">{props.children}</div>
    </section>
  );
}

function Pair(props: { left: [string, JSX.Element]; right: [string, JSX.Element] }) {
  return (
    <div class="grid grid-cols-2 gap-x-16">
      <For each={[props.left, props.right]}>
        {([title, body]) => (
          <section class="min-w-0">
            <h2 class="text-2xl font-bold text-sand-11">{title}</h2>
            <div class="mt-6">{body}</div>
          </section>
        )}
      </For>
    </div>
  );
}

function SlotRow(props: { active: boolean; onClick: () => void; children: JSX.Element }) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={props.active ? "true" : "false"}
        class={[
          "flex h-12 w-full cursor-pointer items-center justify-between rounded-xl px-4 text-lg font-semibold tabular-nums",
          props.active ? "bg-amber-3 text-amber-11" : "hover:bg-sand-3",
        ]}
        onClick={() => props.onClick()}
      >
        {props.children}
      </button>
    </li>
  );
}

function NavButton(props: { label: string; disabled: boolean; onClick: () => void; children: JSX.Element }) {
  return (
    <button
      type="button"
      aria-label={props.label}
      disabled={props.disabled}
      class="flex size-12 cursor-pointer items-center justify-center rounded-xl bg-sand-3 text-xl hover:bg-sand-4 disabled:cursor-not-allowed disabled:text-sand-9"
      onClick={() => props.onClick()}
    >
      {props.children}
    </button>
  );
}
