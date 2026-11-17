import { query } from "@solidjs/router";
import { getRequestEvent, respond } from "@solidjs/web";
import { eq } from "drizzle-orm";

import { surveys } from "./app-schema";
import { auth } from "./auth";
import { db } from "./db";
import { schoolOf } from "./schools";
import {
  SURVEY_COMMENT_MAX,
  SURVEY_FARES,
  SURVEY_FREQUENCIES,
  SURVEY_WAYS,
  type SurveyAnswers,
} from "./survey-options";

export interface SurveyForm {
  school: string | undefined;
  slots: string[];
  starts: { id: string; name: string }[];
  answers: SurveyAnswers | null;
}

export type SaveSurveyResult = { ok: true } | { ok: false; message: string };

async function sessionUser() {
  const headers = getRequestEvent()?.request.headers;
  const session = headers ? await auth.api.getSession({ headers }) : null;
  return session?.user ?? null;
}

export async function surveyChoices(school: string | undefined) {
  const [{ startPlaces, startOfSchool }, { serviceSlots }] = await Promise.all([
    import("../server/places"),
    import("../server/service"),
  ]);
  const own = startOfSchool(school);
  const places = await startPlaces();
  const starts = [
    ...(own ? [own] : []),
    ...places.filter((place) => place.kind === "area"),
    ...places.filter((place) => place.kind === "school" && place.id !== own?.id),
  ].map(({ id, name }) => ({ id, name }));
  return { slots: await serviceSlots(), starts };
}

export const getSurveyForm = query(async (): Promise<SurveyForm> => {
  "use server";
  const user = await sessionUser();
  if (!user) throw new Error("로그인이 필요해요. 다시 로그인해 주세요.");
  const [{ slots, starts }, [row]] = await Promise.all([
    surveyChoices(schoolOf(user.email)),
    db.select().from(surveys).where(eq(surveys.userId, user.id)).limit(1),
  ]);
  return {
    school: schoolOf(user.email),
    slots,
    starts,
    answers: row
      ? {
          frequency: row.frequency,
          slots: row.slots,
          startId: row.startId,
          ways: row.ways,
          fare: row.fare,
          comment: row.comment ?? "",
        }
      : null,
  };
}, "survey-form");

export async function saveSurvey(input: SurveyAnswers): Promise<SaveSurveyResult> {
  "use server";
  const done = (result: SaveSurveyResult) => respond(result, { revalidate: [getSurveyForm.key] });
  const user = await sessionUser();
  if (!user) return done({ ok: false, message: "인증이 만료됐어요. 다시 로그인해 주세요." });

  const checked = checkAnswers(input, await surveyChoices(schoolOf(user.email)));
  if (!checked.ok) return done(checked);

  try {
    const values = checked.values;
    await db
      .insert(surveys)
      .values({ userId: user.id, ...values })
      .onConflictDoUpdate({ target: surveys.userId, set: { ...values, updatedAt: new Date() } });
    return done({ ok: true });
  } catch (err) {
    console.error("saveSurvey:", err);
    return done({ ok: false, message: "저장하지 못했어요. 다시 시도해 주세요." });
  }
}

export function checkAnswers(
  input: SurveyAnswers | undefined,
  choices: { slots: string[]; starts: { id: string }[] },
): { ok: true; values: Omit<SurveyAnswers, "comment"> & { comment: string | null } } | { ok: false; message: string } {
  const picked = (value: unknown) => (Array.isArray(value) ? value : []);
  const answers = {
    frequency: SURVEY_FREQUENCIES.find((value) => value === input?.frequency),
    slots: choices.slots.filter((slot) => picked(input?.slots).includes(slot)),
    startId: choices.starts.find((start) => start.id === input?.startId)?.id,
    ways: SURVEY_WAYS.filter((way) => picked(input?.ways).includes(way)),
    fare: SURVEY_FARES.find((value) => value === input?.fare),
  };
  if (
    !answers.frequency ||
    answers.slots.length === 0 ||
    !answers.startId ||
    answers.ways.length === 0 ||
    !answers.fare
  ) {
    return { ok: false, message: "답하지 않은 질문이 있어요. 모두 골라 주세요." };
  }
  const comment = String(input?.comment ?? "").trim();
  if (comment.length > SURVEY_COMMENT_MAX) {
    return { ok: false, message: `하고 싶은 말은 ${SURVEY_COMMENT_MAX}자까지 쓸 수 있어요.` };
  }
  return {
    ok: true,
    values: {
      frequency: answers.frequency,
      slots: answers.slots,
      startId: answers.startId,
      ways: answers.ways,
      fare: answers.fare,
      comment: comment || null,
    },
  };
}
