import { query } from "@solidjs/router";
import { respond } from "@solidjs/web";

import type { ResearchFilter, ResearchPlan, ResearchPlanInput, SurveyReport, SurveyRow } from "../server/research";
import type { OperatorResult } from "./operator";
import { requireStaff } from "./staff";

export type { Count, Demand, ResearchBus, ResearchFilter, ResearchPlan, ResearchPlanInput } from "../server/research";

const FILTERS: ResearchFilter[] = ["real", "all", "demo"];
const filterOf = (value: string) => FILTERS.find((filter) => filter === value) ?? "real";

export const DEMO_DEFAULT_COUNT = 160;

export const getSurveyReport = query(async (filter: string): Promise<SurveyReport & { signupUrl: string }> => {
  "use server";
  await requireStaff();
  const [{ surveyReport }, { default: env }] = await Promise.all([
    import("../server/research"),
    import("./server-env"),
  ]);
  return { ...(await surveyReport(filterOf(filter))), signupUrl: `${env.BASE_URL}/welcome` };
}, "survey-report");

export async function getSurveyRows(filter: string): Promise<SurveyRow[]> {
  "use server";
  await requireStaff();
  const { surveyRows } = await import("../server/research");
  return surveyRows(filterOf(filter));
}

export const getResearchPlan = query(async (input: Partial<ResearchPlanInput>): Promise<ResearchPlan> => {
  "use server";
  await requireStaff();
  const { researchPlan } = await import("../server/research");
  return researchPlan(input ?? {});
}, "research-plan");

export async function makeDemoData(count: number): Promise<OperatorResult & { made?: number }> {
  "use server";
  const done = (result: OperatorResult & { made?: number }) =>
    respond(result, { revalidate: [getSurveyReport.key, getResearchPlan.key] });
  try {
    await requireStaff();
  } catch {
    return done({ ok: false, message: "운영자 코드를 다시 입력해 주세요." });
  }
  const { DEMO_MAX } = await import("../server/demo-data");
  const size = Math.round(Number(count));
  if (!Number.isFinite(size) || size < 1 || size > DEMO_MAX) {
    return done({ ok: false, message: `데모 학생은 1–${DEMO_MAX}명으로 정해 주세요.` });
  }
  try {
    const { makeDemoRespondents } = await import("../server/demo");
    const { made } = await makeDemoRespondents(size);
    return done({ ok: true, made });
  } catch (err) {
    console.error("makeDemoData:", err);
    return done({ ok: false, message: "데모 데이터를 만들지 못했어요. 다시 시도해 주세요." });
  }
}

export async function clearDemoData(): Promise<OperatorResult & { removed?: number }> {
  "use server";
  const done = (result: OperatorResult & { removed?: number }) =>
    respond(result, { revalidate: [getSurveyReport.key, getResearchPlan.key] });
  try {
    await requireStaff();
  } catch {
    return done({ ok: false, message: "운영자 코드를 다시 입력해 주세요." });
  }
  try {
    const { clearDemoRespondents } = await import("../server/demo");
    return done({ ok: true, removed: await clearDemoRespondents() });
  } catch (err) {
    console.error("clearDemoData:", err);
    return done({ ok: false, message: "데모 데이터를 지우지 못했어요. 다시 시도해 주세요." });
  }
}
