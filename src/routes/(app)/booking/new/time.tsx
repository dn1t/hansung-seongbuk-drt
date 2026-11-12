import { Title } from "@solidjs/meta";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { createMemo, createSignal, Loading, Show } from "solid-js";
import { env } from "virtual:solid-env/client";

import { SlotGrid } from "../../../../components/booking/slot-grid";
import { Footer, Header } from "../../../../components/layout/screen";
import { getBookingOverview, getSlotRoutes } from "../../../../lib/booking";
import { BOOKING_TOTAL_STEPS, nightsSummary, parseNights } from "../../../../lib/booking-flow";
import { flowHref } from "../../../../lib/ride-flow";
import { formatNight } from "../../../../lib/time";

export default function BookingTime() {
  const nav = useNavigate();
  const [params] = useSearchParams<{ nights?: string; slot?: string }>();
  const overview = createMemo(() => getBookingOverview());
  const [picked, setPicked] = createSignal<string>();
  const nights = () => parseNights(params.nights);
  const routes = createMemo(() => getSlotRoutes(nights()));
  const counts = createMemo(() => {
    const out: Record<string, number> = {};
    for (const night of nights()) {
      for (const [slot, count] of Object.entries(routes()[night] ?? {})) out[slot] = Math.max(out[slot] ?? 0, count);
    }
    return out;
  });
  const closed = createMemo(() =>
    overview().slots.filter((slot) =>
      nights().some((night) => overview().openSlots[night] && !overview().openSlots[night].includes(slot)),
    ),
  );
  const selected = () => {
    const slot = picked() ?? params.slot;
    return slot && overview().slots.includes(slot) && !closed().includes(slot) ? slot : undefined;
  };

  return (
    <div class="flex flex-1 flex-col px-5">
      <Title>{`시간 고르기 - ${env.VITE_APP_NAME}`}</Title>
      <Header
        title="몇 시쯤 탈까요?"
        description="고른 날 모두 같은 시간으로 신청돼요."
        step={{ current: 2, total: BOOKING_TOTAL_STEPS }}
        onBackClick={() => nav(flowHref("/booking/new", { nights: params.nights, slot: params.slot }))}
      />
      <Loading fallback={<div class="flex-1" />}>
        <div class="mt-4 flex items-center justify-between gap-x-3 px-1">
          <span class="text-sm font-semibold text-sand-11 tabular-nums">{nightsSummary(nights(), formatNight)} 밤</span>
        </div>
        <div class="mt-3">
          <SlotGrid
            slots={overview().slots}
            selected={selected()}
            onSelect={setPicked}
            closed={closed()}
            routes={counts()}
          />
        </div>
        <p class="mt-3 px-1 text-sm font-medium break-keep text-sand-11">
          숫자는 지금까지의 신청으로 생긴 노선 수예요{nights().length > 1 ? "(고른 날 중 가장 많은 날 기준)" : ""}.
          노선이 없는 시간도 고를 수 있어요. 신청한 학생이 모이면 그 시간에 노선이 생겨요.
          <Show when={closed().length > 0}> 탑승 1시간 전이 지난 시간은 고를 수 없어요.</Show>
        </p>
        <Footer
          type="button"
          buttonLabel="다음"
          variant={selected() && nights().length > 0 ? "primary" : "disabled"}
          onClick={() => nav(flowHref("/booking/new/address", { nights: params.nights, slot: selected() }))}
        />
      </Loading>
    </div>
  );
}
