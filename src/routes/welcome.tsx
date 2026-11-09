import type { ComponentProps, JSX } from "@solidjs/web";
import { createSignal, Show } from "solid-js";
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

export default function Welcome() {
  const [page, setPage] = createSignal<"welcome" | "login" | "join-1" | "join-2">("join-2");
  const [loading, setLoading] = createSignal(false);

  const [email, setEmail] = createSignal("");

  async function sendVerificationCode() {
    /// TODO: Send verification code to the email
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
        <Footer type="button" onClick={() => setPage("join-1")} buttonLabel="학교 이메일로 가입하기">
          <p class="mt-4 text-center text-sand-11">
            이미 계정이 있나요?{" "}
            <button
              type="button"
              onClick={() => setPage("login")}
              class="ml-0.5 cursor-pointer font-semibold text-amber-11"
            >
              로그인
            </button>
          </p>
        </Footer>
      </Show>
      <Show when={page() === "login"}>
        <Header title="로그인" onBackClick={() => setPage("welcome")} />
        <form class="flex flex-1 flex-col">
          <div class="mt-4 flex flex-col gap-y-3.5">
            <Input type="email" name="email" label="학교 이메일" placeholder="hamin@hansung.ac.kr" />
            <Input type="password" name="password" label="비밀번호" placeholder="••••••••" labelClass="mt-1.5" />
            <button class="w-full cursor-pointer pl-1 text-start font-semibold text-amber-11">
              비밀번호를 잊었어요
            </button>
          </div>
          <Footer type="submit" onClick={() => setPage("join-1")} buttonLabel="로그인" />
        </form>
      </Show>
      <Show when={page() === "join-1"}>
        <Header title="학교 이메일을 알려 주세요" onBackClick={() => setPage("welcome")} />
        <form
          class="flex flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            setLoading(true);
            sendVerificationCode().then(() => {
              setPage("join-2");
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
        <Header title="메일로 받은 코드를 입력해 주세요" onBackClick={() => setPage("join-1")} />
        <form
          class="flex flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            setLoading(true);
            sendVerificationCode().then(() => {
              setPage("join-2");
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
    </div>
  );
}
