import { Title } from "@solidjs/meta";
import type { JSX } from "@solidjs/web";
import { createMemo, createSignal, Errored, For, Loading, Show } from "solid-js";
import { env } from "virtual:solid-env/client";

import { Button } from "../../components/common/button";
import { SectionRule } from "../../components/layout/screen";
import { getOperatorService, saveOperatorService } from "../../lib/operator";
import { slotRange } from "../../lib/time";

type Field =
  | "firstSlot"
  | "lastSlot"
  | "capacity"
  | "maxWalkMeters"
  | "maxRideMinutes"
  | "minRiders"
  | "dayOfCutoffMinutes"
  | "noShowLimit";
type Status = { kind: "saved" | "error"; text: string };

const walkMinutes = (meters: number) => Math.max(1, Math.ceil((meters * 1.3) / 75));

export default function OperatorSettings() {
  const data = createMemo(() => getOperatorService());
  const [draft, setDraft] = createSignal<Partial<Record<Field, string>>>({});
  const [busy, setBusy] = createSignal(false);
  const [status, setStatus] = createSignal<Status>();

  const value = (field: Field) => draft()[field] ?? String(data().settings[field]);
  const set = (field: Field, next: string) => {
    setStatus(undefined);
    setDraft((current) => ({ ...current, [field]: next }));
  };
  const changed = () =>
    Object.entries(draft()).some(([field, next]) => next !== String(data().settings[field as Field]));
  const slotWindow = () => {
    const slots = data().slots;
    return slots.slice(slots.indexOf(value("firstSlot")), slots.indexOf(value("lastSlot")) + 1);
  };

  async function save() {
    setBusy(true);
    const result = await saveOperatorService({
      firstSlot: value("firstSlot"),
      lastSlot: value("lastSlot"),
      capacity: Number(value("capacity")),
      maxWalkMeters: Number(value("maxWalkMeters")),
      maxRideMinutes: Number(value("maxRideMinutes")),
      minRiders: Number(value("minRiders")),
      dayOfCutoffMinutes: Number(value("dayOfCutoffMinutes")),
      noShowLimit: Number(value("noShowLimit")),
    });
    setBusy(false);
    if (result.ok) setDraft({});
    setStatus(result.ok ? { kind: "saved", text: "저장했어요." } : { kind: "error", text: result.message });
  }

  return (
    <>
      <Title>{`운행 설정 - 운영 - ${env.VITE_APP_NAME}`}</Title>
      <Errored
        fallback={(_, reset) => (
          <div class="px-1">
            <h1 class="text-3xl font-bold">운행 설정</h1>
            <p class="mt-4 font-semibold">설정을 불러오지 못했어요.</p>
            <button type="button" class="mt-2 cursor-pointer font-semibold text-amber-11" onClick={reset}>
              다시 불러오기
            </button>
          </div>
        )}
      >
        <Loading fallback={<div class="h-96" />}>
          <form
            class="max-w-3xl"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <header class="px-1">
              <h1 class="text-3xl font-bold">운행 설정</h1>
              <p class="mt-2 font-medium text-balance break-keep text-sand-11">
                학생이 고르는 시간 칸과 노선을 만들 때 쓰는 기준이에요. 바꾸면 아직 정해지지 않은 날부터 적용되고, 이미
                확정된 노선은 그대로예요.
              </p>
            </header>

            <SectionRule title="운행 시간" class="mt-10" />
            <div class="mt-4 flex flex-wrap items-end gap-3">
              <SlotSelect
                label="첫 시간대"
                slots={data().slots}
                value={value("firstSlot")}
                onChange={(next) => set("firstSlot", next)}
              />
              <SlotSelect
                label="마지막 시간대"
                slots={data().slots}
                value={value("lastSlot")}
                onChange={(next) => set("lastSlot", next)}
              />
            </div>
            <p class="mt-3 px-1 text-sm font-medium break-keep text-sand-11 tabular-nums">
              <Show when={slotWindow().length > 0} fallback="마지막 시간대를 첫 시간대보다 뒤로 골라 주세요.">
                학생은 {slotRange(slotWindow()[0]).split("–")[0]}–{slotRange(slotWindow().at(-1)!).split("–")[1]} 사이
                30분 칸 {slotWindow().length}개에서 골라요.
              </Show>
            </p>

            <div class="mt-6 grid gap-x-6 gap-y-5 sm:grid-cols-2">
              <NumberField
                label="당일 신청 마감"
                unit="분 전"
                limits={data().limits.dayOfCutoffMinutes}
                value={value("dayOfCutoffMinutes")}
                onInput={(next) => set("dayOfCutoffMinutes", next)}
                hint="버스가 학생이 타는 곳에 오기 이만큼 전까지만 고를 수 있어요."
              />
              <NumberField
                label="안 탄 날 제한"
                unit="번"
                limits={data().limits.noShowLimit}
                value={value("noShowLimit")}
                onInput={(next) => set("noShowLimit", next)}
                hint="최근 30일 동안 신청하고 타지 않은 날이 이만큼이면 새 신청을 막아요. 0이면 막지 않아요."
              />
            </div>

            <SectionRule title="노선 기준" class="mt-10" />
            <div class="mt-4 grid gap-x-6 gap-y-5 sm:grid-cols-2">
              <NumberField
                label="버스 정원"
                unit="명"
                limits={data().limits.capacity}
                value={value("capacity")}
                onInput={(next) => set("capacity", next)}
              />
              <NumberField
                label="버스 한 대 최소 인원"
                unit="명"
                limits={data().limits.minRiders}
                value={value("minRiders")}
                onInput={(next) => set("minRiders", next)}
                hint="이보다 적으면 방향이 비슷한 옆 버스와 합쳐요."
              />
              <NumberField
                label="정류장에서 집까지 거리"
                unit="m"
                limits={data().limits.maxWalkMeters}
                value={value("maxWalkMeters")}
                onInput={(next) => set("maxWalkMeters", next)}
                hint={`직선거리예요. 걸어서 약 ${walkMinutes(Number(value("maxWalkMeters")) || 0)}분이에요.`}
              />
              <NumberField
                label="가장 긴 탑승 시간"
                unit="분"
                limits={data().limits.maxRideMinutes}
                value={value("maxRideMinutes")}
                onInput={(next) => set("maxRideMinutes", next)}
                hint="한 학생이 버스에 타 있는 시간이 이보다 길어지면 버스를 나눠요."
              />
            </div>

            <div class="mt-10 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Button type="submit" class="w-40" variant={busy() ? "loading" : changed() ? "primary" : "disabled"}>
                저장하기
              </Button>
              <p role="status" class="min-h-6 font-semibold break-keep">
                <Show when={status()}>
                  {(current) => (
                    <span class={current().kind === "saved" ? "text-green-11" : "text-red-11"}>{current().text}</span>
                  )}
                </Show>
              </p>
            </div>
            <SectionRule title="외부 서비스" class="mt-14" />
            <dl class="mt-4 grid gap-y-3 px-1 sm:grid-cols-[10rem_1fr]">
              <dt class="text-sm font-semibold text-sand-11">버스 이동 시간</dt>
              <dd class="font-medium break-keep">
                {data().providers.routeTimes === "kakao"
                  ? `카카오모빌리티 길찾기 · 저장된 구간 ${data().providers.cachedRoutes.toLocaleString()}개`
                  : "거리로 어림 · ROUTE_TIMES=kakao로 실제 도로 시간을 쓸 수 있어요"}
              </dd>
              <dt class="text-sm font-semibold text-sand-11">걷는 시간</dt>
              <dd class="font-medium break-keep">
                {data().providers.walkTimes === "tmap"
                  ? `TMAP 보행자 경로 · 저장된 길 ${data().providers.cachedWalks.toLocaleString()}개`
                  : "거리로 어림 · WALK_TIMES=tmap과 TMAP_APP_KEY로 실제 걷는 시간을 쓸 수 있어요"}
              </dd>
              <dt class="text-sm font-semibold text-sand-11">지도</dt>
              <dd class="font-medium break-keep">
                {env.VITE_KAKAO_JS_KEY ? "카카오맵" : "꺼짐 · VITE_KAKAO_JS_KEY를 넣으면 버스 화면에 지도가 보여요"}
              </dd>
            </dl>
          </form>
        </Loading>
      </Errored>
    </>
  );
}

