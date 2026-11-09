import { Title } from "@solidjs/meta";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { createMemo, Loading, Show } from "solid-js";
import { env } from "virtual:solid-env/client";

import { Header } from "../../../components/layout/screen";
import { BusDetail, busTitle } from "../../../components/ride/bus-detail";
import { getBusDetail } from "../../../lib/ride";

export default function TodayRoute() {
  const nav = useNavigate();
  const [params] = useSearchParams<{ bus?: string; start?: string; alight?: string }>();
  const data = createMemo(() => getBusDetail(params.bus ?? "", params.start ?? "", params.alight ?? ""));

  return (
    <div class="flex flex-1 flex-col px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
      <Loading fallback={<div class="flex-1" />}>
        <Show
          when={data()}
          fallback={
            <Header
              title="노선을 찾지 못했어요"
              description="오늘 귀가에서 다시 열어 주세요."
              onBackClick={() => nav("/")}
            />
          }
        >
          {(detail) => (
            <>
              <Title>{`${busTitle(detail().option)} - ${env.VITE_APP_NAME}`}</Title>
              <Header title={busTitle(detail().option)} onBackClick={() => nav("/")} />
              <BusDetail option={detail().option} now={detail().now} />
            </>
          )}
        </Show>
      </Loading>
    </div>
  );
}
