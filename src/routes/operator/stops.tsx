import { Title } from "@solidjs/meta";
import { createMemo, createSignal, Errored, For, isPending, Loading, onSettled, Show } from "solid-js";
import { env } from "virtual:solid-env/client";

import { Button } from "../../components/common/button";
import { FadeScroll } from "../../components/common/fade-scroll";
import { Input } from "../../components/common/input";
import { OptionCard } from "../../components/common/option-card";
import { SectionRule } from "../../components/layout/screen";
import type { AddressResult } from "../../lib/address";
import {
  addStop,
  deleteStop,
  getStops,
  renameStop,
  searchStopPlaces,
  type Stop,
  STOP_NAME_MAX_LENGTH,
} from "../../lib/operator";

const mapLink = (stop: Stop) =>
  `https://map.kakao.com/link/map/${encodeURIComponent(stop.name)},${stop.lat},${stop.lng}`;

export default function OperatorStops() {
  const stops = createMemo(() => getStops());
  const [filter, setFilter] = createSignal("");
  const shown = () => {
    const text = filter().trim();
    return text ? stops().filter((s) => s.name.includes(text) || s.address.includes(text)) : stops();
  };

  return (
    <>
      <Title>{`정류장 - 운영 - ${env.VITE_APP_NAME}`}</Title>
      <div class="grid gap-x-10 gap-y-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section class="min-w-0">
          <header class="px-1">
            <h1 class="text-3xl font-bold">정류장</h1>
            <p class="mt-2 font-medium text-balance break-keep text-sand-11">
              노선을 만들 때 내릴 정류장 후보로 써요. 학생 앱의 노선은 아직 예시 데이터라 여기 넣은 정류장이 바로
              보이지는 않아요.
            </p>
          </header>
          <Errored
            fallback={(_, reset) => (
              <div class="mt-8 px-1">
                <p class="font-semibold">정류장을 불러오지 못했어요.</p>
                <button type="button" class="mt-2 cursor-pointer font-semibold text-amber-11" onClick={reset}>
                  다시 불러오기
                </button>
              </div>
            )}
          >
            <Loading fallback={<div class="h-64" />}>
              <div class="mt-8 flex flex-wrap items-end justify-between gap-3">
                <Input
                  type="search"
                  label="목록에서 찾기"
                  placeholder="정류장 이름이나 주소"
                  icon={PhMagnifyingGlass}
                  labelClass="w-full max-w-xs"
                  onInput={(e) => setFilter(e.currentTarget.value)}
                />
                <p class="px-1 pb-3.5 text-sm font-medium text-sand-11 tabular-nums">
                  <Show when={filter().trim()} fallback={<>정류장 {stops().length}곳</>}>
                    {stops().length}곳 중 {shown().length}곳
                  </Show>
                </p>
              </div>
              <Show
                when={stops().length > 0}
                fallback={
                  <p class="mt-6 rounded-2xl border border-dashed border-sand-6 px-6 py-10 text-center font-medium text-balance break-keep text-sand-11">
                    아직 넣은 정류장이 없어요. 장소를 검색해서 첫 정류장을 넣어 주세요.
                  </p>
                }
              >
                <Show
                  when={shown().length > 0}
                  fallback={
                    <p class="mt-6 px-1 font-medium text-sand-11">‘{filter().trim()}’에 맞는 정류장이 없어요.</p>
                  }
                >
                  <div class="mt-4 overflow-x-auto rounded-2xl border border-sand-4">
                    <table class="w-full min-w-[36rem] border-collapse text-start">
                      <thead class="bg-sand-2 text-sm font-semibold text-sand-11">
                        <tr>
                          <th scope="col" class="py-3 pr-3 pl-4 text-start font-semibold">
                            이름
                          </th>
                          <th scope="col" class="px-3 py-3 text-start font-semibold">
                            주소
                          </th>
                          <th scope="col" class="px-3 py-3 text-start font-semibold">
                            위치
                          </th>
                          <th scope="col" class="py-3 pr-4 pl-3 text-end font-semibold">
                            <span class="sr-only">관리</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={shown()}>{(stop) => <StopRow stop={stop} />}</For>
                      </tbody>
                    </table>
                  </div>
                </Show>
              </Show>
            </Loading>
          </Errored>
        </section>
        <AddStopPanel />
      </div>
    </>
  );
}

