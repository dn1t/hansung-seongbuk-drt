import { Title } from "@solidjs/meta";
import type { JSX } from "@solidjs/web";
import { createMemo, createSignal, Errored, For, Loading, Show } from "solid-js";
import { env } from "virtual:solid-env/client";

import { Button } from "../../components/common/button";
import { SectionRule } from "../../components/layout/screen";
import { type NightCell, NightMonth } from "../../components/operator/night-month";
import { createTickingNow } from "../../components/ride/clock";
import {
  addDemoBookings,
  advancePresentationClock,
  endPresentation,
  getPresentation,
  setPresentation,
  announceNights,
  clearDemoBookings,
  getOperatorNights,
  type OperatorNights as NightsData,
  setOperatingNights,
} from "../../lib/operator";
import { formatClock, formatDate, formatNight, withDirectionParticle } from "../../lib/time";

const DAY = 24 * 60 * 60_000;
const MONTHS_SHOWN = 3;
const MAX_RANGE_DAYS = 120;
const DEMO_DEFAULT = 160;

type Status = { kind: "saved" | "error"; text: string };

function nightsBetween(start: string, end: string, weekdaysOnly: boolean) {
  const nights: string[] = [];
  const last = Date.parse(`${end}T00:00:00Z`);
  for (let time = Date.parse(`${start}T00:00:00Z`); time <= last; time += DAY) {
    const weekday = new Date(time).getUTCDay();
    if (!weekdaysOnly || (weekday !== 0 && weekday !== 6)) nights.push(new Date(time).toISOString().slice(0, 10));
  }
  return nights;
}

