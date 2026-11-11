import { Title } from "@solidjs/meta";
import { useSearchParams } from "@solidjs/router";
import { createMemo, createSignal, Errored, For, isPending, Loading, Show } from "solid-js";
import { env } from "virtual:solid-env/client";

import { Button } from "../../components/common/button";
import { SectionRule } from "../../components/layout/screen";
import { BusCard } from "../../components/operator/bus-card";
import { PlanMap } from "../../components/operator/plan-map";
import {
  type NumberKey,
  type ResearchParams,
  researchInput,
  researchQuery,
  Steps,
  Summary,
} from "../../components/operator/research-view";
import { type Demand, getResearchPlan, type ResearchPlan } from "../../lib/research";
import { slotRange } from "../../lib/time";

const NUMBER_FIELDS: { key: NumberKey; label: string; unit: string }[] = [
  { key: "capacity", label: "버스 정원", unit: "명" },
  { key: "minRiders", label: "버스 한 대 최소 인원", unit: "명" },
  { key: "maxWalkMeters", label: "정류장에서 집까지", unit: "m" },
  { key: "maxRideMinutes", label: "가장 긴 탑승 시간", unit: "분" },
];

export default function OperatorSimulate() {
  const [params, setParams] = useSearchParams<ResearchParams>();
  const plan = createMemo(() => getResearchPlan(researchInput(params)));
  const [slot, setSlot] = createSignal<string>();
  const [selected, setSelected] = createSignal<string>();
  const [draft, setDraft] = createSignal<Partial<Record<NumberKey, string>>>({});

  const working = createMemo(() => isPending(() => plan()));
  const value = (key: NumberKey) => draft()[key] ?? String(plan().input[key]);
  const changed = () => Object.entries(draft()).some(([key, next]) => next !== String(plan().input[key as NumberKey]));
  const shown = createMemo(() => plan().buses.filter((bus) => !slot() || bus.slot === slot()));
  const groups = createMemo(() => {
    const bySlot = new Map<string, ResearchPlan["buses"]>();
    for (const bus of shown()) bySlot.set(bus.slot, [...(bySlot.get(bus.slot) ?? []), bus]);
    return [...bySlot].map(([key, buses]) => ({ slot: key, buses }));
  });

  function apply() {
    const next = { ...draft() };
    setDraft({});
    setSelected(undefined);
    setParams(next);
  }

  function resetNumbers() {
    setDraft({});
    setSelected(undefined);
    setParams({ capacity: undefined, minRiders: undefined, maxWalkMeters: undefined, maxRideMinutes: undefined });
  }

  return (
    <>
      <Title>{`모의 노선 - 운영 - ${env.VITE_APP_NAME}`}</Title>
      <Errored
        fallback={(_, reset) => (
          <div class="px-1">
            <h1 class="text-3xl font-bold">모의 노선</h1>
            <p class="mt-4 font-semibold">노선을 만들지 못했어요.</p>
            <button type="button" class="mt-2 cursor-pointer font-semibold text-amber-11" onClick={reset}>
              다시 만들기
            </button>
          </div>
        )}
      >
        <Loading fallback={<div class="h-96" />}>
          <header class="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 px-1">
            <div class="min-w-0">
              <h1 class="text-3xl font-bold">모의 노선</h1>
              <p class="mt-2 max-w-2xl font-medium text-balance break-keep text-sand-11">
                가입 조사 답변을 하룻밤의 신청으로 보고 노선을 만들어요. 운행일과 학생 화면에는 영향이 없어요.
              </p>
            </div>
            <a
              href={`/operator/present?${researchQuery(plan().input)}`}
              class="flex h-13 items-center gap-x-2 rounded-xl bg-sand-4 px-5 font-bold hover:bg-sand-5"
            >
              <PhPresentationChartBold aria-hidden="true" class="text-lg" />
              발표 화면으로
            </a>
          </header>

          <SectionRule title="조건" class="mt-10" />
          <div class="mt-4 flex flex-wrap items-start gap-x-10 gap-y-5 px-1">
            <fieldset class="flex flex-col gap-y-1.5">
              <legend class="mb-1.5 text-sm font-semibold text-sand-11">쓸 답변</legend>
              <div class="flex h-13 items-center gap-x-5">
                <Check
                  label={`실제 응답 ${plan().respondents.real}명`}
                  checked={plan().input.real}
                  onChange={(on) => setParams({ real: on ? undefined : "0" })}
                />
                <Check
                  label={`데모 ${plan().respondents.demo}명`}
                  checked={plan().input.demo}
                  onChange={(on) => setParams({ demo: on ? "1" : undefined })}
                />
              </div>
            </fieldset>
            <fieldset class="flex flex-col gap-y-1.5">
              <legend class="mb-1.5 text-sm font-semibold text-sand-11">이날 탈 학생</legend>
              <DemandTabs
                value={plan().input.demand}
                onChange={(demand) => setParams({ demand: demand === "all" ? undefined : demand })}
              />
            </fieldset>
          </div>
          <p class="mt-2 px-1 text-sm font-medium break-keep text-sand-11">
            {plan().input.demand === "all"
              ? "답한 학생이 모두 같은 밤에 탄다고 봐요. 가장 붐비는 밤이에요."
              : "답한 횟수만큼 탄다고 봐요. 주 4일 이상은 10번 중 9번, 주 2–3일은 반, 주 1일쯤은 5번 중 1번, 거의 안 탄다는 10번 중 1번이에요."}
          </p>
          <form
            class="mt-6 flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              apply();
            }}
          >
            <For each={NUMBER_FIELDS}>
              {(field) => (
                <label class="flex w-44 flex-col gap-y-1.5">
                  <span class="ml-1 text-sm font-semibold text-sand-11">{field.label}</span>
                  <span class="flex h-13 items-center rounded-xl border border-sand-5 bg-sand-2 pr-4 focus-within:border-amber-8 focus-within:ring-2 focus-within:ring-amber-5">
                    <input
                      type="number"
                      inputmode="numeric"
                      min={plan().limits[field.key].min}
                      max={plan().limits[field.key].max}
                      step="1"
                      required
                      value={value(field.key)}
                      class="h-full min-w-0 flex-1 rounded-xl bg-transparent px-4 text-lg tabular-nums caret-amber-9 focus:outline-none"
                      onInput={(e) => {
                        const next = e.currentTarget.value;
                        setDraft((current) => ({ ...current, [field.key]: next }));
                      }}
                    />
                    <span class="shrink-0 font-semibold text-sand-11">{field.unit}</span>
                  </span>
                </label>
              )}
            </For>
            <Button type="submit" class="w-44" variant={working() ? "loading" : changed() ? "primary" : "disabled"}>
              이 조건으로 만들기
            </Button>
          </form>
          <p class="mt-3 px-1 text-sm font-medium break-keep text-sand-11 tabular-nums">
            운행 설정 값은 정원 {plan().defaults.capacity}명 · 최소 {plan().defaults.minRiders}명 ·{" "}
            {plan().defaults.maxWalkMeters}m · {plan().defaults.maxRideMinutes}분이에요.{" "}
            <Show when={NUMBER_FIELDS.some((field) => plan().input[field.key] !== plan().defaults[field.key])}>
              <button type="button" class="cursor-pointer font-semibold text-amber-11" onClick={resetNumbers}>
                그 값으로 되돌리기
              </button>
            </Show>
          </p>

          <div class={["transition-opacity", working() ? "opacity-60" : ""]}>
            <Show
              when={plan().riders.total > 0 && plan().candidates > 0}
              fallback={
                <p class="mt-10 px-1 font-medium break-keep text-sand-11">
                  {plan().candidates === 0
                    ? "정류장이 없어서 노선을 만들 수 없어요. 정류장에서 먼저 넣어 주세요."
                    : "쓸 답변이 없어요. 위에서 실제 응답이나 데모를 켜 주세요. 데모 학생은 가입 조사에서 만들 수 있어요."}
                </p>
              }
            >
              <SectionRule title="결과" class="mt-12" />
              <Summary plan={plan()} />

              <SectionRule title="노선을 만든 순서" class="mt-12" />
              <Steps plan={plan()} />

              <SectionRule title="지도" class="mt-12" />
              <div class="mt-4 flex flex-wrap gap-1.5 px-1">
                <SlotTab active={!slot()} onClick={() => setSlot(undefined)}>
                  모든 시간 · {plan().buses.length}대
                </SlotTab>
                <For each={plan().slots}>
                  {(entry) => (
                    <SlotTab
                      active={slot() === entry.slot}
                      onClick={() => {
                        setSelected(undefined);
                        setSlot(entry.slot);
                      }}
                    >
                      {entry.slot} · {entry.buses}대
                    </SlotTab>
                  )}
                </For>
              </div>
              <PlanMap
                buses={shown()}
                selected={selected()}
                class="mt-3 h-[28rem]"
                label={`${slot() ?? "모든 시간"} 출발 버스 ${shown().length}대의 노선 지도`}
              />
              <p class="mt-2 px-1 text-sm font-medium break-keep text-sand-11">
                정류장 사이는 직선으로 이었어요. 검은 점은 타는 곳, 흰 점은 내리는 곳이고 클수록 많이 내려요. 아래
                버스를 열면 지도에서 그 버스만 노랗게 보여요.
              </p>

              <For each={groups()} keyed={(group) => group.slot}>
                {(group) => (
                  <section>
                    <SectionRule title={`${slotRange(group().slot)} 출발`} class="mt-8" />
                    <ul class="mt-3 grid gap-3 lg:grid-cols-2">
                      <For each={group().buses} keyed={(bus) => bus.key}>
                        {(bus) => (
                          <li>
                            <BusCard
                              bus={bus()}
                              fixed={false}
                              onToggle={(open) => {
                                if (open) setSelected(bus().key);
                                else if (selected() === bus().key) setSelected(undefined);
                              }}
                            />
                          </li>
                        )}
                      </For>
                    </ul>
                  </section>
                )}
              </For>
            </Show>
          </div>
        </Loading>
      </Errored>
    </>
  );
}

