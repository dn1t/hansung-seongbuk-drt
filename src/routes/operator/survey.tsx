import { Title } from "@solidjs/meta";
import { useSearchParams } from "@solidjs/router";
import type { JSX } from "@solidjs/web";
import { createMemo, createSignal, Errored, For, Loading, Show } from "solid-js";
import { env } from "virtual:solid-env/client";

import { Button } from "../../components/common/button";
import { QRCode } from "../../components/common/qr-code";
import { SectionRule } from "../../components/layout/screen";
import { BarList, Columns } from "../../components/operator/bars";
import {
  clearDemoData,
  DEMO_DEFAULT_COUNT,
  getSurveyReport,
  getSurveyRows,
  makeDemoData,
  type ResearchFilter,
} from "../../lib/research";
import { formatDate } from "../../lib/time";

type Status = { kind: "saved" | "error"; text: string };

const FILTER_LABELS: Record<ResearchFilter, string> = {
  real: "실제 응답",
  all: "데모 포함",
  demo: "데모만",
};

const csvCell = (value: string | number) => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

function saveFile(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

const dayLabel = (day: string) => `${Number(day.slice(5, 7))}/${Number(day.slice(8, 10))}`;

export default function OperatorSurvey() {
  const [params, setParams] = useSearchParams<{ show?: string }>();
  const filter = (): ResearchFilter => (params.show === "all" || params.show === "demo" ? params.show : "real");
  const report = createMemo(() => getSurveyReport(filter()));
  const [exporting, setExporting] = createSignal(false);

  async function exportRows() {
    setExporting(true);
    try {
      const rows = await getSurveyRows(filter());
      const header = [
        "답한 날",
        "학교",
        "사는 곳",
        "얼마나 자주",
        "집에 가는 시간",
        "출발하는 곳",
        "지금 귀가 방법",
        "낼 수 있는 요금",
        "하고 싶은 말",
        "데모",
      ];
      const lines = rows.map((row) => [
        new Date(row.answeredAt + 9 * 3_600_000).toISOString().slice(0, 10),
        row.school,
        row.district,
        row.frequency,
        row.slot,
        row.start,
        row.way,
        row.fare,
        row.comment,
        row.demo ? "데모" : "",
      ]);
      const text = "﻿" + [header, ...lines].map((line) => line.map(csvCell).join(",")).join("\r\n");
      saveFile(`가입조사-${FILTER_LABELS[filter()]}.csv`, new Blob([text], { type: "text/csv;charset=utf-8" }));
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <Title>{`가입 조사 - 운영 - ${env.VITE_APP_NAME}`}</Title>
      <Errored
        fallback={(_, reset) => (
          <div class="px-1">
            <h1 class="text-3xl font-bold">가입 조사</h1>
            <p class="mt-4 font-semibold">조사 결과를 불러오지 못했어요.</p>
            <button type="button" class="mt-2 cursor-pointer font-semibold text-amber-11" onClick={reset}>
              다시 불러오기
            </button>
          </div>
        )}
      >
        <Loading fallback={<div class="h-96" />}>
          <header class="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 px-1">
            <div class="min-w-0">
              <h1 class="text-3xl font-bold">가입 조사</h1>
              <p class="mt-2 max-w-2xl font-medium text-balance break-keep text-sand-11">
                학생이 가입하면서 답한 이용 계획이에요. 이름과 이메일, 집 주소는 보이지 않아요.
              </p>
            </div>
            <FilterTabs value={filter()} onChange={(show) => setParams({ show: show === "real" ? undefined : show })} />
          </header>

          <div class="mt-8 flex flex-col gap-10 lg:flex-row lg:items-start">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-1">
                <p class="text-sm font-medium text-sand-11 tabular-nums">
                  보이는 답변 <b class="font-bold text-sand-12">{report().totals.shown.toLocaleString()}명</b>
                  <span class="px-1.5 text-sand-10">·</span>
                  실제 {report().totals.real.toLocaleString()}명<span class="px-1.5 text-sand-10">·</span>
                  데모 {report().totals.demo.toLocaleString()}명
                  <Show when={report().totals.unanswered > 0}>
                    <span class="px-1.5 text-sand-10">·</span>
                    가입하고 아직 답하지 않은 학생 {report().totals.unanswered}명
                  </Show>
                </p>
                <Show when={report().totals.shown > 0}>
                  <button
                    type="button"
                    class="h-10 cursor-pointer rounded-xl px-3 font-semibold text-sand-11 hover:bg-sand-3 hover:text-sand-12 disabled:cursor-progress"
                    disabled={exporting()}
                    onClick={() => void exportRows()}
                  >
                    {exporting() ? "만드는 중…" : "답변 내려받기"}
                  </button>
                </Show>
              </div>

              <Show
                when={report().totals.shown > 0}
                fallback={
                  <p class="mt-6 px-1 font-medium break-keep text-sand-11">
                    {filter() === "demo"
                      ? "데모 답변이 없어요. 오른쪽에서 데모 학생을 만들 수 있어요."
                      : "아직 답한 학생이 없어요. 오른쪽 가입 링크나 QR을 학생들에게 나눠 주세요."}
                  </p>
                }
              >
                <div class="mt-4 grid gap-x-10 gap-y-10 xl:grid-cols-2">
                  <Block title="학교">
                    <BarList items={report().schools} total={report().totals.shown} />
                  </Block>
                  <Block title="사는 곳">
                    <BarList items={report().districts} total={report().totals.shown} />
                  </Block>
                  <Block title="집에 가는 시간">
                    <Columns items={report().slots} every={2} />
                  </Block>
                  <Block title="얼마나 자주 탈 것 같은지">
                    <BarList items={report().frequency} total={report().totals.shown} />
                  </Block>
                  <Block title="출발하는 곳">
                    <BarList items={report().starts} total={report().totals.shown} />
                  </Block>
                  <Block title="지금 막차 뒤에 집에 가는 방법">
                    <BarList items={report().ways} total={report().totals.shown} />
                  </Block>
                  <Block title="한 번에 낼 수 있는 요금">
                    <BarList items={report().fares} total={report().totals.shown} />
                  </Block>
                  <Block title="최근 14일 하루 답변">
                    <Columns
                      items={report().daily.map((d) => ({ key: d.day, label: dayLabel(d.day), count: d.count }))}
                      every={2}
                    />
                  </Block>
                </div>
                <Block title="하고 싶은 말" class="mt-10">
                  <Show
                    when={report().comments.length > 0}
                    fallback={<p class="px-1 text-sm font-medium text-sand-11">아직 남긴 말이 없어요.</p>}
                  >
                    <ul class="flex flex-col divide-y divide-sand-4 rounded-2xl border border-sand-4 bg-sand-2">
                      <For each={report().comments}>
                        {(comment) => (
                          <li class="px-4 py-3">
                            <p class="font-medium break-keep whitespace-pre-line">{comment.text}</p>
                            <p class="mt-1 text-sm font-medium text-sand-11">
                              {comment.school} ·{" "}
                              {formatDate(new Date(comment.at + 9 * 3_600_000).toISOString().slice(0, 10))}
                            </p>
                          </li>
                        )}
                      </For>
                    </ul>
                  </Show>
                </Block>
              </Show>
            </div>

            <aside class="flex w-full shrink-0 flex-col gap-y-10 lg:sticky lg:top-8 lg:w-88">
              <SignupLink url={report().signupUrl} />
              <DemoPanel demo={report().totals.demo} />
            </aside>
          </div>
        </Loading>
      </Errored>
    </>
  );
}

function FilterTabs(props: { value: ResearchFilter; onChange: (value: ResearchFilter) => void }) {
  return (
    <div role="radiogroup" aria-label="보여 줄 답변" class="flex rounded-xl bg-sand-3 p-1">
      <For each={Object.entries(FILTER_LABELS) as [ResearchFilter, string][]}>
        {([value, label]) => (
          <button
            type="button"
            role="radio"
            aria-checked={props.value === value ? "true" : "false"}
            class={[
              "h-10 cursor-pointer rounded-lg px-4 font-semibold transition-colors",
              props.value === value ? "bg-sand-1 text-sand-12" : "text-sand-11 hover:text-sand-12",
            ]}
            onClick={() => props.onChange(value)}
          >
            {label}
          </button>
        )}
      </For>
    </div>
  );
}

function Block(props: { title: string; class?: string; children: JSX.Element }) {
  return (
    <section class={["min-w-0", props.class]}>
      <SectionRule title={props.title} />
      <div class="mt-4 px-1">{props.children}</div>
    </section>
  );
}

function SignupLink(props: { url: string }) {
  const [copied, setCopied] = createSignal(false);
  let code: HTMLDivElement | undefined;

  function downloadQr() {
    const svg = code?.querySelector("svg");
    if (!svg) return;
    const copy = svg.cloneNode(true) as SVGSVGElement;
    const [, , size] = (svg.getAttribute("viewBox") ?? "0 0 0 0").split(" ").map(Number);
    copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    copy.setAttribute("viewBox", `-4 -4 ${size + 8} ${size + 8}`);
    copy.setAttribute("width", String((size + 8) * 16));
    copy.setAttribute("height", String((size + 8) * 16));
    const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    for (const [name, value] of [
      ["x", "-4"],
      ["y", "-4"],
      ["width", String(size + 8)],
      ["height", String(size + 8)],
      ["fill", "#ffffff"],
    ]) {
      background.setAttribute(name, value);
    }
    copy.prepend(background);
    saveFile(`${env.VITE_APP_NAME}-가입-QR.svg`, new Blob([copy.outerHTML], { type: "image/svg+xml" }));
  }

  return (
    <section>
      <SectionRule title="가입 링크" />
      <p class="mt-3 px-1 text-sm font-medium break-keep text-sand-11">
        구글 폼 대신 이 링크를 나눠 주세요. 학교 이메일로 가입하면서 이용 계획에 답해요.
      </p>
      <div class="mt-4 flex items-center gap-x-4 rounded-2xl border border-sand-4 bg-sand-2 p-4">
        <div ref={(el) => (code = el)} class="shrink-0 rounded-xl bg-white p-2.5">
          <QRCode value={props.url} label="가입 링크 QR" class="size-24" />
        </div>
        <div class="flex min-w-0 flex-col gap-y-2">
          <a href={props.url} target="_blank" rel="noreferrer" class="font-semibold break-all">
            {props.url}
          </a>
          <div class="flex flex-wrap gap-x-3 gap-y-1 text-sm font-semibold">
            <button
              type="button"
              class="cursor-pointer text-amber-11"
              onClick={() => {
                void navigator.clipboard?.writeText(props.url).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                });
              }}
            >
              {copied() ? "복사했어요" : "링크 복사"}
            </button>
            <button type="button" class="cursor-pointer text-sand-11 hover:text-sand-12" onClick={downloadQr}>
              QR 내려받기
            </button>
          </div>
        </div>
      </div>
      <p class="mt-2 px-1 text-sm font-medium break-keep text-sand-11">
        주소는 .env의 BASE_URL에서 와요. 배포한 주소로 바꿨는지 확인해 주세요.
      </p>
    </section>
  );
}

