import { useLocation, useNavigate, useSearchParams } from "@solidjs/router";
import type { ComponentProps, JSX } from "@solidjs/web";
import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { env } from "virtual:solid-env/client";

import { Button } from "../components/common/button";
import { Input } from "../components/common/input";
import { OTPInput } from "../components/common/otp-input";
import { Select } from "../components/common/select";

function Header(props: { title: string; isInitialPage?: boolean; onBackClick?: () => void }) {
  return (
    <div class="px-1">
      <div class="mt-8 h-6.5">
        <Show when={!props.isInitialPage} fallback={<div class="font-bold text-sand-11">{env.VITE_APP_NAME}</div>}>
          <button onClick={() => props.onBackClick?.()}>
            <PhCaretLeft class="text-2xl text-sand-12" />
          </button>
        </Show>
      </div>
      <h1 class="mt-7 mb-2 text-3xl font-bold">{props.title}</h1>
    </div>
  );
}

function Footer(props: {
  type: "submit" | "button";
  onClick?: () => void;
  buttonLabel: string;
  children?: JSX.Element;
  variant?: ComponentProps<typeof Button>["variant"];
}) {
  return (
    <div class="mt-auto px-1 pb-7">
      <Button type={props.type} class="w-full" onClick={props.onClick} variant={props.variant}>
        {props.buttonLabel}
      </Button>
      {props.children}
    </div>
  );
}

const PAGES = ["welcome", "login", "join-1", "join-2", "join-3", "join-4", "complete"] as const;
type Page = (typeof PAGES)[number];

const FLOW = ["join-1", "join-2", "join-3", "join-4", "complete"] as const satisfies Page[];
type HistoryState = { from?: Page; depth?: number };

