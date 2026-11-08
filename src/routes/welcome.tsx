import type { JSX } from "@solidjs/web";
import { Show } from "solid-js";
import { env } from "virtual:solid-env/client";

import { Button } from "../components/common/button";

function Header(props: { title: string; isInitialPage?: boolean }) {
  return (
    <div>
      <div class="mt-8 h-6.5">
        <Show when={!props.isInitialPage} fallback={<div class="font-bold text-sand-11">{env.VITE_APP_NAME}</div>}>
          <PhCaretLeft class="text-2xl text-sand-12" />
        </Show>
      </div>
      <h1 class="mt-7 mb-2 text-3xl font-bold">{props.title}</h1>
    </div>
  );
}

function Footer(props: { buttonLabel: string; children?: JSX.Element }) {
  return (
    <div class="mt-auto pb-7">
      <Button class="w-full">{props.buttonLabel}</Button>
      {props.children}
    </div>
  );
}

export default function Welcome() {
  return (
    <div class="flex flex-1 flex-col px-6">
      <Header title="" isInitialPage />
      <div class="mt-30 flex max-w-5/6 flex-col gap-y-6">
        <h1 class="text-4xl leading-11 font-bold text-balance break-keep">막차 때문에 먼저 일어나지 않아도 돼요</h1>
        <p class="text-lg leading-7 text-balance break-keep text-sand-11">
          시험기간과 축제기간에 운행하는 성북구 대학생 전용 심야 귀가 버스예요.
        </p>
      </div>
      <Footer buttonLabel="학교 이메일로 가입하기">
        <p class="mt-4 text-center text-sand-11">
          이미 계정이 있나요?{" "}
          <a href="#" class="ml-0.5 font-semibold text-amber-11">
            로그인
          </a>
        </p>
      </Footer>
    </div>
  );
}