function SlotSelect(props: { label: string; slots: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <label class="flex flex-col gap-y-1.5">
      <span class="ml-1 text-sm font-semibold text-sand-11">{props.label}</span>
      <select
        class="h-13 w-44 cursor-pointer rounded-xl border border-sand-5 bg-sand-2 px-4 text-lg tabular-nums focus:border-amber-8 focus:ring-2 focus:ring-amber-5 focus:outline-none"
        onChange={(e) => props.onChange(e.currentTarget.value)}
      >
        <For each={props.slots}>
          {(slot) => (
            <option value={slot} selected={slot === props.value}>
              {slot}
            </option>
          )}
        </For>
      </select>
    </label>
  );
}

function NumberField(props: {
  label: string;
  unit: string;
  limits: { min: number; max: number };
  value: string;
  onInput: (value: string) => void;
  hint?: JSX.Element;
}) {
  return (
    <label class="flex flex-col gap-y-1.5">
      <span class="ml-1 text-sm font-semibold text-sand-11">{props.label}</span>
      <span class="flex h-13 items-center rounded-xl border border-sand-5 bg-sand-2 pr-4 focus-within:border-amber-8 focus-within:ring-2 focus-within:ring-amber-5">
        <input
          type="number"
          inputmode="numeric"
          min={props.limits.min}
          max={props.limits.max}
          step="1"
          required
          value={props.value}
          class="h-full min-w-0 flex-1 rounded-xl bg-transparent px-4 text-lg tabular-nums caret-amber-9 focus:outline-none"
          onInput={(e) => props.onInput(e.currentTarget.value)}
        />
        <span class="shrink-0 font-semibold text-sand-11">{props.unit}</span>
      </span>
      <span class="ml-1 text-sm font-medium break-keep text-sand-11 tabular-nums">
        {props.limits.min}–{props.limits.max}
        {props.unit}
        <Show when={props.hint}>
          {" · "}
          {props.hint}
        </Show>
      </span>
    </label>
  );
}