export default function Welcome() {
  const nav = useNavigate();
  const loc = useLocation<HistoryState>();
  const [searchParams, setSearchParams] = useSearchParams<{ page: string }>();

  const [unlockedStep, setUnlockedStep] = createSignal(0);
  const joined = () => unlockedStep() === FLOW.length - 1;

  const requestedPage = createMemo<Page>(() => {
    const value = searchParams.page;
    return PAGES.includes(value as Page) ? (value as Page) : "welcome";
  });

  const page = createMemo<Page>(() => {
    if (joined()) return "complete";
    const requested = requestedPage();
    const step = FLOW.indexOf(requested as (typeof FLOW)[number]);
    return step > unlockedStep() ? FLOW[unlockedStep()] : requested;
  });

  const depth = () => loc.state?.depth ?? 0;
  const pageParam = (p: Page) => (p === "welcome" ? undefined : p);

  createEffect(
    () => (page() === requestedPage() ? undefined : page()),
    (redirect) => {
      if (redirect) setSearchParams({ page: pageParam(redirect) }, { replace: true, state: { depth: depth() } });
    },
  );

  function goTo(next: Page) {
    const step = FLOW.indexOf(next as (typeof FLOW)[number]);
    if (step > unlockedStep()) setUnlockedStep(step);
    setSearchParams({ page: pageParam(next) }, { state: { from: page(), depth: depth() + 1 } });
  }

  function goBack(prev: Page) {
    if (loc.state?.from === prev) nav(-1);
    else setSearchParams({ page: pageParam(prev) }, { replace: true, state: { depth: depth() } });
  }

  function finishJoin() {
    const entries = depth();
    setUnlockedStep(FLOW.length - 1);
    if (entries > 0) nav(-entries);
  }

  const [loading, setLoading] = createSignal(false);

  const [email, setEmail] = createSignal("");
  const [code, setCode] = createSignal("");

  async function sendVerificationCode() {
    /// TODO: Send verification code to the email
    return await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  async function verifyCode() {
    /// TODO: Verify the code entered by the user
    return await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  async function completeJoin() {
    /// TODO: Complete the join process
    return await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return (
    <div class="flex flex-1 flex-col px-5">
      <Show when={page() === "welcome"}>
        <Header title="" isInitialPage />
        <div class="mt-30 flex max-w-5/6 flex-col gap-y-6 px-1">
          <h1 class="text-4xl leading-11 font-bold text-balance break-keep">막차 때문에 먼저 일어나지 않아도 돼요</h1>
          <p class="text-lg leading-7 text-balance break-keep text-sand-11">
            시험기간과 축제기간에 운행하는 성북구 대학생 전용 심야 귀가 버스예요.
          </p>
        </div>
        <Footer type="button" onClick={() => goTo("join-1")} buttonLabel="학교 이메일로 가입하기">
          <p class="mt-4 text-center text-sand-11">
            이미 계정이 있나요?{" "}
            <button
              type="button"
              onClick={() => goTo("login")}
              class="ml-0.5 cursor-pointer font-semibold text-amber-11"
            >
              로그인
            </button>
          </p>
        </Footer>
      </Show>
      <Show when={page() === "login"}>
        <Header title="로그인" onBackClick={() => goBack("welcome")} />
        <form class="flex flex-1 flex-col">
          <div class="mt-4 flex flex-col gap-y-3.5">
            <Input type="email" name="email" label="학교 이메일" placeholder="hamin@hansung.ac.kr" />
            <Input type="password" name="password" label="비밀번호" placeholder="••••••••" labelClass="mt-1.5" />
            <button class="w-full cursor-pointer pl-1 text-start font-semibold text-amber-11">
              비밀번호를 잊었어요
            </button>
          </div>
          <Footer type="submit" onClick={() => goTo("join-1")} buttonLabel="로그인" />
        </form>
      </Show>
      <Show when={page() === "join-1"}>
        <Header title="학교 이메일을 알려 주세요" onBackClick={() => goBack("welcome")} />
        <form
          class="flex flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            setLoading(true);
            sendVerificationCode().then(() => {
              goTo("join-2");
              setLoading(false);
            });
          }}
        >
          <div class="mt-4 flex flex-col gap-y-3.5">
            <div class="flex">
              <Input
                type="email"
                name="email"
                label="학교 이메일"
                placeholder="hamin"
                class="rounded-r-none"
                labelClass="relative z-20 flex-1 shrink-0 focus:z-30"
              />
              <label class="group z-10 mt-auto flex w-56 max-w-1/2 shrink-0 rounded-r-xl focus-within:z-20 focus-within:ring-2 focus-within:ring-amber-5">
                <span class="flex h-13 items-center border-y border-l border-y-sand-4 border-l-transparent bg-sand-3 pl-4 text-lg text-sand-11 group-focus-within:border-y-amber-8 group-focus-within:border-l-amber-8">
                  @
                </span>
                <Select
                  class="w-full rounded-l-none border-l-0 bg-sand-3 pl-0.5 focus:ring-0"
                  options={[
                    "korea.ac.kr",
                    "kookmin.ac.kr",
                    "dongduk.ac.kr",
                    "skuniv.ac.kr",
                    "sungshin.ac.kr",
                    "karts.ac.kr",
                    "hansung.ac.kr",
                    "dongbang.ac.kr",
                  ]}
                />
              </label>
            </div>
          </div>
          <Footer type="submit" buttonLabel="인증 코드 받기" variant={loading() ? "loading" : "primary"} />
        </form>
      </Show>
      <Show when={page() === "join-2"}>
        <Header title="메일로 받은 코드를 입력해 주세요" onBackClick={() => goBack("join-1")} />
        <form
          class="flex flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            setLoading(true);
            verifyCode().then(() => {
              goTo("join-3");
              setLoading(false);
            });
          }}
        >
          <div class="mt-4 flex flex-col gap-y-3.5">
            <span class="mb-2 px-1 text-xl font-semibold text-sand-11">hamin@korea.ac.kr</span>
            <OTPInput name="code" autofocus />
            <span class="mt-1 px-1 text-lg font-medium text-sand-11">
              <span class="tabular-nums">2:41</span> 남음 <span class="px-0.75 text-sand-10">·</span>{" "}
              <button type="button" class="text-amber-11">
                다시 보내기
              </button>
            </span>
          </div>
          <Footer type="submit" buttonLabel="확인" variant={loading() ? "loading" : "primary"} />
        </form>
      </Show>
      <Show when={page() === "join-3"}>
        <Header title="이름과 비밀번호를 정해 주세요" onBackClick={() => goBack("join-2")} />
        <form
          class="flex flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            goTo("join-4");
          }}
        >
          <div class="mt-4 flex flex-col gap-y-3.5">
            <div class="mb-4 flex items-center gap-x-1.5 px-1 text-lg text-green-11">
              <PhCheckCircle />
              <span class="leading-none font-semibold text-green-11">고려대학교 학생으로 확인됐어요</span>
            </div>
            <Input type="name" name="name" label="이름" placeholder="이하민" />
            <Input name="password" label="비밀번호" placeholder="••••••••" labelClass="mt-1.5" />
            <div class="flex items-center gap-x-3 px-1">
              <div class="flex items-center gap-x-1.5 text-green-11">
                <PhCheck class="text-sm" />
                <span>8자 이상</span>
              </div>
              <div class="flex items-center gap-x-1.5 text-red-11">
                <PhX class="text-sm" />
                <span>숫자 포함</span>
              </div>
            </div>
          </div>
          <Footer type="submit" buttonLabel="다음" variant={loading() ? "loading" : "primary"} />
        </form>
      </Show>
      <Show when={page() === "join-4"}>
        <Header title="집 주소를 알려 주세요" onBackClick={() => goBack("join-3")} />
        <form
          class="flex flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            setLoading(true);
            completeJoin().then(() => {
              finishJoin();
              setLoading(false);
            });
          }}
        >
          <div class="mt-4 flex flex-1 flex-col gap-y-3.5">
            <span class="mb-4 px-1 text-lg leading-none font-medium text-sand-11">
              집에서 가장 가까운 정류장을 찾는 데 써요.
            </span>
            <Input type="search" name="search" placeholder="정릉로 10" icon={PhMagnifyingGlass} />
            <div class="flex min-h-40 flex-1">
              <span class="m-auto text-sand-10">주소를 입력해주세요.</span>
            </div>
            <Input name="address2" label="상세 주소 (선택)" placeholder="201동 101호" labelClass="mt-1.5" />
            <div class="flex items-center gap-x-1.5 px-1 pb-8 text-sand-11">
              <PhLockSimple class="shrink-0 text-sm" />
              <span class="text-balance break-keep">
                주소는 노선을 짤 때만 사용되며, 기사님이나 다른 사용자에게는 보이지 않아요.
              </span>
            </div>
          </div>
          <Footer type="submit" buttonLabel="가입 완료" variant={loading() ? "loading" : "primary"} />
        </form>
      </Show>
      <Show when={page() === "complete"}>
        <div class="px-1">
          <PhCheckCircle class="mt-14 text-4xl text-green-11" />
          <h1 class="mt-7 mb-2 text-3xl font-bold">
            하민 님,
            <br />
            가입을 마쳤어요
          </h1>
        </div>
        <div class="mt-12 flex flex-col">
          <span class="px-1 font-bold text-sand-11">이렇게 타요</span>
          <div class="mt-4 flex flex-col gap-y-5">
            <For
              each={[
                ["탈 날을 미리 신청해요", "신청한 학생들의 집 방향으로 그날 노선이 생겨요."],
                ["당일에 탈 버스를 골라요", "출발 시간과 내릴 정류장을 정해요."],
                ["버스에서 내 QR을 찍어요", "기사님 화면에 내릴 정류장이 표시돼요."],
              ]}
            >
              {([title, description], index) => (
                <div class="flex gap-x-3.5">
                  <div class="flex aspect-square h-max w-7 shrink-0 items-center justify-center rounded-full bg-sand-3 text-sm font-semibold">
                    {index() + 1}
                  </div>
                  <div class="flex flex-col">
                    <span class="font-semibold">{title}</span>
                    <span class="text-sm text-sand-11">{description}</span>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
        <Footer type="submit" buttonLabel="가입 완료" variant={loading() ? "loading" : "primary"} />
      </Show>
    </div>
  );
}
