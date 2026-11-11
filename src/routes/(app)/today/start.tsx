import { Title } from "@solidjs/meta";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { createMemo, createSignal, For, Loading, onSettled, Show } from "solid-js";
import { env } from "virtual:solid-env/client";

import { FadeScroll } from "../../../components/common/fade-scroll";
import { OptionCard } from "../../../components/common/option-card";
import { Footer, Header } from "../../../components/layout/screen";
import {
  type Coords,
  currentPosition,
  distanceMeters,
  formatDistance,
  type LocationPermission,
  locationPermission,
} from "../../../lib/geo";
import { getStartPoints } from "../../../lib/ride";
import { FLOW_TOTAL_STEPS, flowHref } from "../../../lib/ride-flow";

export default function TodayStart() {
  const nav = useNavigate();
  const [params] = useSearchParams<{ start?: string; from?: string; to?: string }>();
  const data = createMemo(() => getStartPoints());
  const [picked, setPicked] = createSignal<string>();
  const [permission, setPermission] = createSignal<LocationPermission>();
  const [here, setHere] = createSignal<Coords>();
  const [locating, setLocating] = createSignal(false);

  function locate() {
    setLocating(true);
    currentPosition()
      .then((coords) => {
        setHere(coords);
        setPermission("granted");
      })
      .catch(() => setPermission("denied"))
      .finally(() => setLocating(false));
  }

  onSettled(() => {
    void locationPermission().then((state) => {
      setPermission(state);
      if (state === "granted") locate();
    });
  });

  const distances = createMemo(() => {
    const position = here();
    if (!position) return undefined;
    return new Map(data().points.map((point) => [point.id, distanceMeters(position, point)]));
  });

  const nearestId = createMemo(() => {
    const map = distances();
    if (!map) return undefined;
    return [...map].reduce((best, entry) => (entry[1] < best[1] ? entry : best))[0];
  });

  const ordered = createMemo(() => {
    const points = data().points;
    const map = distances();
    if (!map) return points;
    const own = points.filter((p) => p.name === data().ownSchool);
    const nearest = points.filter((p) => p.id === nearestId() && p.name !== data().ownSchool);
    const rest = points
      .filter((p) => p.name !== data().ownSchool && p.id !== nearestId())
      .sort((a, b) => map.get(a.id)! - map.get(b.id)!);
    return [...own, ...nearest, ...rest];
  });

  const selected = () => {
    const points = data().points;
    const wanted = picked() ?? params.start ?? nearestId();
    return points.some((p) => p.id === wanted) ? wanted : points[0]?.id;
  };

  return (
    <div class="flex h-dvh flex-col px-5">
      <Title>{`출발할 곳 - ${env.VITE_APP_NAME}`}</Title>
      <Header
        title="어디서 출발해요?"
        description="고른 곳에서 가장 가까운 정류장에서 타요."
        step={{ current: 1, total: FLOW_TOTAL_STEPS }}
        onBackClick={() => nav("/")}
      />
      <Show when={permission() === "prompt" || locating()}>
        <button
          type="button"
          disabled={locating()}
          class="mt-2 flex w-max cursor-pointer items-center gap-x-1.5 px-1 text-sm font-semibold text-sand-12 disabled:cursor-progress disabled:text-sand-10"
          onClick={locate}
        >
          <PhNavigationArrowBold aria-hidden="true" class="shrink-0" />
          {locating() ? "지금 위치를 찾는 중…" : "지금 위치로 가까운 곳 찾기"}
        </button>
      </Show>
      <Loading fallback={<div class="flex-1" />}>
        <FadeScroll class="-mx-1 mt-3 min-h-0 flex-1 p-1">
          <ul class="flex flex-col gap-y-2">
            <For each={ordered()} keyed={(point) => point.id}>
              {(point) => {
                const isOwn = () => point().name === data().ownSchool;
                const isNearest = () => point().id === nearestId();
                const details = () =>
                  [
                    isOwn() && "내 학교",
                    point().kind === "area" && "학교 근처 번화가",
                    distances() && `지금 위치에서 ${formatDistance(distances()!.get(point().id)!)}`,
                  ]
                    .filter(Boolean)
                    .join(" · ");
                return (
                  <li>
                    <OptionCard selected={selected() === point().id} onClick={() => setPicked(point().id)}>
                      <span class="flex flex-wrap items-center gap-x-2">
                        <span class="font-semibold break-keep">{point().name}</span>
                        <Show when={isNearest()}>
                          <span class="text-sm font-bold text-amber-11">가장 가까워요</span>
                        </Show>
                      </span>
                      <Show when={details()}>
                        <span class="text-sm text-sand-11 tabular-nums">{details()}</span>
                      </Show>
                    </OptionCard>
                  </li>
                );
              }}
            </For>
          </ul>
        </FadeScroll>
        <Footer
          type="button"
          buttonLabel="다음"
          variant={selected() ? "primary" : "disabled"}
          onClick={() => nav(flowHref("/today/time", { start: selected(), from: params.from, to: params.to }))}
        />
      </Loading>
    </div>
  );
}
