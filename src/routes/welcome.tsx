import type { JSX } from "@solidjs/web";
import { createSignal, Show } from "solid-js";
import { env } from "virtual:solid-env/client";

import { Button } from "../components/common/button";
import { Input } from "../components/common/input";

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

function Footer(props: { onClick: () => void; buttonLabel: string; children?: JSX.Element }) {
  return (
    <div class="mt-auto px-1 pb-7">
      <Button class="w-full" onClick={props.onClick}>
        {props.buttonLabel}
      </Button>
      {props.children}
    </div>
  );
}

export default function Welcome() {
  const [page, setPage] = createSignal<"welcome" | "login" | "join">("login");

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
        <Footer onClick={() => setPage("join")} buttonLabel="학교 이메일로 가입하기">
          <p class="mt-4 text-center text-sand-11">
            이미 계정이 있나요?{" "}
            <button onClick={() => setPage("login")} class="ml-0.5 cursor-pointer font-semibold text-amber-11">
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
          <Footer onClick={() => setPage("join")} buttonLabel="로그인" />
        </form>
      </Show>
    </div>
  );
}
