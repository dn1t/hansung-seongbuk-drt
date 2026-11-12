import { Title } from "@solidjs/meta";
import { useNavigate, useParams, useSearchParams } from "@solidjs/router";
import { createMemo, createSignal, Errored, Loading, Show } from "solid-js";
import { env } from "virtual:solid-env/client";

import { BookingRouteCard } from "../../../../components/booking/booking-route";
import { MissingBooking } from "../../../../components/booking/missing-booking";
import { Button } from "../../../../components/common/button";
import { ActionRow, LinkRow, SavedNotice } from "../../../../components/common/list-row";
import { Sheet } from "../../../../components/common/sheet";
import { Header } from "../../../../components/layout/screen";
import { type Booking, cancelBooking, getBookingOverview } from "../../../../lib/booking";
import { formatClock, formatNight, slotRange } from "../../../../lib/time";

const SAVED_NOTICES: Record<string, string> = {
  time: "시간을 바꿨어요.",
  address: "가는 곳을 바꿨어요.",
};

export default function BookingDetail() {
  const nav = useNavigate();
  const params = useParams<{ id: string }>();
  const [search] = useSearchParams<{ saved?: string }>();
  const overview = createMemo(() => getBookingOverview());
  const [leaving, setLeaving] = createSignal(false);
  let lastFound: Booking | undefined;
  const booking = () => {
    const found = overview().bookings.find((b) => b.id === params.id);
    if (found) lastFound = found;
    return found ?? (leaving() ? lastFound : undefined);
  };
  const [sheetOpen, setSheetOpen] = createSignal(false);
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal("");

  async function confirmCancel(id: string) {
    setBusy(true);
    setError("");
    setLeaving(true);
    try {
      const result = await cancelBooking(id);
      if (!result.ok) throw new Error(result.message);
      nav("/booking?saved=cancelled", { replace: true });
    } catch (err) {
      setLeaving(false);
      setError(err instanceof Error ? err.message : "취소하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div class="flex flex-1 flex-col px-5">
      <Title>{`신청 바꾸기 - ${env.VITE_APP_NAME}`}</Title>
      <Errored
        fallback={(_, reset) => (
          <div class="flex flex-1 flex-col">
            <Header title="신청을 불러오지 못했어요" onBackClick={() => nav("/booking")} />
            <button type="button" class="mt-4 w-max cursor-pointer px-1 font-semibold text-amber-11" onClick={reset}>
              다시 불러오기
            </button>
          </div>
        )}
      >
        <Loading fallback={<div class="flex-1" />}>
          <Show when={booking()} fallback={<MissingBooking />}>
            {(current) => (
              <>
                <Header
                  title={`${formatNight(current().night)} 밤`}
                  description={
                    current().locked
                      ? "탑승 1시간 전이 지나 노선이 정해졌어요. 시간과 가는 곳은 바꿀 수 없고, 못 타게 되면 취소해 주세요."
                      : `${formatClock(current().closesAt)}까지 시간이나 가는 곳을 바꿀 수 있어요. 날짜를 바꾸려면 이 신청을 취소하고 새로 신청해 주세요.`
                  }
                  onBackClick={() => nav("/booking")}
                />
                <SavedNotice message={SAVED_NOTICES[search.saved ?? ""]} class="mt-2" />
                <ul class="mt-4 overflow-hidden rounded-2xl bg-sand-2">
                  <LinkRow
                    href={current().locked ? undefined : `/booking/${current().id}/time`}
                    icon={<PhClockBold />}
                    title="시간"
                    value={slotRange(current().slot)}
                  />
                  <LinkRow
                    href={current().locked ? undefined : `/booking/${current().id}/address`}
                    icon={<PhHouseBold />}
                    title="가는 곳"
                    value={current().isHome ? "집" : current().address}
                    divided
                  />
                </ul>
                <BookingRouteCard id={current().id} home={current().isHome ? "집" : current().address} />
                <ul class="mt-8 overflow-hidden rounded-2xl bg-sand-2">
                  <ActionRow
                    icon={<PhXCircleBold />}
                    title="이 날 신청 취소하기"
                    danger
                    onClick={() => {
                      setError("");
                      setSheetOpen(true);
                    }}
                  />
                </ul>
                <Sheet
                  open={sheetOpen()}
                  title="이 날 신청을 취소할까요?"
                  description={`${formatNight(current().night)} 밤 ${slotRange(current().slot)} 신청이 지워져요.`}
                  onClose={() => setSheetOpen(false)}
                >
                  <Show when={error()}>
                    <p class="mb-2 px-1 font-medium break-keep text-red-11">{error()}</p>
                  </Show>
                  <Button
                    type="button"
                    variant={busy() ? "loading" : "danger"}
                    onClick={() => void confirmCancel(current().id)}
                  >
                    신청 취소하기
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setSheetOpen(false)}>
                    그대로 두기
                  </Button>
                </Sheet>
              </>
            )}
          </Show>
        </Loading>
      </Errored>
    </div>
  );
}
