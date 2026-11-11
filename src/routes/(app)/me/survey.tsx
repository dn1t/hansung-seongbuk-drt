import { Title } from "@solidjs/meta";
import { useNavigate } from "@solidjs/router";
import { createMemo, Errored, Loading } from "solid-js";
import { env } from "virtual:solid-env/client";

import { Header } from "../../../components/layout/screen";
import { SurveyForm } from "../../../components/survey/survey-form";
import { getSurveyForm, saveSurvey } from "../../../lib/survey";
import type { SurveyAnswers } from "../../../lib/survey-options";

export default function EditSurvey() {
  const nav = useNavigate();
  const form = createMemo(() => getSurveyForm());

  async function save(answers: SurveyAnswers) {
    const result = await saveSurvey(answers);
    if (!result.ok) throw new Error(result.message);
    nav("/me?saved=survey", { replace: true });
  }

  return (
    <div class="flex flex-1 flex-col px-5">
      <Title>{`이용 계획 - ${env.VITE_APP_NAME}`}</Title>
      <Header
        title="이용 계획을 바꿔요"
        description="운행할 날과 시간, 노선을 정하는 데 써요."
        onBackClick={() => nav("/me")}
      />
      <Errored
        fallback={(_, reset) => (
          <div class="mt-6 px-1">
            <p class="font-semibold">이용 계획을 불러오지 못했어요.</p>
            <button type="button" class="mt-2 cursor-pointer font-semibold text-amber-11" onClick={reset}>
              다시 불러오기
            </button>
          </div>
        )}
      >
        <Loading fallback={<div class="flex-1" />}>
          <SurveyForm form={form()} buttonLabel="저장" onSave={save} />
        </Loading>
      </Errored>
    </div>
  );
}
