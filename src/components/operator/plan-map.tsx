import { createEffect, createSignal, onSettled, Show } from "solid-js";
import { env } from "virtual:solid-env/client";

import { type KakaoMaps, loadKakaoMaps } from "../ride/walk-map";

export interface MapBus {
  key: string;
  stops: { lat: number; lng: number; kind: "board" | "alight"; riders: number; name: string }[];
}

interface Overlay {
  setMap(map: unknown): void;
}

interface KakaoMap {
  setBounds(bounds: unknown, padding: number): void;
  relayout(): void;
}

type Maps = Omit<KakaoMaps, "Polyline"> & {
  Circle: new (options: object) => Overlay;
  Polyline: new (options: object) => Overlay;
};

const ROUTE = "#a9a69d";
const SELECTED = "#ffc53d";
const SELECTED_EDGE = "#ab6400";
const INK = "#21201c";

export function PlanMap(props: { buses: MapBus[]; selected?: string; class?: string; label: string }) {
  let container: HTMLDivElement | undefined;
  const [ready, setReady] = createSignal<{ maps: Maps; map: KakaoMap }>();
  const [failed, setFailed] = createSignal(false);
  let framed: MapBus[] | undefined;

  onSettled(() => {
    if (!env.VITE_KAKAO_JS_KEY || !container) return;
    const el = container;
    let disposed = false;
    loadKakaoMaps(env.VITE_KAKAO_JS_KEY)
      .then((loaded) => {
        if (disposed) return;
        const maps = loaded as Maps;
        const map = new maps.Map(el, {
          center: new maps.LatLng(37.6, 127.04),
          level: 8,
          scrollwheel: false,
        }) as unknown as KakaoMap;
        setReady({ maps, map });
      })
      .catch(() => setFailed(true));
    const resize = new ResizeObserver(() => ready()?.map.relayout());
    resize.observe(el);
    return () => {
      disposed = true;
      resize.disconnect();
    };
  });

  createEffect(
    () => ({ current: ready(), buses: props.buses, selected: props.selected }),
    ({ current, buses, selected }) => {
      if (!current) return;
      const { maps, map } = current;
      const overlays: Overlay[] = [];
      const point = (stop: { lat: number; lng: number }) => new maps.LatLng(stop.lat, stop.lng);
      const ordered = [...buses].sort((a, b) => Number(a.key === selected) - Number(b.key === selected));

      for (const bus of ordered) {
        const path = bus.stops.map(point);
        const isSelected = bus.key === selected;
        if (isSelected) {
          overlays.push(
            new maps.Polyline({ map, path, strokeWeight: 9, strokeColor: SELECTED_EDGE, strokeOpacity: 1 }),
          );
        }
        overlays.push(
          new maps.Polyline({
            map,
            path,
            strokeWeight: isSelected ? 5 : 3,
            strokeColor: isSelected ? SELECTED : ROUTE,
            strokeOpacity: isSelected || !selected ? 0.95 : 0.45,
          }),
        );
      }
      for (const bus of ordered) {
        if (selected && bus.key !== selected) continue;
        for (const stop of bus.stops) {
          overlays.push(
            new maps.Circle({
              map,
              center: point(stop),
              radius: stop.kind === "board" ? 90 : 50 + Math.sqrt(stop.riders) * 35,
              strokeWeight: 2,
              strokeColor: INK,
              strokeOpacity: 1,
              fillColor: stop.kind === "board" ? INK : "#ffffff",
              fillOpacity: 1,
            }),
          );
        }
      }

      if (framed !== buses && buses.some((bus) => bus.stops.length > 0)) {
        framed = buses;
        const bounds = new maps.LatLngBounds();
        for (const bus of buses) for (const stop of bus.stops) bounds.extend(point(stop));
        map.setBounds(bounds, 32);
      }
      return () => {
        for (const overlay of overlays) overlay.setMap(null);
      };
    },
  );

  return (
    <Show
      when={env.VITE_KAKAO_JS_KEY && !failed()}
      fallback={
        <p class="rounded-2xl border border-sand-4 bg-sand-2 px-5 py-4 text-sm font-medium break-keep text-sand-11">
          지도를 불러오지 못했어요. VITE_KAKAO_JS_KEY와 카카오 개발자 사이트에 등록한 도메인을 확인해 주세요.
        </p>
      }
    >
      <div
        ref={(el) => (container = el)}
        role="img"
        aria-label={props.label}
        class={["w-full overflow-hidden rounded-2xl border border-sand-4 bg-sand-3", props.class]}
      />
    </Show>
  );
}
