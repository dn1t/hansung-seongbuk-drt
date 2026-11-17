import { query } from "@solidjs/router";
import { getRequestEvent } from "@solidjs/web";
import { GET } from "@solidjs/web/server-functions";
import { and, count, eq, gt } from "drizzle-orm";

import { searchKakaoAddress, searchKakaoKeyword } from "../server/kakao";
import type { AddressResult } from "./address";
import { guestSurveys } from "./app-schema";
import { db } from "./db";
import { SCHOOLS } from "./schools";
import env from "./server-env";
import { checkAnswers, surveyChoices } from "./survey";
import type { SurveyAnswers } from "./survey-options";

export type GuestSurveyResult = { ok: true } | { ok: false; message: string };

const HOUR = 60 * 60_000;
const ANSWERS_PER_HOUR = 5;
const SEARCHES_PER_MINUTE = 30;
const searches = new Map<string, number[]>();

function clientAddress() {
  const headers = getRequestEvent()?.request.headers;
  const forwarded = headers?.get("x-forwarded-for")?.split(",")[0]?.trim();
  return headers?.get("cf-connecting-ip") || forwarded || headers?.get("x-real-ip") || "local";
}

async function sourceKey() {
  const bytes = new TextEncoder().encode(`${env.AUTH_SECRET}:${clientAddress()}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function isSchool(name: unknown): name is (typeof SCHOOLS)[keyof typeof SCHOOLS] {
  return (Object.values(SCHOOLS) as unknown[]).includes(name);
}

export const getGuestChoices = query(async (school: string) => {
  "use server";
  return surveyChoices(isSchool(school) ? school : undefined);
}, "guest-survey-choices");

export const searchGuestAddress = GET(async (text: string): Promise<AddressResult[]> => {
  "use server";
  const term = String(text ?? "")
    .trim()
    .slice(0, 100);
  if (term.length < 2) return [];
  const key = await sourceKey();
  const now = Date.now();
  const recent = (searches.get(key) ?? []).filter((at) => now - at < 60_000);
  if (recent.length >= SEARCHES_PER_MINUTE) throw new Error("검색이 너무 많아요. 잠시 후 다시 시도해 주세요.");
  searches.set(key, [...recent, now]);
  const results = await searchKakaoAddress(term);
  return results.length > 0 ? results : searchKakaoKeyword(term);
});

export async function submitGuestSurvey(input: {
  school: string;
  address: string;
  consent: boolean;
  answers: SurveyAnswers;
}): Promise<GuestSurveyResult> {
  "use server";
  if (input?.consent !== true) return { ok: false, message: "개인정보 수집과 이용에 동의해 주세요." };
  if (!isSchool(input.school)) return { ok: false, message: "학교를 골라 주세요." };

  const checked = checkAnswers(input.answers, await surveyChoices(input.school));
  if (!checked.ok) return checked;

  const address = String(input.address ?? "").trim();
  const results = address ? await searchKakaoAddress(address) : [];
  const place = results.find((result) => result.address === address) ?? results[0];
  if (!place) return { ok: false, message: "주소를 찾지 못했어요. 다시 검색해서 골라 주세요." };

  const key = await sourceKey();
  const [recent] = await db
    .select({ total: count() })
    .from(guestSurveys)
    .where(and(eq(guestSurveys.sourceKey, key), gt(guestSurveys.createdAt, new Date(Date.now() - HOUR))));
  if ((recent?.total ?? 0) >= ANSWERS_PER_HOUR) {
    return { ok: false, message: "같은 곳에서 답변이 너무 많이 들어왔어요. 잠시 후 다시 시도해 주세요." };
  }

  try {
    await db.insert(guestSurveys).values({
      school: input.school,
      homeAddress: place.address,
      homeLat: place.lat,
      homeLng: place.lng,
      sourceKey: key,
      ...checked.values,
    });
    return { ok: true };
  } catch (err) {
    console.error("submitGuestSurvey:", err);
    return { ok: false, message: "보내지 못했어요. 다시 시도해 주세요." };
  }
}