function StopRow(props: { stop: Stop }) {
  const [mode, setMode] = createSignal<"view" | "rename" | "delete">("view");
  const [name, setName] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal("");

  async function run(task: () => Promise<{ ok: true } | { ok: false; message: string }>) {
    setError("");
    setBusy(true);
    try {
      const result = await task();
      if (!result.ok) throw new Error(result.message);
      setMode("view");
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr class="border-t border-sand-4 align-middle">
      <td class="py-3 pr-3 pl-4">
        <Show when={mode() === "rename"} fallback={<span class="font-semibold break-keep">{props.stop.name}</span>}>
          <form
            class="flex items-center gap-x-2"
            onSubmit={(e) => {
              e.preventDefault();
              void run(() => renameStop(props.stop.id, name()));
            }}
          >
            <input
              type="text"
              aria-label="새 이름"
              value={props.stop.name}
              maxlength={STOP_NAME_MAX_LENGTH}
              autofocus
              class="h-10 w-full min-w-0 rounded-xl border border-sand-5 bg-sand-2 px-3 font-semibold caret-amber-9 focus:border-amber-8 focus:ring-2 focus:ring-amber-5 focus:outline-none"
              onInput={(e) => setName(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setMode("view");
              }}
            />
          </form>
        </Show>
        <Show when={error()}>
          <p role="alert" class="mt-1 text-sm font-medium break-keep text-red-11">
            {error()}
          </p>
        </Show>
      </td>
      <td class="px-3 py-3 text-sm font-medium break-keep text-sand-11">{props.stop.address}</td>
      <td class="px-3 py-3 text-sm font-medium whitespace-nowrap text-sand-11 tabular-nums">
        <a
          href={mapLink(props.stop)}
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-x-1 hover:text-sand-12"
        >
          {props.stop.lat.toFixed(5)}, {props.stop.lng.toFixed(5)}
          <PhArrowUpRightBold aria-hidden="true" class="text-xs" />
          <span class="sr-only">카카오맵에서 보기</span>
        </a>
      </td>
      <td class="py-3 pr-4 pl-3 text-end whitespace-nowrap">
        <div class="flex items-center justify-end gap-x-3 text-sm font-semibold">
          <Show when={mode() === "view"}>
            <button
              type="button"
              class="cursor-pointer text-sand-11 hover:text-sand-12"
              onClick={() => {
                setName(props.stop.name);
                setError("");
                setMode("rename");
              }}
            >
              이름 바꾸기
            </button>
            <button
              type="button"
              class="cursor-pointer text-sand-11 hover:text-red-11"
              onClick={() => {
                setError("");
                setMode("delete");
              }}
            >
              삭제
            </button>
          </Show>
          <Show when={mode() === "rename"}>
            <button
              type="button"
              disabled={busy()}
              class="cursor-pointer text-amber-11 disabled:cursor-progress"
              onClick={() => void run(() => renameStop(props.stop.id, name()))}
            >
              저장
            </button>
            <button
              type="button"
              class="cursor-pointer text-sand-11 hover:text-sand-12"
              onClick={() => setMode("view")}
            >
              취소
            </button>
          </Show>
          <Show when={mode() === "delete"}>
            <span class="font-medium text-sand-11">삭제할까요?</span>
            <button
              type="button"
              disabled={busy()}
              class="cursor-pointer text-red-11 disabled:cursor-progress"
              onClick={() => void run(() => deleteStop(props.stop.id))}
            >
              삭제
            </button>
            <button
              type="button"
              class="cursor-pointer text-sand-11 hover:text-sand-12"
              onClick={() => setMode("view")}
            >
              취소
            </button>
          </Show>
        </div>
      </td>
    </tr>
  );
}

function AddStopPanel() {
  const [query, setQuery] = createSignal("");
  const [picked, setPicked] = createSignal<AddressResult>();
  const [name, setName] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const [message, setMessage] = createSignal<{ kind: "saved" | "error"; text: string }>();
  const results = createMemo(() => (query().length >= 2 ? searchStopPlaces(query()) : []));
  let timer: ReturnType<typeof setTimeout> | undefined;
  let searchInput: HTMLInputElement | undefined;

  function searchSoon(value: string, delay = 300) {
    clearTimeout(timer);
    timer = setTimeout(() => setQuery(value.trim()), delay);
  }

  onSettled(() => () => clearTimeout(timer));

  async function submit() {
    const place = picked();
    if (!place) return;
    setMessage(undefined);
    setBusy(true);
    try {
      const stopName = name().trim() || place.title;
      const result = await addStop({ name: stopName, address: place.address, lat: place.lat, lng: place.lng });
      if (!result.ok) throw new Error(result.message);
      setMessage({ kind: "saved", text: `‘${stopName}’ 정류장을 넣었어요.` });
      setPicked(undefined);
      setName("");
      setQuery("");
      if (searchInput) {
        searchInput.value = "";
        searchInput.focus();
      }
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "넣지 못했어요. 다시 시도해 주세요." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside class="lg:sticky lg:top-8 lg:self-start">
      <SectionRule title="정류장 넣기" />
      <form
        class="mt-4 flex flex-col gap-y-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Input
          ref={(el) => (searchInput = el)}
          type="search"
          label="장소 검색"
          placeholder="한성대입구역 5번 출구"
          icon={PhMagnifyingGlass}
          autocomplete="off"
          onInput={(e) => {
            setPicked(undefined);
            searchSoon(e.currentTarget.value);
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            searchSoon(e.currentTarget.value, 0);
          }}
        />
        <FadeScroll class="-mx-1 flex h-72 flex-col p-1">
          <Errored
            fallback={
              <span class="m-auto px-4 text-center text-red-11">
                장소를 검색하지 못했어요. 잠시 후 다시 시도해 주세요.
              </span>
            }
          >
            <Loading fallback={<span class="m-auto text-sand-10">검색 중…</span>}>
              <Show
                when={results().length > 0}
                fallback={
                  <span class="m-auto text-sand-10">
                    {query().length < 2
                      ? "정류장 이름이나 역 이름을 검색해 주세요."
                      : isPending(() => results())
                        ? "검색 중…"
                        : "검색 결과가 없어요."}
                  </span>
                }
              >
                <ul class={["flex flex-col gap-y-2 transition-opacity", { "opacity-60": isPending(() => results()) }]}>
                  <For each={results()}>
                    {(result) => (
                      <li>
                        <OptionCard
                          selected={picked()?.id === result.id}
                          onClick={() => {
                            setPicked(result);
                            setName(result.title);
                            setMessage(undefined);
                          }}
                        >
                          <span class="font-semibold break-keep">{result.title}</span>
                          <Show when={result.subtitle}>
                            <span class="text-sm break-keep text-sand-11">{result.subtitle}</span>
                          </Show>
                        </OptionCard>
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
            </Loading>
          </Errored>
        </FadeScroll>
        <Input
          type="text"
          label="정류장 이름"
          placeholder="장소를 고르면 채워져요"
          maxlength={STOP_NAME_MAX_LENGTH}
          disabled={!picked()}
          value={name()}
          class="disabled:cursor-not-allowed disabled:text-sand-11"
          onInput={(e) => setName(e.currentTarget.value)}
        />
        <Show when={message()}>
          {(current) => (
            <p
              role="status"
              class={[
                "flex items-center gap-x-1.5 px-1 font-semibold break-keep",
                current().kind === "saved" ? "text-green-11" : "text-red-11",
              ]}
            >
              <Show
                when={current().kind === "saved"}
                fallback={<PhWarningCircle aria-hidden="true" class="shrink-0" />}
              >
                <PhCheckCircle aria-hidden="true" class="shrink-0" />
              </Show>
              {current().text}
            </p>
          )}
        </Show>
        <Button type="submit" class="mt-1" variant={busy() ? "loading" : picked() ? "primary" : "disabled"}>
          정류장 넣기
        </Button>
      </form>
    </aside>
  );
}
