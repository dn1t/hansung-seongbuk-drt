import { Title } from "@solidjs/meta";
import { useNavigate } from "@solidjs/router";
import { createMemo, createSignal, For, Loading, Match, onSettled, Show, Switch } from "solid-js";
import { env } from "virtual:solid-env/client";

import { AddressPrivacyNote, AddressSearch } from "../components/common/address-search";
import { Button } from "../components/common/button";
import { OptionCard } from "../components/common/option-card";
import { Sheet } from "../components/common/sheet";
import { Footer, Header, RouteDots, SectionRule } from "../components/layout/screen";
import { SurveyForm } from "../components/survey/survey-form";
import type { AddressResult } from "../lib/address";
import { getGuestChoices, searchGuestAddress, submitGuestSurvey } from "../lib/guest-survey";
import { SCHOOLS } from "../lib/schools";
import type { SurveyAnswers } from "../lib/survey-options";

type Step = "intro" | "school" | "address" | "answers" | "done";

const STEPS = 3;
const SENT_KEY = "drt-guest-survey-sent";
const SCHOOL_NAMES = Object.values(SCHOOLS);

const PURPOSE: [string, string][] = [
  ["언제, 어디서 집에 가는지 알려 주세요", "운행할 날과 시간대, 버스 대수를 정하는 데 써요."],
  ["집 주소로 노선 방향을 정해요", "주소는 정류장과 노선을 짤 때만 쓰고, 누구인지 알 수 없게 묶어서 봐요."],
  ["가입하지 않아도 돼요", "학교와 집 주소, 질문 다섯 개에 답하면 끝나요."],
];

const CONSENT_ITEMS: [string, string][] = [
  ["모으는 정보", "학교, 집 주소와 그 위치, 이용 계획 답변. 이름과 이메일은 받지 않아요."],
  ["쓰는 곳", "운행할 날과 시간, 노선과 정류장 정하기. 조사 결과는 누구인지 알 수 없게 묶은 숫자로만 써요."],
  ["보관 기간", "조사가 끝나면 지워요."],
  ["동의하지 않으면", "동의하지 않을 수 있지만, 그러면 답을 보낼 수 없어요."],
];

function rememberSent(sent: boolean) {
  try {
    if (sent) localStorage.setItem(SENT_KEY, "1");
    else localStorage.removeItem(SENT_KEY);
  } catch {
    return;
  }
}

function wasSent() {
  try {
    return localStorage.getItem(SENT_KEY) === "1";
  } catch {
    return false;
  }
}

