import { Title } from "@solidjs/meta";
import { type RouteDefinition, useNavigate } from "@solidjs/router";
import { httpStatus } from "@solidjs/web";
import { env } from "virtual:solid-env/client";

import { Footer, Header } from "../components/layout/screen";

export const route = {
  preload: () => httpStatus(404),
} satisfies RouteDefinition;

export default function NotFound() {
  const nav = useNavigate();

  return (
    <div class="flex flex-1 flex-col px-5">
      <Title>{`페이지를 찾을 수 없어요 - ${env.VITE_APP_NAME}`}</Title>
      <Header
        title="페이지를 찾을 수 없어요"
        description="주소가 바뀌었거나 없는 페이지예요. 처음 화면에서 다시 찾아 주세요."
        isInitialPage
      />
      <Footer type="button" buttonLabel="처음으로 가기" onClick={() => nav("/", { replace: true })} />
    </div>
  );
}
