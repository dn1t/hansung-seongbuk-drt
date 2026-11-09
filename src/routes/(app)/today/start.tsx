import { Title } from "@solidjs/meta";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { createMemo, createSignal, For, Loading, Show } from "solid-js";
import { env } from "virtual:solid-env/client";

import { OptionCard } from "../../../components/common/option-card";
import { Footer, Header } from "../../../components/layout/screen";
import { SampleBadge } from "../../../components/ride/badges";
import { getStartPoints } from "../../../lib/ride";
import { FLOW_TOTAL_STEPS, flowHref } from "../../../lib/ride-flow";

export default function TodayStart() {
  const nav = useNavigate();
  const [params] = useSearchParams<{ start?: string; from?: string; to?: string }>();
  const data = createMemo(() => getStartPoints());
  const [picked, setPicked] = createSignal<string>();
  const selected = () => {
    const points = data().points;
    const wanted = picked() ?? params.start;
    return points.some((p) => p.id === wanted) ? wanted : points[0]?.id;
  };

  return (
    <div class="flex flex-1 flex-col px-5">
      <Title>{`출발할 곳 - ${env.VITE_APP_NAME}`}</Title>
      <Header
        title="어디서 출발해요?"
        description="고른 곳에서 가장 가까운 정류장에서 타요."
        step={{ current: 1, total: FLOW_TOTAL_STEPS }}
        onBackClick={() => nav("/")}
      />
      <Loading fallback={<div class="flex-1" />}>
        <ul class="mt-4 flex flex-col gap-y-2">
          <For each={data().points}>
            {(point) => (
              <li>
                <OptionCard selected={selected() === point.id} onClick={() => setPicked(point.id)}>
                  <span class="flex items-center gap-x-2">
                    <span class="font-semibold break-keep">{point.name}</span>
                    <Show when={point.isSample}>
                      <SampleBadge />
                    </Show>
                  </span>
                  <Show when={point.name === data().ownSchool}>
                    <span class="text-sm text-sand-11">내 학교</span>
                  </Show>
                  <Show when={point.kind === "area"}>
                    <span class="text-sm text-sand-11">학교 근처 번화가</span>
                  </Show>
                </OptionCard>
              </li>
            )}
          </For>
        </ul>
        <Footer
          type="button"
          buttonLabel="다음"
          variant={selected() ? "primary" : "disabled"}
          onClick={() => nav(flowHref("/today/time", { start: selected(), from: params.from, to: params.to }))}
        />
      </Loading>
    </div>
  );
}
