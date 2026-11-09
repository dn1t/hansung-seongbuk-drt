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
