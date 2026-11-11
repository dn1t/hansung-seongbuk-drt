import { Title } from "@solidjs/meta";
import { createMemo, createSignal, Errored, For, Loading, Show } from "solid-js";
import { env } from "virtual:solid-env/client";

import { Input } from "../../components/common/input";
import { AddPlacePanel } from "../../components/operator/place-panel";
import { StopImport } from "../../components/operator/stop-import";
import {
  addStop,
  deleteAllStops,
  deleteStop,
  getStops,
  renameStop,
  type Stop,
  STOP_NAME_MAX_LENGTH,
} from "../../lib/operator";

const mapLink = (stop: Stop) =>
  `https://map.kakao.com/link/map/${encodeURIComponent(stop.name)},${stop.lat},${stop.lng}`;

const ROWS_SHOWN = 200;

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
      <div class="grid grid-cols-[minmax(0,1fr)] gap-x-10 gap-y-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section class="min-w-0">
          <header class="px-1">
            <h1 class="text-3xl font-bold">정류장</h1>
            <p class="mt-2 font-medium text-balance break-keep text-sand-11">
              노선을 만들 때 정류장 후보로 써요. 학교에서 400m 안에 있으면 타는 곳이 되고, 내리는 곳은 신청한 학생
              집에서 가까운 정류장 중 꼭 필요한 곳만 골라요. 이미 정해진 노선은 바뀌지 않아요.
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
                <div class="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 px-1 pb-3.5">
                  <p class="text-sm font-medium text-sand-11 tabular-nums">
                    <Show when={filter().trim()} fallback={<>정류장 {stops().length.toLocaleString()}곳</>}>
                      {stops().length.toLocaleString()}곳 중 {shown().length.toLocaleString()}곳
                    </Show>
                  </p>
                  <Show when={stops().length > 0}>
                    <DeleteAll count={stops().length} />
                  </Show>
                </div>
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
                  <div class="relative mt-4 overflow-x-auto rounded-2xl border border-sand-4">
                    <table class="w-full min-w-[44rem] border-collapse text-start">
                      <thead class="bg-sand-2 text-sm font-semibold text-sand-11">
                        <tr>
                          <th scope="col" class="py-3 pr-3 pl-4 text-start font-semibold">
                            이름
                          </th>
                          <th scope="col" class="min-w-44 px-3 py-3 text-start font-semibold">
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
                        <For each={shown().slice(0, ROWS_SHOWN)} keyed={(stop) => stop.id}>
                          {(stop) => <StopRow stop={stop()} />}
                        </For>
                      </tbody>
                    </table>
                  </div>
                  <Show when={shown().length > ROWS_SHOWN}>
                    <p class="mt-3 px-1 text-sm font-medium text-sand-11 tabular-nums">
                      {`앞의 ${ROWS_SHOWN}곳만 보여요. 나머지 ${(shown().length - ROWS_SHOWN).toLocaleString()}곳은 위에서 찾아 주세요.`}
                    </p>
                  </Show>
                </Show>
              </Show>
            </Loading>
          </Errored>
        </section>
        <AddPlacePanel
          title="정류장 넣기"
          nameLabel="정류장 이름"
          placeholder="한성대입구역 5번 출구"
          hint="정류장 이름이나 역 이름을 검색해 주세요."
          submitLabel="정류장 넣기"
          savedText={(name) => `‘${name}’ 정류장을 넣었어요.`}
          onAdd={addStop}
        >
          <StopImport />
        </AddPlacePanel>
      </div>
    </>
  );
}

function DeleteAll(props: { count: number }) {
  const [confirming, setConfirming] = createSignal(false);
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal("");

  async function run() {
    setError("");
    setBusy(true);
    try {
      const result = await deleteAllStops();
      if (!result.ok) throw new Error(result.message);
      setConfirming(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div class="flex flex-col items-end gap-y-1 text-sm font-semibold">
      <Show
        when={confirming()}
        fallback={
          <button
            type="button"
            class="cursor-pointer text-sand-11 hover:text-red-11"
            onClick={() => {
              setError("");
              setConfirming(true);
            }}
          >
            모두 삭제
          </button>
        }
      >
        <div class="flex items-center gap-x-3">
          <span class="font-medium text-sand-11 tabular-nums">{props.count.toLocaleString()}곳을 모두 삭제할까요?</span>
          <button
            type="button"
            disabled={busy()}
            class="cursor-pointer text-red-11 disabled:cursor-progress"
            onClick={() => void run()}
          >
            모두 삭제
          </button>
          <button
            type="button"
            class="cursor-pointer text-sand-11 hover:text-sand-12"
            onClick={() => setConfirming(false)}
          >
            취소
          </button>
        </div>
        <p class="font-medium text-balance break-keep text-sand-11">이미 정해진 노선은 그대로예요.</p>
      </Show>
      <Show when={error()}>
        <p role="alert" class="font-medium break-keep text-red-11">
          {error()}
        </p>
      </Show>
    </div>
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
