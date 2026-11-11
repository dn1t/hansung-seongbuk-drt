import type { JSX } from "@solidjs/web";
import { createSignal, For, Show, untrack } from "solid-js";

import type { SurveyForm as SurveyFormData } from "../../lib/survey";
import {
  FARE_LABELS,
  FREQUENCY_LABELS,
  SURVEY_COMMENT_MAX,
  SURVEY_FARES,
  SURVEY_FREQUENCIES,
  SURVEY_WAYS,
  type SurveyAnswers,
  type SurveyFare,
  type SurveyFrequency,
  type SurveyWay,
  WAY_LABELS,
} from "../../lib/survey-options";
import { SlotGrid } from "../booking/slot-grid";
import { Select } from "../common/select";
import { Footer } from "../layout/screen";

export function SurveyForm(props: {
  form: SurveyFormData;
  buttonLabel: string;
  aboveTabBar?: boolean;
  onSave: (answers: SurveyAnswers) => Promise<void>;
}) {
  const { answers: initial, slots, starts } = untrack(() => props.form);
  const [frequency, setFrequency] = createSignal<SurveyFrequency | undefined>(initial?.frequency);
  const [slot, setSlot] = createSignal<string | undefined>(
    initial && slots.includes(initial.slot) ? initial.slot : undefined,
  );
  const [startId, setStartId] = createSignal(
    starts.find((start) => start.id === initial?.startId)?.id ?? starts[0]?.id ?? "",
  );
  const [way, setWay] = createSignal<SurveyWay | undefined>(initial?.way);
  const [fare, setFare] = createSignal<SurveyFare | undefined>(initial?.fare);
  const [comment, setComment] = createSignal(initial?.comment ?? "");
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal("");

  const ready = () => Boolean(frequency() && slot() && startId() && way() && fare());

  return (
    <form
      class="flex flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready()) return;
        setError("");
        setBusy(true);
        props
          .onSave({
            frequency: frequency()!,
            slot: slot()!,
            startId: startId(),
            way: way()!,
            fare: fare()!,
            comment: comment(),
          })
          .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
          .finally(() => setBusy(false));
      }}
    >
      <div class="mt-4 flex flex-col gap-y-9 pb-4">
        <Question title="시험·축제 기간에 얼마나 탈 것 같아요?">
          <Choices
            options={SURVEY_FREQUENCIES.map((key) => [key, FREQUENCY_LABELS[key]])}
            selected={frequency()}
            onSelect={setFrequency}
          />
        </Question>
        <Question title="보통 몇 시쯤 집에 가요?" hint="학교나 번화가에서 출발하는 시간이에요.">
          <SlotGrid slots={props.form.slots} selected={slot()} onSelect={setSlot} />
        </Question>
        <Question title="주로 어디서 출발해요?">
          <Select
            name="start"
            aria-label="출발하는 곳"
            options={Object.fromEntries(props.form.starts.map((start) => [start.id, start.name]))}
            value={startId()}
            onChange={(e) => setStartId(e.currentTarget.value)}
          />
        </Question>
        <Question title="지금은 막차가 끊기면 어떻게 집에 가요?">
          <Choices options={SURVEY_WAYS.map((key) => [key, WAY_LABELS[key]])} selected={way()} onSelect={setWay} />
        </Question>
        <Question title="한 번 탈 때 얼마까지 낼 수 있어요?">
          <Choices options={SURVEY_FARES.map((key) => [key, FARE_LABELS[key]])} selected={fare()} onSelect={setFare} />
        </Question>
        <Question title="하고 싶은 말이 있나요?" hint="적지 않아도 돼요.">
          <textarea
            name="comment"
            rows="3"
            maxlength={SURVEY_COMMENT_MAX}
            placeholder="이런 곳에도 섰으면 좋겠어요"
            value={comment()}
            class="w-full resize-none rounded-xl border border-sand-5 bg-sand-2 px-4 py-2.75 text-lg caret-amber-9 placeholder:text-sand-10 focus:border-amber-8 focus:ring-2 focus:ring-amber-5 focus:outline-none"
            onInput={(e) => setComment(e.currentTarget.value)}
          />
        </Question>
        <Show when={error()}>
          <p class="px-1 font-medium break-keep text-red-11">{error()}</p>
        </Show>
      </div>
      <Footer
        type="submit"
        buttonLabel={props.buttonLabel}
        aboveTabBar={props.aboveTabBar}
        variant={busy() ? "loading" : ready() ? "primary" : "disabled"}
      />
    </form>
  );
}

function Question(props: { title: string; hint?: string; children: JSX.Element }) {
  return (
    <fieldset class="flex min-w-0 flex-col gap-y-3">
      <legend class="mb-3 px-1">
        <span class="block text-lg font-bold break-keep">{props.title}</span>
        <Show when={props.hint}>
          <span class="mt-0.5 block text-sm font-medium break-keep text-sand-11">{props.hint}</span>
        </Show>
      </legend>
      {props.children}
    </fieldset>
  );
}

function Choices<T extends string>(props: {
  options: [T, string][];
  selected: T | undefined;
  onSelect: (value: T) => void;
}) {
  return (
    <ul class="grid grid-cols-2 gap-1.5">
      <For each={props.options}>
        {([value, label]) => {
          const active = () => props.selected === value;
          return (
            <li>
              <button
                type="button"
                aria-pressed={active() ? "true" : "false"}
                class={[
                  "flex min-h-13 w-full cursor-pointer items-center justify-center rounded-xl border px-3 py-2 text-center font-semibold break-keep transition-colors",
                  active()
                    ? "border-amber-8 bg-amber-3 text-amber-11 ring-2 ring-amber-5"
                    : "border-sand-3 bg-sand-3 text-sand-12",
                ]}
                onClick={() => props.onSelect(value)}
              >
                {label}
              </button>
            </li>
          );
        }}
      </For>
    </ul>
  );
}
