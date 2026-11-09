import { Title } from "@solidjs/meta";
import { revalidate, useNavigate, useSearchParams } from "@solidjs/router";
import { createMemo, createSignal, For, Loading, Show } from "solid-js";
import { env } from "virtual:solid-env/client";

import { OptionCard } from "../../../components/common/option-card";
import { Footer, Header } from "../../../components/layout/screen";
import { SampleBadge } from "../../../components/ride/badges";
import { busTitle } from "../../../components/ride/bus-detail";
import { chooseRide, getBusDetail, getTonight } from "../../../lib/ride";
import { FLOW_TOTAL_STEPS, flowHref } from "../../../lib/ride-flow";
import { formatClock } from "../../../lib/time";

export default function TodayDropOff() {
  const nav = useNavigate();
  const [params] = useSearchParams<{ start?: string; from?: string; to?: string; bus?: string }>();
  const data = createMemo(() => getBusDetail(params.bus ?? "", params.start ?? "", ""));
  const [picked, setPicked] = createSignal<string>();
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal("");

  const choices = () => {
    const detail = data();
    if (!detail) return [];
    const { option } = detail;
    return option.stops
      .filter((stop, i) => i > option.boardIndex && stop.walkHome !== undefined)
      .sort((a, b) => a.walkHome! - b.walkHome!);
  };
  const selected = () => picked() ?? choices()[0]?.id;
  const back = () =>
    nav(flowHref(`/today/buses/${params.bus ?? ""}`, { start: params.start, from: params.from, to: params.to }));

  async function confirm(alight: string) {
    setError("");
    setSaving(true);
    try {
      const result = await chooseRide({
        start: params.start ?? "",
        from: params.from ?? "",
        to: params.to ?? "",
        bus: params.bus ?? "",
        alight,
      });
      if (!result.ok) throw new Error(result.message);
      revalidate(getTonight.key);
      nav("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div class="flex flex-1 flex-col px-5">
      <Title>{`내릴 정류장 - ${env.VITE_APP_NAME}`}</Title>
      <Header
        title="어디서 내릴까요?"
        description="집에서 가장 가까운 정류장을 골라 뒀어요."
        step={{ current: 4, total: FLOW_TOTAL_STEPS }}
        onBackClick={back}
      />
      <Loading fallback={<div class="flex-1" />}>
        <Show when={data()}>
          {(detail) => (
            <div class="mt-4 flex items-center justify-between gap-x-3 px-1">
              <span class="text-sm font-semibold break-keep text-sand-11">{busTitle(detail().option)}</span>
              <SampleBadge />
            </div>
          )}
        </Show>
        <ul class="mt-3 flex flex-col gap-y-2">
          <For each={choices()}>
            {(stop, i) => (
              <li>
                <OptionCard selected={selected() === stop.id} onClick={() => setPicked(stop.id)}>
                  <span class="flex items-center gap-x-2">
                    <span class="font-semibold break-keep">{stop.name}</span>
                    <Show when={i() === 0}>
                      <span class="text-sm font-bold text-amber-11">가장 가까워요</span>
                    </Show>
                  </span>
                  <span class="text-sm text-sand-11 tabular-nums">
                    집까지 걸어서 {stop.walkHome}분 · {formatClock(stop.at)} 도착
                  </span>
                </OptionCard>
              </li>
            )}
          </For>
        </ul>
        <Show when={choices().length === 0}>
          <p class="mt-4 px-1 font-medium break-keep text-sand-11">
            내릴 정류장을 찾지 못했어요. 버스를 다시 골라 주세요.
          </p>
        </Show>
        <p class="mt-4 flex items-start gap-x-1.5 px-1 text-sm text-sand-11">
          <PhLockSimple aria-hidden="true" class="mt-0.75 shrink-0 text-xs" />
          <span class="text-balance break-keep">기사님에게는 내릴 정류장만 보이고, 집 주소는 보이지 않아요.</span>
        </p>
        <Show when={error()}>
          <p class="mt-3.5 px-1 font-medium break-keep text-red-11">{error()}</p>
        </Show>
        <Footer
          type="button"
          buttonLabel="이 정류장에서 내릴게요"
          variant={saving() ? "loading" : selected() ? "primary" : "disabled"}
          onClick={() => {
            const alight = selected();
            if (alight) void confirm(alight);
          }}
        />
      </Loading>
    </div>
  );
}
