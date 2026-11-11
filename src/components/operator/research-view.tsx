import { For } from "solid-js";

import type { ResearchPlan, ResearchPlanInput } from "../../lib/research";
import { formatMinutes } from "../../lib/time";

export type NumberKey = "capacity" | "minRiders" | "maxWalkMeters" | "maxRideMinutes";

export type ResearchParams = Partial<Record<"real" | "demo" | "demand" | "fold" | NumberKey, string>>;

export function researchInput(params: ResearchParams): Partial<ResearchPlanInput> {
  const input: Partial<ResearchPlanInput> = {
    real: params.real !== "0",
    demo: params.demo === "1",
    demand: params.demand === "typical" ? "typical" : "all",
  };
  if (params.fold === "0" || params.fold === "1") input.foldThinSlots = params.fold === "1";
  for (const key of ["capacity", "minRiders", "maxWalkMeters", "maxRideMinutes"] as const) {
    const value = Number(params[key]);
    if (params[key] && Number.isFinite(value)) input[key] = value;
  }
  return input;
}

export function researchQuery(input: ResearchPlanInput) {
  const query = new URLSearchParams({
    real: input.real ? "1" : "0",
    demo: input.demo ? "1" : "0",
    demand: input.demand,
    fold: input.foldThinSlots ? "1" : "0",
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
      [
        "버스가 달린 시간",
        formatMinutes(plan.stats.busMinutes),
        `학생 한 명에 ${(plan.stats.busMinutes / Math.max(1, plan.riders.total - plan.unplaced)).toFixed(1)}분`,
      ],
      plan.unplaced > 0
        ? ["못 태운 학생", `${plan.unplaced}명`, "출발지나 시간대를 찾지 못했어요"]
        : [
            "다음 시간대 버스를 타는 학생",
            `${plan.stats.later}명`,
            plan.stats.earlier > 0
              ? `고른 시간보다 늦게 출발 · 앞 시간대 ${plan.stats.earlier}명`
              : "고른 시간보다 늦게 출발해요",
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
      <For each={items()} keyed={false}>
        {(item) => (
          <div class={["flex flex-col bg-sand-2", props.large ? "px-6 py-5" : "px-4 py-3.5"]}>
            <dt class={["font-semibold text-sand-11", props.large ? "text-lg" : "text-sm"]}>{item()[0]}</dt>
            <dd class={["font-bold tabular-nums", props.large ? "mt-1 text-4xl" : "mt-0.5 text-2xl"]}>{item()[1]}</dd>
            <dd
              class={["font-medium break-keep text-sand-11 tabular-nums", props.large ? "mt-1 text-base" : "text-sm"]}
            >
              {item()[2]}
            </dd>
          </div>
        )}
      </For>
    </dl>
  );
}

export function stepsOf(plan: ResearchPlan) {
  const folded = !plan.input.foldThinSlots
    ? "한산한 시간대도 합치지 않고 고른 시간 그대로 출발해요."
    : plan.steps.waiting > 0
      ? `버스 한 대를 못 채우는 시간대의 학생 ${plan.steps.waiting}명은 다음 시간대와 합쳐, 30분 뒤에 방향별 버스로 출발해요.`
      : "합쳐서 나아지는 한산한 시간대는 없었어요.";
  return [
    [
      plan.input.foldThinSlots ? "시간대로 나누고, 한산한 시간대는 합쳐요" : "30분 시간대로 나눠요",
      `학생 ${plan.riders.total}명을 고른 30분 시간대 ${plan.steps.slots}개로 나눠요. ${folded}`,
    ],
    [
      "집 방향으로 묶어요",
      `집 방향 순서대로 돌면서, 정원 ${plan.input.capacity}명이나 탑승 ${plan.input.maxRideMinutes}분을 넘으면 새 버스로 나눠 ${plan.steps.groups}묶음이 됐어요.`,
    ],
    [
      "버스 사이에서 학생을 옮겨요",
      `같은 시간대 버스끼리, 옮기면 전체 운행 시간이 줄어드는 학생 ${plan.steps.moved}명을 옮겼어요. 같은 학교에 버스 두 대가 서는 일이 줄어요.`,
    ],
    [
      "정류장을 고르고 순서를 정해요",
      `걸어갈 수 있는 학생이 가장 많은 정류장부터 고르고, 조금 더 걸어도 버스가 덜 돌면 정류장을 옮기거나 빼요. ${plan.stats.dropStops}곳에 서고 ${percent(plan.stats.withinWalk)}가 ${plan.input.maxWalkMeters}m 안에서 내려요. 순서는 가까운 곳부터 잇고 엇갈린 길을 풀어요(2-opt).`,
    ],
    [
      "적은 버스를 합쳐요",
      `${plan.input.minRiders}명보다 적은 버스를 방향이 비슷한 옆 버스와 합쳐, ${plan.steps.merged}대를 줄이고 ${plan.buses.length}대가 됐어요.`,
    ],
  ] as const;
}

export function Steps(props: { plan: ResearchPlan; large?: boolean }) {
  return (
    <ol class={["grid px-1", props.large ? "grid-cols-1 gap-y-7" : "mt-5 gap-x-8 gap-y-5 md:grid-cols-2"]}>
      <For each={stepsOf(props.plan)} keyed={false}>
        {(step, index) => (
          <li class={["flex", props.large ? "gap-x-5" : "gap-x-3.5"]}>
            <span
              class={[
                "flex shrink-0 items-center justify-center rounded-full bg-sand-3 font-semibold tabular-nums",
                props.large ? "size-11 text-xl" : "size-7 text-sm",
              ]}
            >
              {index + 1}
            </span>
            <span class="flex min-w-0 flex-col">
              <span class={["font-semibold", props.large ? "text-2xl" : ""]}>{step()[0]}</span>
              <span
                class={["font-medium break-keep text-sand-11 tabular-nums", props.large ? "mt-1 text-lg" : "text-sm"]}
              >
                {step()[1]}
              </span>
            </span>
          </li>
        )}
      </For>
    </ol>
  );
}