function Check(props: { label: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <label class="flex cursor-pointer items-center gap-x-2 font-semibold tabular-nums">
      <input
        type="checkbox"
        checked={props.checked}
        class="size-4.5 cursor-pointer accent-amber-9"
        onChange={(e) => props.onChange(e.currentTarget.checked)}
      />
      {props.label}
    </label>
  );
}

function DemandTabs(props: { value: Demand; onChange: (value: Demand) => void }) {
  const options: [Demand, string][] = [
    ["all", "모두 탄다면"],
    ["typical", "답한 횟수만큼"],
  ];
  return (
    <div role="radiogroup" aria-label="이날 탈 학생" class="flex h-13 items-center rounded-xl bg-sand-3 p-1">
      <For each={options}>
        {([key, label]) => (
          <button
            type="button"
            role="radio"
            aria-checked={props.value === key ? "true" : "false"}
            class={[
              "h-full cursor-pointer rounded-lg px-4 font-semibold transition-colors",
              props.value === key ? "bg-sand-1 text-sand-12" : "text-sand-11 hover:text-sand-12",
            ]}
            onClick={() => props.onChange(key)}
          >
            {label}
          </button>
        )}
      </For>
    </div>
  );
}

function SlotTab(props: { active: boolean; onClick: () => void; children: string | (string | number)[] }) {
  return (
    <button
      type="button"
      aria-pressed={props.active ? "true" : "false"}
      class={[
        "h-9 cursor-pointer rounded-lg border px-3 text-sm font-semibold tabular-nums transition-colors",
        props.active
          ? "border-amber-8 bg-amber-3 text-amber-11"
          : "border-sand-4 bg-sand-2 text-sand-11 hover:text-sand-12",
      ]}
      onClick={() => props.onClick()}
    >
      {props.children}
    </button>
  );
}