function DemoPanel(props: { demo: number }) {
  const [count, setCount] = createSignal("");
  const [busy, setBusy] = createSignal<"make" | "clear">();
  const [confirming, setConfirming] = createSignal(false);
  const [status, setStatus] = createSignal<Status>();
  const size = () => count() || String(props.demo || DEMO_DEFAULT_COUNT);

  async function make() {
    setStatus(undefined);
    setBusy("make");
    const result = await makeDemoData(Number(size()));
    setBusy(undefined);
    setStatus(
      result.ok
        ? { kind: "saved", text: `데모 학생 ${result.made}명의 답변을 만들었어요.` }
        : { kind: "error", text: result.message },
    );
  }

  async function clear() {
    setStatus(undefined);
    setBusy("clear");
    const result = await clearDemoData();
    setBusy(undefined);
    setConfirming(false);
    setStatus(
      result.ok
        ? { kind: "saved", text: `데모 학생 ${result.removed}명을 지웠어요.` }
        : { kind: "error", text: result.message },
    );
  }

  return (
    <section>
      <SectionRule title="데모 데이터" />
      <p class="mt-3 px-1 text-sm font-medium break-keep text-sand-11">
        실제 응답이 적을 때 쓰는 임의 학생이에요. 어디서나 ‘데모’로 따로 세고, 모의 노선에서 켜고 끌 수 있어요. 메일은
        가지 않아요.
      </p>
      <form
        class="mt-4 flex items-end gap-x-2"
        onSubmit={(e) => {
          e.preventDefault();
          void make();
        }}
      >
        <label class="flex w-32 flex-col gap-y-1.5">
          <span class="ml-1 text-sm font-semibold text-sand-11">학생 수</span>
          <span class="flex h-13 items-center rounded-xl border border-sand-5 bg-sand-2 pr-4 focus-within:border-amber-8 focus-within:ring-2 focus-within:ring-amber-5">
            <input
              type="number"
              inputmode="numeric"
              min="1"
              max="500"
              step="1"
              required
              value={size()}
              class="h-full min-w-0 flex-1 rounded-xl bg-transparent px-4 text-lg tabular-nums caret-amber-9 focus:outline-none"
              onInput={(e) => setCount(e.currentTarget.value)}
            />
            <span class="shrink-0 font-semibold text-sand-11">명</span>
          </span>
        </label>
        <Button type="submit" class="flex-1" variant={busy() === "make" ? "loading" : "secondary"}>
          {props.demo > 0 ? "다시 만들기" : "만들기"}
        </Button>
      </form>
      <Show when={props.demo > 0}>
        <div class="mt-3 flex items-center gap-x-3 px-1 text-sm font-semibold">
          <Show
            when={confirming()}
            fallback={
              <button type="button" class="cursor-pointer text-red-11" onClick={() => setConfirming(true)}>
                데모 학생 {props.demo}명 모두 지우기
              </button>
            }
          >
            <span class="text-sand-12">신청과 답변도 함께 지워져요.</span>
            <button
              type="button"
              class="cursor-pointer text-red-11 disabled:cursor-progress"
              disabled={busy() === "clear"}
              onClick={() => void clear()}
            >
              지우기
            </button>
            <button type="button" class="cursor-pointer text-sand-11" onClick={() => setConfirming(false)}>
              취소
            </button>
          </Show>
        </div>
      </Show>
      <p role="status" class="mt-2 min-h-6 px-1 text-sm font-semibold break-keep">
        <Show when={status()}>
          {(current) => (
            <span class={current().kind === "saved" ? "text-green-11" : "text-red-11"}>{current().text}</span>
          )}
        </Show>
      </p>
    </section>
  );
}
