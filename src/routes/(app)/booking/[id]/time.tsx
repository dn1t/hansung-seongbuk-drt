import { Title } from "@solidjs/meta";
import { useNavigate, useParams } from "@solidjs/router";
import { createMemo, createSignal, Loading, Show } from "solid-js";
import { env } from "virtual:solid-env/client";

import { MissingBooking } from "../../../../components/booking/missing-booking";
import { SlotGrid } from "../../../../components/booking/slot-grid";
import { Footer, Header } from "../../../../components/layout/screen";
import { SampleBadge } from "../../../../components/ride/badges";
import { getBookingOverview, updateBooking } from "../../../../lib/booking";
import { formatNight } from "../../../../lib/time";

export default function BookingChangeTime() {
  const nav = useNavigate();
  const params = useParams<{ id: string }>();
  const overview = createMemo(() => getBookingOverview());
  const booking = () => overview().bookings.find((b) => b.id === params.id);
  const [picked, setPicked] = createSignal<string>();
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal("");
  const back = () => nav(`/booking/${params.id}`);

  async function save(slot: string) {
    setError("");
    setSaving(true);
    try {
      const result = await updateBooking({ id: params.id, slot, address: { kind: "keep" } });
      if (!result.ok) throw new Error(result.message);
      nav(`/booking/${params.id}?saved=time`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "바꾸지 못했어요. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div class="flex flex-1 flex-col px-5">
      <Title>{`시간 바꾸기 - ${env.VITE_APP_NAME}`}</Title>
      <Loading fallback={<div class="flex-1" />}>
        <Show when={booking()} fallback={<MissingBooking />}>
          {(current) => {
            const selected = () => picked() ?? current().slot;
            return (
              <>
                <Header
                  title="몇 시쯤 탈까요?"
                  description="이 날 시간만 바뀌어요. 다른 날 신청은 그대로예요."
                  onBackClick={back}
                />
                <div class="mt-4 flex items-center justify-between gap-x-3 px-1">
                  <span class="text-sm font-semibold text-sand-11 tabular-nums">{formatNight(current().night)} 밤</span>
                  <SampleBadge />
                </div>
                <div class="mt-3">
                  <SlotGrid slots={overview().slots} selected={selected()} onSelect={setPicked} />
                </div>
                <Show when={error()}>
                  <p class="mt-4 px-1 font-medium break-keep text-red-11">{error()}</p>
                </Show>
                <Footer
                  type="button"
                  buttonLabel="저장"
                  variant={saving() ? "loading" : selected() !== current().slot ? "primary" : "disabled"}
                  onClick={() => void save(selected())}
                />
              </>
            );
          }}
        </Show>
      </Loading>
    </div>
  );
}
