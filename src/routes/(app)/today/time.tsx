import { Title } from "@solidjs/meta";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { createMemo, createSignal, For, Loading, Show } from "solid-js";
import { env } from "virtual:solid-env/client";

import { Footer, Header } from "../../../components/layout/screen";
import { SampleBadge } from "../../../components/ride/badges";
import { getTimeSlots } from "../../../lib/ride";
import { FLOW_TOTAL_STEPS, flowHref } from "../../../lib/ride-flow";
import { formatClock } from "../../../lib/time";

interface Range {
  from: number;
  to: number;
}

export default function TodayTime() {
  const nav = useNavigate();
  const [params] = useSearchParams<{ start?: string; from?: string; to?: string }>();
  const data = createMemo(() => getTimeSlots());
  const [picked, setPicked] = createSignal<Range>();

  const indexOf = (clock: string | undefined) => data().slots.findIndex((s) => s.clock === clock);
  const range = (): Range | undefined => {
    const current = picked();
    if (current) return current;
    const from = indexOf(params.from ?? data().booked.from);
    const to = indexOf(params.to ?? data().booked.to);
    return from !== -1 && to >= from ? { from, to } : undefined;
  };

  const [anchor, setAnchor] = createSignal<number>();

  function pick(i: number) {
    const start = anchor();
    if (start === undefined) {
      setAnchor(i);
      setPicked({ from: i, to: i });
      return;
    }
    setAnchor(undefined);
    setPicked({ from: Math.min(start, i), to: Math.max(start, i) });
  }

  const label = () => {
    const current = range();
    if (!current) return undefined;
    const slots = data().slots;
    return `${slots[current.from].clock}–${formatClock(slots[current.to].at + 30 * 60_000)}`;
  };

  return (
    <div class="flex flex-1 flex-col px-5">
      <Title>{`탈 시간 - ${env.VITE_APP_NAME}`}</Title>
      <Header
        title="몇 시쯤 탈까요?"
        description="한 칸이 30분이에요. 여러 칸을 고르려면 첫 칸과 마지막 칸을 눌러 주세요."
        step={{ current: 2, total: FLOW_TOTAL_STEPS }}
        onBackClick={() => nav(flowHref("/today/start", { ...params }))}
      />
      <Loading fallback={<div class="flex-1" />}>
        <ul class="mt-4 grid grid-cols-3 gap-2">
          <For each={data().slots}>
            {(slot, i) => {
              const edge = () => range()?.from === i() || range()?.to === i();
              const inside = () => {
                const current = range();
                return current !== undefined && i() > current.from && i() < current.to;
              };
              return (
                <li>
                  <button
                    type="button"
                    aria-pressed={edge() || inside() ? "true" : "false"}
                    class={[
                      "flex h-15 w-full cursor-pointer flex-col items-center justify-center rounded-xl border tabular-nums transition-colors",
                      edge()
                        ? "border-amber-8 bg-amber-3 text-amber-11 ring-2 ring-amber-5"
                        : inside()
                          ? "border-amber-3 bg-amber-3 text-amber-11"
                          : "border-sand-3 bg-sand-3",
                    ]}
                    onClick={() => pick(i())}
                  >
                    <span class="text-lg leading-6 font-bold">{slot.clock}</span>
                    <span class={["text-xs font-medium", edge() || inside() ? "text-amber-11" : "text-sand-11"]}>
                      ~{formatClock(slot.at + 30 * 60_000)}
                    </span>
                  </button>
                </li>
              );
            }}
          </For>
        </ul>
        <div class="mt-4 flex items-center justify-between gap-x-3 px-1">
          <p class="font-medium text-sand-11 tabular-nums">
            <Show when={label()} fallback="시간대를 골라 주세요.">
              {(text) => (
                <>
                  <span class="font-bold text-sand-12">{text()}</span> 사이에 타요
                </>
              )}
            </Show>
          </p>
          <SampleBadge />
        </div>
        <Footer
          type="button"
          buttonLabel="버스 보기"
          variant={range() ? "primary" : "disabled"}
          onClick={() => {
            const current = range();
            if (!current) return;
            const slots = data().slots;
            nav(
              flowHref("/today/buses", {
                start: params.start,
                from: slots[current.from].clock,
                to: slots[current.to].clock,
              }),
            );
          }}
        />
      </Loading>
    </div>
  );
}