export default function OperatorNights() {
  const data = createMemo(() => getOperatorNights());
  const [pending, setPending] = createSignal<Record<string, boolean>>({});
  const [offset, setOffset] = createSignal(0);
  const [status, setStatus] = createSignal<Status>();
  const [rangeStart, setRangeStart] = createSignal("");
  const [rangeEnd, setRangeEnd] = createSignal("");
  const [weekdaysOnly, setWeekdaysOnly] = createSignal(true);
  const [rangeBusy, setRangeBusy] = createSignal(false);
  const [confirmAnnounce, setConfirmAnnounce] = createSignal(false);
  const [announcing, setAnnouncing] = createSignal(false);

  const saved = createMemo(() => new Map(data().nights.map((n) => [n.night, n.bookings])));
  const upcoming = () => data().nights.filter((n) => n.night >= data().today);
  const bookedTotal = () => upcoming().reduce((sum, n) => sum + n.bookings, 0);

  const months = createMemo(() => {
    const today = new Date(`${data().today}T00:00:00Z`);
    const start = offset();
    const result: { year: number; month: number }[] = [];
    for (let i = 0; i < MONTHS_SHOWN; i++) {
      const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + start + i, 1));
      result.push({ year: date.getUTCFullYear(), month: date.getUTCMonth() });
    }
    return result;
  });

  const cell = (night: string): NightCell => {
    const target = pending()[night];
    return {
      night,
      operating: target ?? saved().has(night),
      bookings: saved().get(night) ?? 0,
      pending: target !== undefined,
    };
  };

  function clearPending(nights: string[]) {
    setPending((current) => {
      const next = { ...current };
      for (const night of nights) delete next[night];
      return next;
    });
  }

  async function toggle(target: NightCell) {
    if (target.pending) return;
    if (target.operating && target.bookings > 0) {
      setStatus({
        kind: "error",
        text: `${formatDate(target.night)}에는 신청한 학생이 ${target.bookings}명 있어서 운행일에서 뺄 수 없어요.`,
      });
      return;
    }
    const adding = !target.operating;
    setPending((current) => ({ ...current, [target.night]: adding }));
    const result = await setOperatingNights(
      adding ? { add: [target.night], remove: [] } : { add: [], remove: [target.night] },
    );
    clearPending([target.night]);
    setStatus(
      result.ok
        ? { kind: "saved", text: `${formatDate(target.night)}을 운행일${adding ? "에 넣었어요" : "에서 뺐어요"}.` }
        : { kind: "error", text: result.message },
    );
  }

  async function addRange() {
    const today = data().today;
    if (!rangeStart() || !rangeEnd()) return;
    if (rangeEnd() < rangeStart()) {
      setStatus({ kind: "error", text: "끝나는 날을 시작하는 날보다 뒤로 골라 주세요." });
      return;
    }
    if ((Date.parse(rangeEnd()) - Date.parse(rangeStart())) / DAY >= MAX_RANGE_DAYS) {
      setStatus({ kind: "error", text: `한 번에 ${MAX_RANGE_DAYS}일까지 넣을 수 있어요.` });
      return;
    }
    const nights = nightsBetween(rangeStart(), rangeEnd(), weekdaysOnly()).filter(
      (night) => night >= today && !saved().has(night),
    );
    if (nights.length === 0) {
      setStatus({ kind: "error", text: "새로 넣을 날이 없어요. 이미 운행일이거나 지난 날이에요." });
      return;
    }
    setRangeBusy(true);
    setPending((current) => ({ ...current, ...Object.fromEntries(nights.map((night) => [night, true])) }));
    const result = await setOperatingNights({ add: nights, remove: [] });
    clearPending(nights);
    setRangeBusy(false);
    setStatus(
      result.ok
        ? { kind: "saved", text: `운행일 ${nights.length}일을 넣었어요.` }
        : { kind: "error", text: result.message },
    );
    if (result.ok) {
      const first = new Date(`${nights[0]}T00:00:00Z`);
      const today0 = new Date(`${today}T00:00:00Z`);
      const monthsAway =
        (first.getUTCFullYear() - today0.getUTCFullYear()) * 12 + first.getUTCMonth() - today0.getUTCMonth();
      if (monthsAway < offset() || monthsAway >= offset() + MONTHS_SHOWN) setOffset(monthsAway);
    }
  }

  async function announce() {
    setAnnouncing(true);
    const result = await announceNights();
    setAnnouncing(false);
    setConfirmAnnounce(false);
    setStatus(
      result.ok
        ? { kind: "saved", text: `학생 ${result.sent ?? 0}명에게 사전 신청 안내 메일을 보냈어요.` }
        : { kind: "error", text: result.message },
    );
  }

  return (
    <>
      <Title>{`운행일 - 운영 - ${env.VITE_APP_NAME}`}</Title>
      <Errored
        fallback={(_, reset) => (
          <div class="px-1">
            <h1 class="text-3xl font-bold">운행일</h1>
            <p class="mt-4 font-semibold">운행일을 불러오지 못했어요.</p>
            <button type="button" class="mt-2 cursor-pointer font-semibold text-amber-11" onClick={reset}>
              다시 불러오기
            </button>
          </div>
        )}
      >
        <Loading fallback={<div class="h-96" />}>
          <header class="px-1">
            <h1 class="text-3xl font-bold">운행일</h1>
            <p class="mt-2 font-medium text-balance break-keep text-sand-11">
              날짜를 누르면 운행일에 넣거나 빼요. 학생은 운행일마다 탑승 30분 전까지 사전 신청할 수 있어요.
            </p>
            <p class="mt-4 text-sm font-medium text-sand-11 tabular-nums">
              다가오는 운행일 <b class="font-bold text-sand-12">{upcoming().length}일</b>
              <span class="px-1.5 text-sand-10">·</span>
              신청 <b class="font-bold text-sand-12">{bookedTotal()}명</b>
              <Show when={upcoming()[0]}>
                {(next) => (
                  <>
                    <span class="px-1.5 text-sand-10">·</span>
                    다음 운행 <b class="font-bold text-sand-12">{formatNight(next().night)}</b>
                  </>
                )}
              </Show>
            </p>
          </header>

          <SectionRule title="학생들에게 알리기" class="mt-10" />
          <div class="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-1">
            <p class="font-medium text-balance break-keep text-sand-11">
              <Show
                when={data().unannounced.length > 0}
                fallback="새로 넣은 운행일이 생기면 여기서 가입한 학생들에게 메일로 알릴 수 있어요."
              >
                아직 알리지 않은 운행일 <b class="font-bold text-sand-12 tabular-nums">{data().unannounced.length}일</b>
                을 가입한 학생 <b class="font-bold text-sand-12 tabular-nums">{data().recipients}명</b>에게 메일로
                알려요.
              </Show>
            </p>
            <Show when={data().unannounced.length > 0}>
              <div class="flex items-center gap-x-2">
                <Show when={confirmAnnounce()}>
                  <button
                    type="button"
                    class="h-13 cursor-pointer rounded-xl px-4 font-semibold text-sand-11 hover:bg-sand-3 hover:text-sand-12"
                    onClick={() => setConfirmAnnounce(false)}
                  >
                    그만두기
                  </button>
                </Show>
                <Button
                  type="button"
                  class="w-44"
                  variant={announcing() ? "loading" : data().recipients > 0 ? "primary" : "disabled"}
                  onClick={() => (confirmAnnounce() ? void announce() : setConfirmAnnounce(true))}
                >
                  {confirmAnnounce() ? `${data().recipients}명에게 보내기` : "메일 보내기"}
                </Button>
              </div>
            </Show>
          </div>

          <DemoBookings data={data()} />
          <PresentationPanel />

          <SectionRule title="기간으로 넣기" class="mt-10" />
          <form
            class="mt-4 flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void addRange();
            }}
          >
            <DateField label="시작하는 날" min={data().today} value={rangeStart()} onInput={setRangeStart} />
            <DateField label="끝나는 날" min={rangeStart() || data().today} value={rangeEnd()} onInput={setRangeEnd} />
            <label class="flex h-13 cursor-pointer items-center gap-x-2 px-1 font-medium">
              <input
                type="checkbox"
                checked={weekdaysOnly()}
                class="size-4.5 cursor-pointer accent-amber-9"
                onChange={(e) => setWeekdaysOnly(e.currentTarget.checked)}
              />
              주말 빼기
            </label>
            <Button
              type="submit"
              class="w-36"
              variant={rangeBusy() ? "loading" : rangeStart() && rangeEnd() ? "primary" : "disabled"}
            >
              기간 넣기
            </Button>
          </form>

          <div class="mt-10 flex items-center gap-x-3 px-1">
            <h2 class="shrink-0 text-sm font-bold text-sand-11">달력</h2>
            <span aria-hidden="true" class="h-px flex-1 bg-sand-4" />
            <div class="flex items-center gap-x-1">
              <MonthButton label="이전 달" onClick={() => setOffset((o) => o - 1)}>
                <PhCaretLeftBold />
              </MonthButton>
              <button
                type="button"
                disabled={offset() === 0}
                class="h-9 cursor-pointer rounded-xl px-3 text-sm font-semibold text-sand-11 hover:bg-sand-3 hover:text-sand-12 disabled:cursor-default disabled:text-sand-8 disabled:hover:bg-transparent"
                onClick={() => setOffset(0)}
              >
                이번 달
              </button>
              <MonthButton label="다음 달" onClick={() => setOffset((o) => o + 1)}>
                <PhCaretRightBold />
              </MonthButton>
            </div>
          </div>
          <p role="status" class="mt-3 min-h-6 px-1 font-semibold break-keep">
            <Show when={status()}>
              {(current) => (
                <span
                  class={["flex items-center gap-x-1.5", current().kind === "saved" ? "text-green-11" : "text-red-11"]}
                >
                  <Show
                    when={current().kind === "saved"}
                    fallback={<PhWarningCircle aria-hidden="true" class="shrink-0" />}
                  >
                    <PhCheckCircle aria-hidden="true" class="shrink-0" />
                  </Show>
                  {current().text}
                </span>
              )}
            </Show>
          </p>
          <div class="mt-3 grid gap-x-8 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
            <For each={months()} keyed={(m) => `${m.year}-${m.month}`}>
              {(month) => (
                <NightMonth
                  year={month().year}
                  month={month().month}
                  today={data().today}
                  cell={cell}
                  onToggle={(target) => void toggle(target)}
                />
              )}
            </For>
          </div>
          <div class="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-sm font-medium text-sand-11">
            <span class="flex items-center gap-x-2">
              <span aria-hidden="true" class="size-4 rounded-sm border border-amber-8 bg-amber-3" />
              운행일
            </span>
            <span class="flex items-center gap-x-2">
              <b class="font-semibold text-amber-11 tabular-nums">3명</b>
              그날 사전 신청한 학생
            </span>
            <span>신청한 학생이 있는 날은 뺄 수 없어요.</span>
          </div>
        </Loading>
      </Errored>
    </>
  );
}

