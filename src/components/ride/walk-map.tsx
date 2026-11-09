import { onSettled, Show } from "solid-js";
import { env } from "virtual:solid-env/client";

interface Place {
  name: string;
  lat: number;
  lng: number;
}

interface KakaoMaps {
  load(callback: () => void): void;
  LatLng: new (lat: number, lng: number) => unknown;
  LatLngBounds: new () => { extend(point: unknown): void };
  Map: new (el: HTMLElement, options: object) => { setBounds(bounds: unknown, padding: number): void };
  Marker: new (options: object) => unknown;
}

declare global {
  interface Window {
    kakao?: { maps: KakaoMaps };
  }
}

let sdk: Promise<KakaoMaps> | undefined;

function loadKakaoMaps(appKey: string) {
  sdk ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false`;
    script.onload = () => window.kakao!.maps.load(() => resolve(window.kakao!.maps));
    script.onerror = () => {
      sdk = undefined;
      reject(new Error("kakao maps sdk failed to load"));
    };
    document.head.append(script);
  });
  return sdk;
}

const directionsUrl = (from: Place, to: Place) =>
  `https://map.kakao.com/link/by/walk/${encodeURIComponent(from.name)},${from.lat},${from.lng}/${encodeURIComponent(to.name)},${to.lat},${to.lng}`;

export function WalkMap(props: { from: Place; to: Place; minutes: number }) {
  let container: HTMLDivElement | undefined;

  onSettled(() => {
    if (!env.VITE_KAKAO_JS_KEY || !container) return;
    const el = container;
    loadKakaoMaps(env.VITE_KAKAO_JS_KEY)
      .then((maps) => {
        const from = new maps.LatLng(props.from.lat, props.from.lng);
        const to = new maps.LatLng(props.to.lat, props.to.lng);
        const map = new maps.Map(el, { center: to, level: 3, draggable: false, scrollwheel: false });
        new maps.Marker({ map, position: from });
        new maps.Marker({ map, position: to });
        const bounds = new maps.LatLngBounds();
        bounds.extend(from);
        bounds.extend(to);
        map.setBounds(bounds, 32);
      })
      .catch(() => el.remove());
  });

  return (
    <div class="overflow-hidden rounded-2xl border border-sand-4">
      <Show when={env.VITE_KAKAO_JS_KEY}>
        <div ref={(el) => (container = el)} aria-hidden="true" class="h-40 w-full bg-sand-3" />
      </Show>
      <a
        href={directionsUrl(props.from, props.to)}
        target="_blank"
        rel="noreferrer"
        class="flex items-center gap-x-3 bg-sand-2 px-4 py-3"
      >
        <PhPersonSimpleWalkBold aria-hidden="true" class="shrink-0 text-lg text-sand-11" />
        <span class="flex min-w-0 flex-1 flex-col">
          <span class="font-semibold tabular-nums">걸어서 {props.minutes}분</span>
          <span class="text-sm break-keep text-sand-11">
            {props.from.name} → {props.to.name}
          </span>
        </span>
        <span class="flex shrink-0 items-center gap-x-0.5 text-sm font-semibold text-sand-11">
          길찾기
          <PhArrowUpRightBold aria-hidden="true" class="text-xs" />
        </span>
      </a>
    </div>
  );
}
