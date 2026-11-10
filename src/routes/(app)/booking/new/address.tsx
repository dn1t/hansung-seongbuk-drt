import { Title } from "@solidjs/meta";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { createMemo, createSignal, Loading, Show } from "solid-js";
import { env } from "virtual:solid-env/client";

import { AddressPrivacyNote, AddressSearch } from "../../../../components/common/address-search";
import { OptionCard } from "../../../../components/common/option-card";
import { Footer, Header } from "../../../../components/layout/screen";
import type { AddressResult } from "../../../../lib/address";
import { createBookings, getBookingOverview } from "../../../../lib/booking";
import { BOOKING_TOTAL_STEPS, nightsSummary, parseNights } from "../../../../lib/booking-flow";
import { flowHref } from "../../../../lib/ride-flow";
import { formatNight, slotRange } from "../../../../lib/time";

export default function BookingAddress() {
  const nav = useNavigate();
  const [params] = useSearchParams<{ nights?: string; slot?: string }>();
  const overview = createMemo(() => getBookingOverview());
  const [useOther, setUseOther] = createSignal(false);
  const [other, setOther] = createSignal<AddressResult>();
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal("");
  const nights = () => parseNights(params.nights);
  const otherMode = () => useOther() || !overview().home;
  const ready = () => nights().length > 0 && Boolean(params.slot) && (!otherMode() || other() !== undefined);

  async function submit(detail: string) {
    setError("");
    setSaving(true);
    try {
      const picked = other();
      const result = await createBookings({
        nights: nights(),
        slot: params.slot ?? "",
        address: otherMode() && picked ? { address: picked.address, detail } : null,
      });
      if (!result.ok) throw new Error(result.message);
      nav(`/booking?saved=booked&count=${result.count}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "신청하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div class={["flex flex-col px-5", otherMode() ? "h-dvh" : "flex-1"]}>
      <Title>{`주소 확인 - ${env.VITE_APP_NAME}`}</Title>
      <Header
        title="어디로 갈까요?"
        description="집으로 가면 그대로 신청하면 돼요."
        step={{ current: 3, total: BOOKING_TOTAL_STEPS }}
        onBackClick={() => nav(flowHref("/booking/new/time", { nights: params.nights, slot: params.slot }))}
      />
      <Loading fallback={<div class="flex-1" />}>
        <form
          class="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(String(new FormData(e.currentTarget).get("address2") ?? ""));
          }}
        >
          <p class="mt-4 px-1 text-sm font-semibold text-sand-11 tabular-nums">
            {nightsSummary(nights(), formatNight)} 밤 · {params.slot ? slotRange(params.slot) : ""}
          </p>
          <div class="mt-3 flex min-h-0 flex-1 flex-col gap-y-3.5">
            <div class="flex flex-col gap-y-2">
              <Show when={overview().home}>
                {(home) => (
                  <OptionCard selected={!otherMode()} onClick={() => setUseOther(false)}>
                    <span class="font-semibold">집</span>
                    <span class="text-sm break-keep text-sand-11">
                      {home().address}
                      {home().detail ? ` ${home().detail}` : ""}
                    </span>
                  </OptionCard>
                )}
              </Show>
              <OptionCard selected={otherMode()} onClick={() => setUseOther(true)}>
                <span class="font-semibold">다른 주소</span>
                <span class="text-sm break-keep text-sand-11">이번에 고른 날만 다른 곳으로 가요.</span>
              </OptionCard>
            </div>
            <Show when={otherMode()}>
              <AddressSearch selected={other()} onSelect={setOther} />
            </Show>
            <Show when={error()}>
              <p class="px-1 font-medium break-keep text-red-11">{error()}</p>
            </Show>
            <AddressPrivacyNote class="pb-4" />
          </div>
          <Footer
            type="submit"
            buttonLabel={`${nights().length}일 신청하기`}
            variant={saving() ? "loading" : ready() ? "primary" : "disabled"}
          />
        </form>
      </Loading>
    </div>
  );
}