function DateField(props: { label: string; min: string; value: string; onInput: (value: string) => void }) {
  return (
    <label class="flex flex-col gap-y-1.5">
      <span class="ml-1 text-sm font-semibold text-sand-11">{props.label}</span>
      <input
        type="date"
        min={props.min}
        value={props.value}
        class="h-13 rounded-xl border border-sand-5 bg-sand-2 px-4 text-lg tabular-nums caret-amber-9 focus:border-amber-8 focus:ring-2 focus:ring-amber-5 focus:outline-none"
        onInput={(e) => props.onInput(e.currentTarget.value)}
      />
    </label>
  );
}

function MonthButton(props: { label: string; onClick: () => void; children: JSX.Element }) {
  return (
    <button
      type="button"
      aria-label={props.label}
      class="flex size-9 cursor-pointer items-center justify-center rounded-xl text-sand-11 hover:bg-sand-3 hover:text-sand-12"
      onClick={() => props.onClick()}
    >
      {props.children}
    </button>
  );
}

function DemoBookings(props: { data: NightsData }) {
  const [picked, setPicked] = createSignal<string[]>([]);
  const [count, setCount] = createSignal(String(DEMO_DEFAULT));
  const [busy, setBusy] = createSignal<string>();
  const [confirming, setConfirming] = createSignal<string>();
  const [status, setStatus] = createSignal<Status>();

  const open = () => props.data.nights.filter((n) => n.demoOpen);
  const withDemo = () => props.data.nights.filter((n) => n.night >= props.data.today && n.demo > 0);
  const chosen = () =>
    open()
      .filter((n) => picked().includes(n.night))
      .map((n) => n.night);
  const allChosen = () => open().length > 0 && chosen().length === open().length;
  const size = () => Math.round(Number(count()));
  const ready = () => chosen().length > 0 && size() >= 1 && size() <= props.data.demoMax;

  function toggle(night: string) {
    setPicked((current) => (current.includes(night) ? current.filter((n) => n !== night) : [...current, night]));
  }

  async function add() {
    const nights = chosen();
    if (nights.length === 0) return;
    setStatus(undefined);
    setBusy("add");
    const result = await addDemoBookings({ nights, count: size() });
    setBusy(undefined);
    if (!result.ok) {
      setStatus({ kind: "error", text: result.message });
      return;
    }
    setPicked([]);
    const where = nights.length === 1 ? formatNight(nights[0]) : `${result.nights}일`;
    setStatus({
      kind: "saved",
      text: [
        `${where}에 데모 신청 ${result.added}명을 넣었어요.`,
        result.kept ? `노선이 정해진 시간대의 ${result.kept}명은 그대로 뒀어요.` : "",
        result.skipped ? `모든 시간대가 마감된 ${result.skipped}일은 건너뛰었어요.` : "",
      ]
        .filter(Boolean)
        .join(" "),
    });
  }

  async function clear(target: string) {
    setStatus(undefined);
    setBusy(target);
    const result = await clearDemoBookings(target);
    setBusy(undefined);
    setConfirming(undefined);
    setStatus(
      result.ok
        ? { kind: "saved", text: `${formatNight(target)}의 데모 신청 ${result.removed}명을 지웠어요.` }
        : { kind: "error", text: result.message },
    );
  }

  return (
    <>
      <SectionRule title="데모 신청" class="mt-10" />
      <p class="mt-4 px-1 font-medium text-balance break-keep text-sand-11">
        실제 운행일에 데모 학생의 사전 신청을 넣어요. 노선과 배차가 이 신청까지 합쳐서 만들어지고, 데모 학생에게는
        메일이 가지 않아요. 탑승 30분 전이 지난 시간대에는 넣지 않아요.
      </p>
      <Show
        when={open().length > 0}
        fallback={<p class="mt-3 px-1 font-medium break-keep text-sand-11">신청을 넣을 수 있는 운행일이 없어요.</p>}
      >
        <form
          class="mt-4 flex flex-col gap-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
        >
          <fieldset>
            <legend class="flex w-full items-center justify-between px-1">
              <span class="text-sm font-semibold text-sand-11">
                운행일 <span class="tabular-nums">{chosen().length > 0 ? `· ${chosen().length}일 골랐어요` : ""}</span>
              </span>
              <button
                type="button"
                class="cursor-pointer text-sm font-semibold text-amber-11"
                onClick={() => setPicked(allChosen() ? [] : open().map((n) => n.night))}
              >
                {allChosen() ? "모두 해제" : "모두 고르기"}
              </button>
            </legend>
            <ul class="mt-2 flex flex-wrap gap-2">
              <For each={open()} keyed={(n) => n.night}>
                {(n) => {
                  const on = () => picked().includes(n().night);
                  return (
                    <li>
                      <button
                        type="button"
                        aria-pressed={on() ? "true" : "false"}
                        class={[
                          "flex h-13 cursor-pointer flex-col items-start justify-center rounded-xl border px-3.5 tabular-nums transition-colors",
                          on()
                            ? "border-amber-8 bg-amber-3 text-amber-11 ring-2 ring-amber-5"
                            : "border-sand-5 bg-sand-2 hover:bg-sand-3",
                        ]}
                        onClick={() => toggle(n().night)}
                      >
                        <span class="text-sm leading-5 font-bold">{formatNight(n().night)}</span>
                        <span class={["text-xs leading-4 font-medium", on() ? "text-amber-11" : "text-sand-11"]}>
                          {n().demo > 0 ? `데모 ${n().demo}명 있음` : "데모 없음"}
                        </span>
                      </button>
                    </li>
                  );
                }}
              </For>
            </ul>
          </fieldset>
          <div class="flex flex-wrap items-end gap-3">
            <label class="flex w-32 flex-col gap-y-1.5">
              <span class="ml-1 text-sm font-semibold text-sand-11">학생 수</span>
              <span class="flex h-13 items-center rounded-xl border border-sand-5 bg-sand-2 pr-4 focus-within:border-amber-8 focus-within:ring-2 focus-within:ring-amber-5">
                <input
                  type="number"
                  inputmode="numeric"
                  min="1"
                  max={props.data.demoMax}
                  step="1"
                  required
                  value={count()}
                  class="h-full min-w-0 flex-1 rounded-xl bg-transparent px-4 text-lg tabular-nums caret-amber-9 focus:outline-none"
                  onInput={(e) => setCount(e.currentTarget.value)}
                />
                <span class="shrink-0 font-semibold text-sand-11">명</span>
              </span>
            </label>
            <Button
              type="submit"
              class="w-44"
              variant={busy() === "add" ? "loading" : ready() ? "secondary" : "disabled"}
            >
              {chosen().length > 1 ? `${chosen().length}일에 신청 넣기` : "신청 넣기"}
            </Button>
          </div>
        </form>
        <p class="mt-3 px-1 text-sm font-medium break-keep text-sand-11">
          여러 날을 한 번에 고를 수 있어요. 이미 데모 신청이 있는 날은 노선이 정해진 신청만 남기고 새로 바꿔요.
        </p>
      </Show>
      <Show when={withDemo().length > 0}>
        <ul class="mt-4 flex flex-col">
          <For each={withDemo()} keyed={(n) => n.night}>
            {(n) => (
              <li class="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-sand-4 px-1 py-2.5 last:border-b-0">
                <span class="font-semibold tabular-nums">{formatNight(n().night)}</span>
                <span class="text-sm font-medium text-sand-11 tabular-nums">
                  신청 {n().bookings}명 중 데모 {n().demo}명
                </span>
                <span class="ml-auto flex items-center gap-x-3 text-sm font-semibold">
                  <Show
                    when={confirming() === n().night}
                    fallback={
                      <button type="button" class="cursor-pointer text-red-11" onClick={() => setConfirming(n().night)}>
                        데모 신청 지우기
                      </button>
                    }
                  >
                    <span class="text-sand-12">데모 {n().demo}명의 신청을 지울까요?</span>
                    <button
                      type="button"
                      class="cursor-pointer text-red-11 disabled:cursor-progress"
                      disabled={busy() === n().night}
                      onClick={() => void clear(n().night)}
                    >
                      지우기
                    </button>
                    <button type="button" class="cursor-pointer text-sand-11" onClick={() => setConfirming(undefined)}>
                      취소
                    </button>
                  </Show>
                </span>
              </li>
            )}
          </For>
        </ul>
      </Show>
      <p role="status" class="mt-2 min-h-6 px-1 font-semibold break-keep">
        <Show when={status()}>
          {(current) => (
            <span class={current().kind === "saved" ? "text-green-11" : "text-red-11"}>{current().text}</span>
          )}
        </Show>
      </p>
    </>
  );
}

