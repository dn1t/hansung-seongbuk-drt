import { Title } from "@solidjs/meta";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { createMemo, createSignal, Loading, Show } from "solid-js";
import { env } from "virtual:solid-env/client";

import { NightCalendar } from "../../../../components/booking/night-calendar";
import { Footer, Header } from "../../../../components/layout/screen";
import { getBookingOverview } from "../../../../lib/booking";
import { BOOKING_TOTAL_STEPS, parseNights } from "../../../../lib/booking-flow";
import { flowHref } from "../../../../lib/ride-flow";

export default function BookingNights() {
  const nav = useNavigate();
  const [params] = useSearchParams<{ nights?: string; slot?: string }>();
  const overview = createMemo(() => getBookingOverview());
  const [picked, setPicked] = createSignal<string[]>();
  const selected = () => {
    const open = new Set(overview().nights);
    return (picked() ?? parseNights(params.nights)).filter((night) => open.has(night));
  };

  function toggle(night: string) {
    const initial = selected();
    setPicked((previous) => {
      const current = previous ?? initial;
      return current.includes(night) ? current.filter((n) => n !== night) : [...current, night].sort();
    });
  }

  return (
    <div class="flex flex-1 flex-col px-5">
      <Title>{`날짜 고르기 - ${env.VITE_APP_NAME}`}</Title>
      <Header
        title="언제 탈까요?"
        description="여러 날을 한 번에 골라도 돼요. 이미 신청한 날을 고르면 새로 고른 시간으로 바뀌어요."
        step={{ current: 1, total: BOOKING_TOTAL_STEPS }}
        onBackClick={() => nav("/booking")}
      />
      <Loading fallback={<div class="flex-1" />}>
        <Show
          when={overview().nights.length > 0 && !overview().blocked}
          fallback={
            <>
              <p class="mt-4 px-1 font-medium text-balance break-keep">
                {overview().blocked ??
                  "지금은 신청할 수 있는 날이 없어요. 신청 기간이 열리면 학교 이메일로 알려 드려요."}
              </p>
              <Footer
                type="button"
                buttonLabel="사전 신청으로 돌아가기"
                variant="secondary"
                onClick={() => nav("/booking")}
              />
            </>
          }
        >
          <div class="mt-4">
            <NightCalendar
              open={overview().nights}
              booked={overview().bookings.map((b) => b.night)}
              selected={selected()}
              onToggle={toggle}
            />
          </div>
          <p class="mt-4 flex items-center gap-x-1.5 px-1 text-sm font-medium text-sand-11">
            <span aria-hidden="true" class="size-1 rounded-full bg-amber-9" />
            신청한 날
          </p>
          <Footer
            type="button"
            buttonLabel={selected().length > 0 ? `${selected().length}일 골랐어요` : "날짜를 골라 주세요"}
            variant={selected().length > 0 ? "primary" : "disabled"}
            onClick={() => nav(flowHref("/booking/new/time", { nights: selected().join(","), slot: params.slot }))}
          />
        </Show>
      </Loading>
    </div>
  );
}
