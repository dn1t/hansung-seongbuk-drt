import { Title } from "@solidjs/meta";
import { createMemo, createSignal, Errored, For, Loading, Show } from "solid-js";
import { env } from "virtual:solid-env/client";

import { SectionRule } from "../../components/layout/screen";
import { AddPlacePanel } from "../../components/operator/place-panel";
import { addStartArea, deleteStartArea, getStartAreas } from "../../lib/operator";

const mapLink = (place: { name: string; lat: number; lng: number }) =>
  `https://map.kakao.com/link/map/${encodeURIComponent(place.name)},${place.lat},${place.lng}`;

export default function OperatorPlaces() {
  const data = createMemo(() => getStartAreas());
  const [confirming, setConfirming] = createSignal<string>();
  const [error, setError] = createSignal("");

  async function remove(id: string) {
    setError("");
    const result = await deleteStartArea(id);
    setConfirming(undefined);
    if (!result.ok) setError(result.message);
  }

  return (
    <>
      <Title>{`출발지 - 운영 - ${env.VITE_APP_NAME}`}</Title>
      <div class="grid grid-cols-[minmax(0,1fr)] gap-x-10 gap-y-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section class="min-w-0">
          <header class="px-1">
            <h1 class="text-3xl font-bold">출발지</h1>
            <p class="mt-2 font-medium text-balance break-keep text-sand-11">
              학생이 당일 신청에서 고르는 출발할 곳이에요. 학교는 가입할 수 있는 학교로 정해져 있고, 학교 근처 번화가를
              여기서 더할 수 있어요.
            </p>
          </header>
          <Errored
            fallback={(_, reset) => (
              <div class="mt-8 px-1">
                <p class="font-semibold">출발지를 불러오지 못했어요.</p>
                <button type="button" class="mt-2 cursor-pointer font-semibold text-amber-11" onClick={reset}>
                  다시 불러오기
                </button>
              </div>
            )}
          >
            <Loading fallback={<div class="h-64" />}>
              <SectionRule title={`번화가 ${data().areas.length}곳`} class="mt-10" />
              <Show when={error()}>
                <p role="alert" class="mt-3 px-1 font-semibold break-keep text-red-11">
                  {error()}
                </p>
              </Show>
              <Show
                when={data().areas.length > 0}
                fallback={
                  <p class="mt-4 px-1 font-medium break-keep text-sand-11">
                    아직 없어요. 오른쪽에서 검색해서 넣어 주세요.
                  </p>
                }
              >
                <ul class="mt-4 overflow-hidden rounded-2xl border border-sand-4">
                  <For each={data().areas} keyed={(area) => area.id}>
                    {(area) => (
                      <li class="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-sand-4 px-4 py-3 last:border-b-0">
                        <span class="flex min-w-0 flex-1 flex-col">
                          <a
                            href={mapLink(area())}
                            target="_blank"
                            rel="noreferrer"
                            class="font-semibold break-keep hover:underline"
                          >
                            {area().name}
                          </a>
                          <span class="text-sm break-keep text-sand-11">{area().address}</span>
                        </span>
                        <Show
                          when={confirming() === area().id}
                          fallback={
                            <button
                              type="button"
                              class="cursor-pointer text-sm font-semibold text-sand-11 hover:text-red-11"
                              onClick={() => setConfirming(area().id)}
                            >
                              삭제
                            </button>
                          }
                        >
                          <span class="flex items-center gap-x-3 text-sm font-semibold">
                            <span class="text-sand-11">삭제할까요?</span>
                            <button
                              type="button"
                              class="cursor-pointer text-red-11"
                              onClick={() => void remove(area().id)}
                            >
                              삭제
                            </button>
                            <button
                              type="button"
                              class="cursor-pointer text-sand-11"
                              onClick={() => setConfirming(undefined)}
                            >
                              취소
                            </button>
                          </span>
                        </Show>
                      </li>
                    )}
                  </For>
                </ul>
              </Show>

              <SectionRule title={`학교 ${data().schools.length}곳`} class="mt-10" />
              <ul class="mt-4 grid gap-2 px-1 sm:grid-cols-2">
                <For each={data().schools} keyed={(school) => school.id}>
                  {(school) => (
                    <li>
                      <a
                        href={mapLink(school())}
                        target="_blank"
                        rel="noreferrer"
                        class="font-medium break-keep text-sand-11 hover:text-sand-12 hover:underline"
                      >
                        {school().name}
                      </a>
                    </li>
                  )}
                </For>
              </ul>
            </Loading>
          </Errored>
        </section>
        <AddPlacePanel
          title="번화가 넣기"
          nameLabel="출발지 이름"
          placeholder="성신여대 먹자골목"
          hint="번화가나 거리 이름을 검색해 주세요."
          submitLabel="출발지 넣기"
          savedText={(name) => `‘${name}’ 출발지를 넣었어요.`}
          onAdd={addStartArea}
        />
      </div>
    </>
  );
}