function PresentationPanel() {
  const state = createMemo(() => getPresentation());
  const [night, setNight] = createSignal<string>();
  const [clock, setClock] = createSignal("23:50");
  const [autoAdvance, setAutoAdvance] = createSignal<boolean>();
  const [busy, setBusy] = createSignal<string>();
  const [status, setStatus] = createSignal<Status>();
  const now = createTickingNow(() => state().now, 5_000);

  const target = () => {
    const picked = night();
    return picked && state().nights.includes(picked) ? picked : state().nights[0];
  };
  const auto = () => autoAdvance() ?? state().autoAdvance;

  async function run(key: string, action: () => Promise<{ ok: true } | { ok: false; message: string }>, done: string) {
    setStatus(undefined);
    setBusy(key);
    const result = await action();
    setBusy(undefined);
    setStatus(result.ok ? { kind: "saved", text: done } : { kind: "error", text: result.message });
  }

  return (
    <>
      <SectionRule title="발표 모드" class="mt-10" />
      <p class="mt-4 px-1 font-medium text-balance break-keep text-sand-11">
        발표할 때 앱 시각을 운행일 밤으로 옮겨요. 학생 화면과 운영 화면이 모두 그 시각처럼 움직이고, 끄면 실제 시각으로
        돌아가요.
      </p>
      <Loading fallback={<div class="h-32" />}>
        <Show when={state().active}>
          <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl bg-sand-2 px-5 py-4">
            <p class="font-medium text-sand-11">
              지금 앱 시각{" "}
              <b class="font-bold text-sand-12 tabular-nums">
                {formatNight(state().night)} {formatClock(now())}
              </b>
            </p>
            <div class="flex items-center gap-x-1.5">
              <For each={[5, 10, 30]}>
                {(minutes) => (
                  <button
                    type="button"
                    disabled={busy() !== undefined}
                    class="h-10 cursor-pointer rounded-lg bg-sand-4 px-3 text-sm font-semibold tabular-nums hover:bg-sand-5 disabled:cursor-progress"
                    onClick={() =>
                      void run(
                        `+${minutes}`,
                        () => advancePresentationClock(minutes),
                        `앱 시각을 ${minutes}분 앞으로 옮겼어요.`,
                      )
                    }
                  >
                    +{minutes}분
                  </button>
                )}
              </For>
            </div>
            <button
              type="button"
              disabled={busy() !== undefined}
              class="ml-auto cursor-pointer text-sm font-semibold text-sand-11 hover:text-sand-12"
              onClick={() => void run("end", () => endPresentation(), "실제 시각으로 돌아왔어요.")}
            >
              실제 시각으로 돌아가기
            </button>
          </div>
        </Show>
        <Show
          when={state().nights.length > 0}
          fallback={
            <p class="mt-3 px-1 font-medium break-keep text-sand-11">
              발표에 쓸 운행일이 없어요. 운행일을 먼저 넣어 주세요.
            </p>
          }
        >
          <form
            class="mt-4 flex flex-col gap-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const chosen = target();
              if (!chosen) return;
              void run(
                "set",
                () => setPresentation({ night: chosen, clock: clock(), autoAdvance: auto() }),
                `앱 시각을 ${formatNight(chosen)} 밤 ${withDirectionParticle(clock())} 맞췄어요.`,
              );
            }}
          >
            <div class="flex flex-wrap items-end gap-3">
              <label class="flex flex-col gap-y-1.5">
                <span class="ml-1 text-sm font-semibold text-sand-11">운행일</span>
                <select
                  class="h-13 cursor-pointer rounded-xl border border-sand-5 bg-sand-2 px-4 text-lg tabular-nums focus:border-amber-8 focus:ring-2 focus:ring-amber-5 focus:outline-none"
                  onChange={(e) => setNight(e.currentTarget.value)}
                >
                  <For each={state().nights}>
                    {(item) => (
                      <option value={item} selected={item === target()}>
                        {formatNight(item)} 밤
                      </option>
                    )}
                  </For>
                </select>
              </label>
              <label class="flex flex-col gap-y-1.5">
                <span class="ml-1 text-sm font-semibold text-sand-11">시각</span>
                <input
                  type="time"
                  required
                  value={clock()}
                  class="h-13 rounded-xl border border-sand-5 bg-sand-2 px-4 text-lg tabular-nums caret-amber-9 focus:border-amber-8 focus:ring-2 focus:ring-amber-5 focus:outline-none"
                  onInput={(e) => setClock(e.currentTarget.value)}
                />
              </label>
              <Button type="submit" class="w-44" variant={busy() === "set" ? "loading" : "secondary"}>
                {state().active ? "시각 바꾸기" : "발표 모드 켜기"}
              </Button>
            </div>
            <label class="flex w-max cursor-pointer items-start gap-x-2.5 px-1">
              <input
                type="checkbox"
                checked={auto()}
                class="mt-1 size-4.5 shrink-0 cursor-pointer accent-amber-9"
                onChange={(e) => setAutoAdvance(e.currentTarget.checked)}
              />
              <span class="flex flex-col">
                <span class="font-semibold">신청하면 그 시간대 노선이 정해진 직후로 넘어가기</span>
                <span class="text-sm font-medium break-keep text-sand-11">
                  그 밤에 사전 신청을 하면 앱 시각이 탑승 29분 전으로 넘어가서, 오늘 귀가에서 바로 노선을 고를 수
                  있어요.
                </span>
              </span>
            </label>
          </form>
        </Show>
        <p role="status" class="mt-2 min-h-6 px-1 font-semibold break-keep">
          <Show when={status()}>
            {(current) => (
              <span class={current().kind === "saved" ? "text-green-11" : "text-red-11"}>{current().text}</span>
            )}
          </Show>
        </p>
      </Loading>
    </>
  );
}
