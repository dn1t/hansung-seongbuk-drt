import { Title } from "@solidjs/meta";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { createMemo, createSignal, Loading } from "solid-js";
import { env } from "virtual:solid-env/client";

import { SlotGrid } from "../../../../components/booking/slot-grid";
import { Footer, Header } from "../../../../components/layout/screen";
import { SampleBadge } from "../../../../components/ride/badges";
import { getBookingOverview } from "../../../../lib/booking";
import { BOOKING_TOTAL_STEPS, nightsSummary, parseNights } from "../../../../lib/booking-flow";
import { flowHref } from "../../../../lib/ride-flow";
import { formatNight } from "../../../../lib/time";

export default function BookingTime() {
  const nav = useNavigate();
  const [params] = useSearchParams<{ nights?: string; slot?: string }>();
  const overview = createMemo(() => getBookingOverview());
  const [picked, setPicked] = createSignal<string>();
  const nights = () => parseNights(params.nights);
  const selected = () => {
    const slot = picked() ?? params.slot;
    return slot && overview().slots.includes(slot) ? slot : undefined;
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
          <SampleBadge />
        </div>
        <div class="mt-3">
          <SlotGrid slots={overview().slots} selected={selected()} onSelect={setPicked} />
        </div>
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
