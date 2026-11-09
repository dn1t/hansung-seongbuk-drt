import { Title } from "@solidjs/meta";
import type { RouteDefinition } from "@solidjs/router";
import { httpStatus } from "@solidjs/web";
import { env } from "virtual:solid-env/client";

import { Header } from "../components/layout/screen";

export const route = {
  preload: () => httpStatus(404),
} satisfies RouteDefinition;

export default function NotFound() {
  return (
    <div class="flex flex-1 flex-col px-5">
      <Title>{`페이지를 찾을 수 없어요 - ${env.VITE_APP_NAME}`}</Title>
      <Header title="페이지를 찾을 수 없어요" description="주소가 바뀌었거나 없는 페이지예요." isInitialPage />
      <a href="/" class="mt-4 w-max px-1 font-semibold text-amber-11">
        처음으로 가기
      </a>
    </div>
  );
}
