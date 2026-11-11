import "server-only";
import { env } from "virtual:solid-env/server";

import type { AddressResult } from "../lib/address";

// https://developers.kakao.com/docs/latest/ko/local/dev-guide
const BASE_URL = "https://dapi.kakao.com/v2/local/search";

interface KakaoAddressDocument {
  address_name: string;
  address_type: "REGION" | "ROAD" | "REGION_ADDR" | "ROAD_ADDR";
  x: string;
  y: string;
  address: { address_name: string } | null;
  road_address: { address_name: string; building_name: string } | null;
}

interface KakaoKeywordDocument {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
}

async function request<T>(path: "address" | "keyword", params: Record<string, string>): Promise<T[]> {
  const url = `${BASE_URL}/${path}.json?${new URLSearchParams(params)}`;
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${env.KAKAO_REST_API_KEY}` } });
  if (!res.ok) throw new Error(`kakao ${path} search failed: ${res.status} ${await res.text()}`);
  return ((await res.json()) as { documents: T[] }).documents;
}

export async function searchKakaoAddress(query: string): Promise<AddressResult[]> {
  const docs = await request<KakaoAddressDocument>("address", { query, size: "10" });
  return docs
    .filter((doc) => doc.address_type === "ROAD_ADDR" || doc.address_type === "REGION_ADDR")
    .map((doc) => {
      const road = doc.road_address?.address_name;
      const jibun = doc.address?.address_name;
      return {
        id: `address:${doc.x},${doc.y}:${doc.address_name}`,
        address: road || jibun || doc.address_name,
        title: [road || jibun || doc.address_name, doc.road_address?.building_name].filter(Boolean).join(" "),
        subtitle: road && jibun ? `지번 ${jibun}` : undefined,
        lat: Number(doc.y),
        lng: Number(doc.x),
      };
    });
}

export async function searchKakaoKeyword(query: string): Promise<AddressResult[]> {
  const docs = await request<KakaoKeywordDocument>("keyword", { query, size: "10" });
  return docs.map((doc) => ({
    id: `keyword:${doc.id}`,
    address: doc.road_address_name || doc.address_name,
    title: doc.place_name,
    subtitle: doc.road_address_name || doc.address_name,
    lat: Number(doc.y),
    lng: Number(doc.x),
  }));
}

const DIRECTIONS_URL = "https://apis-navi.kakaomobility.com/v1/waypoints/directions";
export const DIRECTIONS_MAX_POINTS = 32;

interface KakaoSection {
  distance: number;
  duration: number;
}

interface KakaoDirections {
  routes: { result_code: number; result_msg: string; sections?: KakaoSection[] }[];
}

export async function kakaoDriveSections(points: { lat: number; lng: number }[]) {
  if (points.length < 2 || points.length > DIRECTIONS_MAX_POINTS) throw new Error("kakao directions: bad point count");
  const at = (p: { lat: number; lng: number }) => ({ x: String(p.lng), y: String(p.lat) });
  const res = await fetch(DIRECTIONS_URL, {
    method: "POST",
    headers: { Authorization: `KakaoAK ${env.KAKAO_REST_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      origin: at(points[0]),
      destination: at(points.at(-1)!),
      waypoints: points.slice(1, -1).map(at),
      priority: "RECOMMEND",
      summary: false,
    }),
  });
  if (!res.ok) throw new Error(`kakao directions failed: ${res.status} ${await res.text()}`);
  const route = ((await res.json()) as KakaoDirections).routes[0];
  if (!route || route.result_code !== 0 || route.sections?.length !== points.length - 1) {
    throw new Error(`kakao directions: ${route?.result_code} ${route?.result_msg}`);
  }
  return route.sections.map((section) => ({ seconds: section.duration, meters: section.distance }));
}
