import "server-only";
import { env } from "virtual:solid-env/server";

const PEDESTRIAN_URL = "https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1";

interface TmapFeature {
  properties?: { totalTime?: number; totalDistance?: number };
}

export async function tmapWalk(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const res = await fetch(PEDESTRIAN_URL, {
    method: "POST",
    headers: { appKey: env.TMAP_APP_KEY ?? "", "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      startX: String(from.lng),
      startY: String(from.lat),
      endX: String(to.lng),
      endY: String(to.lat),
      startName: encodeURIComponent("출발"),
      endName: encodeURIComponent("도착"),
      reqCoordType: "WGS84GEO",
      resCoordType: "WGS84GEO",
    }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`tmap pedestrian failed: ${res.status} ${await res.text()}`);
  const first = ((await res.json()) as { features?: TmapFeature[] }).features?.[0]?.properties;
  if (first?.totalTime === undefined) throw new Error("tmap pedestrian: no totalTime");
  return { seconds: first.totalTime, meters: first.totalDistance ?? 0 };
}
