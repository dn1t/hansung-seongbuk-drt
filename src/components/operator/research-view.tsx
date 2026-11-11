import { For } from "solid-js";

import type { ResearchPlan, ResearchPlanInput } from "../../lib/research";
import { formatMinutes } from "../../lib/time";

export type NumberKey = "capacity" | "minRiders" | "maxWalkMeters" | "maxRideMinutes";

export type ResearchParams = Partial<Record<"real" | "demo" | "demand" | NumberKey, string>>;

export function researchInput(params: ResearchParams): Partial<ResearchPlanInput> {
  const number = (value: string | undefined) => (value ? Number(value) : undefined);
  return {
    real: params.real !== "0",
    demo: params.demo === "1",
    demand: params.demand === "typical" ? "typical" : "all",
    capacity: number(params.capacity),
    minRiders: number(params.minRiders),
    maxWalkMeters: number(params.maxWalkMeters),
    maxRideMinutes: number(params.maxRideMinutes),
  };
}

export function researchQuery(input: ResearchPlanInput) {
  const query = new URLSearchParams({
    real: input.real ? "1" : "0",
    demo: input.demo ? "1" : "0",
    demand: input.demand,
    capacity: String(input.capacity),
    minRiders: String(input.minRiders),
    maxWalkMeters: String(input.maxWalkMeters),
    maxRideMinutes: String(input.maxRideMinutes),
  });
  return query.toString();
}

export const percent = (share: number) => `${Math.round(share * 100)}%`;

export function Summary(props: { plan: ResearchPlan; large?: boolean }) {
  const items = () => {
    const { plan } = props;
    return [
      ["탄 학생", `${plan.riders.total - plan.unplaced}명`, `실제 ${plan.riders.real}명 · 데모 ${plan.riders.demo}명`],
      ["버스", `${plan.buses.length}대`, `${plan.slots.length}개 시간대에 나눠 출발`],
      ["자리 채움", percent(plan.stats.seatShare), `정원 ${plan.input.capacity}명 기준`],
      [
        "평균 탑승",
        formatMinutes(Math.round(plan.stats.averageRide)),
        `가장 긴 학생 ${formatMinutes(Math.round(plan.stats.longestRide))}`,
      ],
      [
        "내려서 집까지",
        `걸어서 ${Math.round(plan.stats.averageWalk)}분`,
        `${percent(plan.stats.withinWalk)}가 ${plan.input.maxWalkMeters}m 안`,
      ],
      ["내리는 정류장", `${plan.stats.dropStops}곳`, `타는 곳 ${plan.stats.boardStops}곳`],
      ["버스가 달린 시간", formatMinutes(plan.stats.busMinutes), "모든 버스를 더한 시간"],
      [
        "못 태운 학생",
        `${plan.unplaced}명`,
        plan.unplaced > 0 ? "출발지나 시간대를 찾지 못했어요" : "모두 버스에 탔어요",
      ],
    ] as const;
  };
  return (
    <dl
      class={[
        "mt-4 grid gap-px overflow-hidden rounded-2xl border border-sand-4 bg-sand-4",
        props.large ? "grid-cols-4" : "grid-cols-2 md:grid-cols-4",
      ]}
    >
      <For each={items()}>
        {([term, value, note]) => (
          <div class={["flex flex-col bg-sand-2", props.large ? "px-6 py-5" : "px-4 py-3.5"]}>
            <dt class={["font-semibold text-sand-11", props.large ? "text-lg" : "text-sm"]}>{term}</dt>
            <dd class={["font-bold tabular-nums", props.large ? "mt-1 text-4xl" : "mt-0.5 text-2xl"]}>{value}</dd>
            <dd
              class={["font-medium break-keep text-sand-11 tabular-nums", props.large ? "mt-1 text-base" : "text-sm"]}
            >
              {note}
            </dd>
          </div>
        )}
      </For>
    </dl>
  );
}

export function stepsOf(plan: ResearchPlan) {
  return [
    ["30분 시간대로 나눠요", `학생 ${plan.riders.total}명이 고른 시간을 보고 ${plan.steps.slots}개 시간대로 나눴어요.`],
    [
      "학교에서 본 방향으로 묶어요",
      `집 방향 순서대로 돌면서, 정원 ${plan.input.capacity}명이나 탑승 ${plan.input.maxRideMinutes}분을 넘으면 새 버스로 나눠 ${plan.steps.groups}묶음이 됐어요.`,
    ],
    [
      "집 가까운 정류장을 골라요",
      `걸어갈 수 있는 학생이 가장 많은 정류장부터 골라 ${plan.stats.dropStops}곳에 서요. ${percent(plan.stats.withinWalk)}가 ${plan.input.maxWalkMeters}m 안에서 내려요.`,
    ],
    ["정류장 순서를 정해요", "가장 가까운 정류장부터 잇고, 길이 엇갈리는 곳을 풀어(2-opt) 다시 짧게 만들어요."],
    [
      "적은 버스를 합쳐요",
      `옆 묶음으로 옮겨야 더 짧은 학생 ${plan.steps.moved}명을 옮기고, ${plan.input.minRiders}명보다 적은 버스를 ${plan.steps.merged}번 합쳐 ${plan.buses.length}대가 됐어요.`,
    ],
  ] as const;
}

export function Steps(props: { plan: ResearchPlan; large?: boolean }) {
  return (
    <ol class={["grid px-1", props.large ? "grid-cols-1 gap-y-7" : "mt-5 gap-x-8 gap-y-5 md:grid-cols-2"]}>
      <For each={stepsOf(props.plan)}>
        {([title, detail], index) => (
          <li class={["flex", props.large ? "gap-x-5" : "gap-x-3.5"]}>
            <span
              class={[
                "flex shrink-0 items-center justify-center rounded-full bg-sand-3 font-semibold tabular-nums",
                props.large ? "size-11 text-xl" : "size-7 text-sm",
              ]}
            >
              {index() + 1}
            </span>
            <span class="flex min-w-0 flex-col">
              <span class={["font-semibold", props.large ? "text-2xl" : ""]}>{title}</span>
              <span
                class={["font-medium break-keep text-sand-11 tabular-nums", props.large ? "mt-1 text-lg" : "text-sm"]}
              >
                {detail}
              </span>
            </span>
          </li>
        )}
      </For>
    </ol>
  );
}
