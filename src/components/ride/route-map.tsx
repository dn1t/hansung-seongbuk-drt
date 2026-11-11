import { onSettled, Show } from "solid-js";
import { env } from "virtual:solid-env/client";

import type { BusOption } from "../../lib/ride";
import { loadKakaoMaps } from "./walk-map";

const ROUTE_COLOR = "#a9a69d";
const RIDE_COLOR = "#ffc53d";

export function RouteMap(props: { option: BusOption }) {
  let container: HTMLDivElement | undefined;

  onSettled(() => {
    if (!env.VITE_KAKAO_JS_KEY || !container) return;
    const el = container;
    const { stops, boardIndex, alightIndex } = props.option;
    loadKakaoMaps(env.VITE_KAKAO_JS_KEY)
      .then((maps) => {
        const points = stops.map((stop) => new maps.LatLng(stop.lat, stop.lng));
        const map = new maps.Map(el, { center: points[boardIndex], level: 6, draggable: true, scrollwheel: false });
        new maps.Polyline({ map, path: points, strokeWeight: 4, strokeColor: ROUTE_COLOR, strokeOpacity: 0.9 });
        new maps.Polyline({
          map,
          path: points.slice(boardIndex, alightIndex + 1),
          strokeWeight: 6,
          strokeColor: RIDE_COLOR,
          strokeOpacity: 1,
        });
        new maps.Marker({ map, position: points[boardIndex], title: `${stops[boardIndex].name} 승차` });
        new maps.Marker({ map, position: points[alightIndex], title: `${stops[alightIndex].name} 하차` });
        const bounds = new maps.LatLngBounds();
        for (const point of points) bounds.extend(point);
        map.setBounds(bounds, 24);
      })
      .catch(() => el.remove());
  });

  return (
    <Show when={env.VITE_KAKAO_JS_KEY}>
      <div
        ref={(el) => (container = el)}
        role="img"
        aria-label={`${props.option.stops[props.option.boardIndex].name}에서 ${props.option.stops[props.option.alightIndex].name}까지 노선 지도`}
        class="mt-4 h-56 w-full overflow-hidden rounded-2xl border border-sand-4 bg-sand-3"
      />
    </Show>
  );
}