export default function GuestSurvey() {
  const nav = useNavigate();
  const [step, setStep] = createSignal<Step>("intro");
  const [school, setSchool] = createSignal<string>();
  const [agreed, setAgreed] = createSignal(false);
  const [consentOpen, setConsentOpen] = createSignal(false);
  const [address, setAddress] = createSignal<AddressResult>();

  onSettled(() => {
    if (wasSent()) setStep("done");
  });

  async function send(answers: SurveyAnswers) {
    const chosen = school();
    const place = address();
    if (!chosen || !place) throw new Error("학교와 집 주소를 먼저 골라 주세요.");
    const result = await submitGuestSurvey({ school: chosen, address: place.address, consent: agreed(), answers });
    if (!result.ok) throw new Error(result.message);
    rememberSent(true);
    setStep("done");
  }

  function again() {
    rememberSent(false);
    setSchool(undefined);
    setAgreed(false);
    setAddress(undefined);
    setStep("school");
  }

  return (
    <div class={["flex flex-col px-5", step() === "address" ? "h-dvh" : "flex-1"]}>
      <Title>{`이용 계획 조사 - ${env.VITE_APP_NAME}`}</Title>
      <Switch>
        <Match when={step() === "intro"}>
          <Header
            title=""
            isInitialPage
            aside={
              <a href="/guide" class="-my-2 flex items-center gap-x-0.5 py-2 text-sm font-semibold text-sand-12">
                이용 설명서
                <PhCaretRightBold aria-hidden="true" class="text-xs text-sand-11" />
              </a>
            }
          />
          <div class="mt-10 px-1">
            <RouteDots current={1} total={4} spacing="wide" />
            <h1 class="mt-7 text-3xl font-bold text-balance break-keep">
              막차 뒤에도 집에 갈 수 있게,
              <br />
              이용 계획을 알려 주세요
            </h1>
            <p class="mt-3 text-lg leading-7 font-medium text-balance break-keep text-sand-11">
              {env.VITE_APP_NAME}는 시험기간과 축제기간에 성북구 대학생을 집 근처까지 태워 주는 심야 귀가 버스예요. 미리
              신청한 학생들의 집 방향으로 그날 노선이 만들어져요.
            </p>
          </div>
          <section class="mt-10 flex flex-col">
            <SectionRule title="이 설문은" />
            <ol class="mt-5 flex flex-col gap-y-5">
              <For each={PURPOSE}>
                {([title, description], index) => (
                  <li class="relative flex gap-x-3.5">
                    <Show when={index() < PURPOSE.length - 1}>
                      <span
                        aria-hidden="true"
                        class="absolute top-8 -bottom-4 left-3.25 w-0.5 rounded-full bg-sand-6"
                      />
                    </Show>
                    <div class="flex aspect-square h-max w-7 shrink-0 items-center justify-center rounded-full bg-sand-3 text-sm font-semibold tabular-nums">
                      {index() + 1}
                    </div>
                    <div class="flex flex-col">
                      <span class="font-semibold break-keep">{title}</span>
                      <span class="text-sm break-keep text-sand-11">{description}</span>
                    </div>
                  </li>
                )}
              </For>
            </ol>
            <a href="/guide" class="mt-6 ml-10.5 flex w-max items-center gap-x-0.5 text-sm font-semibold text-sand-12">
              이용 설명서에서 자세히 보기
              <PhCaretRightBold aria-hidden="true" class="text-xs text-sand-11" />
            </a>
          </section>
          <Footer type="button" buttonLabel="설문 시작하기" onClick={() => setStep("school")} />
        </Match>
        <Match when={step() === "school"}>
          <Header
            title="어느 학교에 다니나요?"
            description="가입하지 않고 이용 계획만 알려 줘도 운행할 시간과 노선을 정하는 데 큰 도움이 돼요."
            step={{ current: 1, total: STEPS }}
            onBackClick={() => setStep("intro")}
          />
          <ul class="mt-4 flex flex-col gap-y-2">
            <For each={SCHOOL_NAMES}>
              {(name) => (
                <li>
                  <OptionCard selected={school() === name} onClick={() => setSchool(name)}>
                    <span class="font-semibold">{name}</span>
                  </OptionCard>
                </li>
              )}
            </For>
          </ul>
          <div class="mt-5 flex items-center gap-x-3 px-1">
            <label class="flex min-w-0 flex-1 cursor-pointer items-center gap-x-2.5 font-medium break-keep">
              <input
                type="checkbox"
                checked={agreed()}
                class="size-4.5 shrink-0 cursor-pointer accent-amber-9"
                onChange={(e) => setAgreed(e.currentTarget.checked)}
              />
              개인정보 수집과 이용에 동의해요
            </label>
            <button
              type="button"
              class="shrink-0 cursor-pointer text-sm font-semibold text-sand-11 underline underline-offset-4"
              onClick={() => setConsentOpen(true)}
            >
              자세히
            </button>
          </div>
          <Footer
            type="button"
            buttonLabel="다음"
            variant={school() && agreed() ? "primary" : "disabled"}
            onClick={() => school() && agreed() && setStep("address")}
          />
        </Match>
        <Match when={step() === "address"}>
          <Header
            title="집 주소를 알려 주세요"
            description="집에서 가까운 정류장과 노선 방향을 정하는 데 써요."
            step={{ current: 2, total: STEPS }}
            onBackClick={() => setStep("school")}
          />
          <div class="mt-4 flex min-h-0 flex-1 flex-col gap-y-3.5">
            <AddressSearch selected={address()} onSelect={setAddress} search={searchGuestAddress} />
            <AddressPrivacyNote class="pb-8" />
          </div>
          <Footer
            type="button"
            buttonLabel="다음"
            variant={address() ? "primary" : "disabled"}
            onClick={() => address() && setStep("answers")}
          />
        </Match>
        <Match when={step() === "answers"}>
          <Header
            title="이용 계획을 알려 주세요"
            description="시험기간과 축제기간에 막차가 끊긴 뒤 어떻게 집에 가는지 알려 주세요."
            step={{ current: 3, total: STEPS }}
            onBackClick={() => setStep("address")}
          />
          <Loading fallback={<div class="flex-1" />}>
            <Answers school={school() ?? ""} onSave={send} />
          </Loading>
        </Match>
        <Match when={step() === "done"}>
          <Header title="" isInitialPage />
          <div class="mt-16 px-1">
            <RouteDots current={4} total={4} spacing="wide" />
            <h1 class="mt-7 text-3xl font-bold text-balance break-keep">알려 줘서 고마워요</h1>
            <p class="mt-3 text-lg leading-7 font-medium text-balance break-keep text-sand-11">
              답은 운행할 날과 시간, 노선을 정하는 데 써요. 가입하면 운행일에 탈 시간을 미리 신청할 수 있어요.
            </p>
          </div>
          <Footer type="button" buttonLabel="학교 이메일로 가입하기" onClick={() => nav("/welcome")}>
            <p class="mt-4 text-center">
              <button type="button" class="cursor-pointer font-semibold text-sand-11" onClick={again}>
                한 번 더 답하기
              </button>
            </p>
          </Footer>
        </Match>
      </Switch>
      <Sheet
        open={consentOpen()}
        title="개인정보 수집과 이용"
        description="이용 계획 조사에 필요한 만큼만 모아요."
        onClose={() => setConsentOpen(false)}
      >
        <dl class="flex flex-col gap-y-3 px-1">
          <For each={CONSENT_ITEMS}>
            {([term, detail]) => (
              <div>
                <dt class="text-sm font-semibold text-sand-11">{term}</dt>
                <dd class="mt-0.5 font-medium break-keep">{detail}</dd>
              </div>
            )}
          </For>
        </dl>
        <Button
          type="button"
          class="mt-6"
          onClick={() => {
            setAgreed(true);
            setConsentOpen(false);
          }}
        >
          동의해요
        </Button>
      </Sheet>
    </div>
  );
}

function Answers(props: { school: string; onSave: (answers: SurveyAnswers) => Promise<void> }) {
  const choices = createMemo(() => getGuestChoices(props.school));
  return (
    <Show when={choices()}>
      {(current) => (
        <SurveyForm
          form={{ school: props.school, slots: current().slots, starts: current().starts, answers: null }}
          buttonLabel="보내기"
          onSave={props.onSave}
        />
      )}
    </Show>
  );
}
