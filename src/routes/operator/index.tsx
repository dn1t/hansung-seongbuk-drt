import { Title } from "@solidjs/meta";
import type { JSX } from "@solidjs/web";
import { createMemo, createSignal, Errored, For, Loading, Show } from "solid-js";
import { env } from "virtual:solid-env/client";

import { Button } from "../../components/common/button";
import { SectionRule } from "../../components/layout/screen";
import { type NightCell, NightMonth } from "../../components/operator/night-month";
import {
  addDemoBookings,
  announceNights,
  clearDemoBookings,
  getOperatorNights,
  type OperatorNights as NightsData,
  setOperatingNights,
} from "../../lib/operator";
import { formatDate, formatNight } from "../../lib/time";

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
              날짜를 누르면 운행일에 넣거나 빼요. 학생은 운행일마다 탑승 1시간 전까지 사전 신청할 수 있어요.
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
  const [night, setNight] = createSignal<string>();
  const [count, setCount] = createSignal(String(DEMO_DEFAULT));
  const [busy, setBusy] = createSignal<string>();
  const [confirming, setConfirming] = createSignal<string>();
  const [status, setStatus] = createSignal<Status>();

  const open = () => props.data.nights.filter((n) => n.demoOpen);
  const withDemo = () => props.data.nights.filter((n) => n.night >= props.data.today && n.demo > 0);
  const target = () => {
    const picked = night();
    return open().some((n) => n.night === picked) ? picked : open()[0]?.night;
  };
  const size = () => Math.round(Number(count()));
  const ready = () => target() !== undefined && size() >= 1 && size() <= props.data.demoMax;

  async function add() {
    const chosen = target();
    if (!chosen) return;
    setStatus(undefined);
    setBusy("add");
    const result = await addDemoBookings({ night: chosen, count: size() });
    setBusy(undefined);
    setStatus(
      result.ok
        ? {
            kind: "saved",
            text: `${formatNight(chosen)}에 데모 신청 ${result.added}명을 넣었어요.${
              result.kept ? ` 노선이 정해진 시간대의 ${result.kept}명은 그대로 뒀어요.` : ""
            }`,
          }
        : { kind: "error", text: result.message },
    );
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
        메일이 가지 않아요. 탑승 1시간 전이 지난 시간대에는 넣지 않아요.
      </p>
      <Show
        when={open().length > 0}
        fallback={<p class="mt-3 px-1 font-medium break-keep text-sand-11">신청을 넣을 수 있는 운행일이 없어요.</p>}
      >
        <form
          class="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
        >
          <label class="flex flex-col gap-y-1.5">
            <span class="ml-1 text-sm font-semibold text-sand-11">운행일</span>
            <select
              class="h-13 cursor-pointer rounded-xl border border-sand-5 bg-sand-2 px-4 text-lg tabular-nums focus:border-amber-8 focus:ring-2 focus:ring-amber-5 focus:outline-none"
              onChange={(e) => setNight(e.currentTarget.value)}
            >
              <For each={open()} keyed={(n) => n.night}>
                {(n) => (
                  <option value={n().night} selected={n().night === target()}>
                    {formatNight(n().night)}
                    {n().demo > 0 ? ` · 데모 ${n().demo}명` : ""}
                  </option>
                )}
              </For>
            </select>
          </label>
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
            class="w-36"
            variant={busy() === "add" ? "loading" : ready() ? "secondary" : "disabled"}
          >
            신청 넣기
          </Button>
        </form>
        <p class="mt-3 px-1 text-sm font-medium break-keep text-sand-11">
          이미 데모 신청이 있는 날은 아직 마감되지 않은 시간대의 신청을 새로 바꿔요.
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
