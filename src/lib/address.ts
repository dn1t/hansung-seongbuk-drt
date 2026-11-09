import { getRequestEvent, respond } from "@solidjs/web";
import { GET } from "@solidjs/web/server-functions";

import { searchKakaoAddress, searchKakaoKeyword } from "../server/kakao";
import { auth } from "./auth";

export interface AddressResult {
  id: string;
  address: string;
  title: string;
  subtitle?: string;
  lat: number;
  lng: number;
}

export const ADDRESS_DETAIL_MAX_LENGTH = 100;

export type SaveAddressResult = { ok: true } | { ok: false; message: string };

async function currentSession() {
  const headers = getRequestEvent()?.request.headers;
  return headers ? auth.api.getSession({ headers }) : null;
}

export const searchAddress = GET(async (query: string): Promise<AddressResult[]> => {
  "use server";
  query = query.trim().slice(0, 100);
  if (query.length < 2) return [];
  if (!(await currentSession())) throw new Error("인증이 만료됐어요. 처음부터 다시 진행해 주세요.");

  const results = await searchKakaoAddress(query);
  return results.length > 0 ? results : searchKakaoKeyword(query);
});

export async function saveHomeAddress(address: string, detail: string): Promise<SaveAddressResult> {
  "use server";
  const done = (result: SaveAddressResult) => respond(result, { revalidate: "" });
  const session = await currentSession();
  if (!session) return done({ ok: false, message: "인증이 만료됐어요. 처음부터 다시 진행해 주세요." });

  address = address.trim();
  detail = detail.trim();
  if (!address) return done({ ok: false, message: "주소를 검색해서 골라 주세요." });
  if (detail.length > ADDRESS_DETAIL_MAX_LENGTH) {
    return done({ ok: false, message: `상세 주소는 ${ADDRESS_DETAIL_MAX_LENGTH}자까지 쓸 수 있어요.` });
  }

  try {
    const results = await searchKakaoAddress(address);
    const match = results.find((r) => r.address === address) ?? results[0];
    if (!match) return done({ ok: false, message: "주소를 찾지 못했어요. 다시 검색해서 골라 주세요." });

    const ctx = await auth.$context;
    await ctx.internalAdapter.updateUser(session.user.id, {
      homeAddress: match.address,
      homeAddressDetail: detail || null,
      homeLat: match.lat,
      homeLng: match.lng,
    });
    return done({ ok: true });
  } catch (err) {
    console.error("saveHomeAddress:", err);
    return done({ ok: false, message: "주소를 저장하지 못했어요. 다시 시도해 주세요." });
  }
}
