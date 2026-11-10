import { Title } from "@solidjs/meta";
import { useNavigate, useParams } from "@solidjs/router";
import { createMemo, createSignal, Loading, Show } from "solid-js";
import { env } from "virtual:solid-env/client";

import { MissingBooking } from "../../../../components/booking/missing-booking";
import { AddressPrivacyNote, AddressSearch } from "../../../../components/common/address-search";
import { OptionCard } from "../../../../components/common/option-card";
import { Footer, Header } from "../../../../components/layout/screen";
import type { AddressResult } from "../../../../lib/address";
import { getBookingOverview, updateBooking } from "../../../../lib/booking";
import { formatNight, slotRange } from "../../../../lib/time";

type Choice = "home" | "keep" | "other";

export default function BookingChangeAddress() {
  const nav = useNavigate();
  const params = useParams<{ id: string }>();
  const overview = createMemo(() => getBookingOverview());
  const booking = () => overview().bookings.find((b) => b.id === params.id);
  const [picked, setPicked] = createSignal<Choice>();
  const [other, setOther] = createSignal<AddressResult>();
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal("");
  const initial = (): Choice => (booking()?.isHome ? "home" : "keep");
  const choice = () => picked() ?? initial();
  const ready = () => (choice() === "other" ? other() !== undefined : choice() !== initial());

  async function save(detail: string) {
    const current = booking();
    if (!current) return;
    setError("");
    setSaving(true);
    try {
      const place = other();
      const result = await updateBooking({
        id: current.id,
        slot: current.slot,
        address:
          choice() === "other" && place
            ? { kind: "other", address: place.address, detail }
            : { kind: choice() === "home" ? "home" : "keep" },
      });
      if (!result.ok) throw new Error(result.message);
      nav(`/booking/${current.id}?saved=address`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "바꾸지 못했어요. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div class={["flex flex-col px-5", choice() === "other" ? "h-dvh" : "flex-1"]}>
      <Title>{`가는 곳 바꾸기 - ${env.VITE_APP_NAME}`}</Title>
      <Loading fallback={<div class="flex-1" />}>
        <Show when={booking()} fallback={<MissingBooking />}>
          {(current) => (
            <>
              <Header
                title="어디로 갈까요?"
                description="이 날만 바뀌어요. 내 정보의 집 주소는 그대로예요."
                onBackClick={() => nav(`/booking/${current().id}`)}
              />
              <form
                class="flex min-h-0 flex-1 flex-col"
                onSubmit={(e) => {
                  e.preventDefault();
                  void save(String(new FormData(e.currentTarget).get("address2") ?? ""));
                }}
              >
                <p class="mt-4 px-1 text-sm font-semibold text-sand-11 tabular-nums">
                  {formatNight(current().night)} 밤 · {slotRange(current().slot)}
                </p>
                <div class="mt-3 flex min-h-0 flex-1 flex-col gap-y-3.5">
                  <div class="flex flex-col gap-y-2">
                    <Show when={overview().home}>
                      {(home) => (
                        <OptionCard selected={choice() === "home"} onClick={() => setPicked("home")}>
                          <span class="font-semibold">집</span>
                          <span class="text-sm break-keep text-sand-11">
                            {home().address}
                            {home().detail ? ` ${home().detail}` : ""}
                          </span>
                        </OptionCard>
                      )}
                    </Show>
                    <Show when={!current().isHome}>
                      <OptionCard selected={choice() === "keep"} onClick={() => setPicked("keep")}>
                        <span class="font-semibold">지금 고른 주소</span>
                        <span class="text-sm break-keep text-sand-11">
                          {current().address}
                          {current().addressDetail ? ` ${current().addressDetail}` : ""}
                        </span>
                      </OptionCard>
                    </Show>
                    <OptionCard selected={choice() === "other"} onClick={() => setPicked("other")}>
                      <span class="font-semibold">다른 주소</span>
                      <span class="text-sm break-keep text-sand-11">새로 검색해서 골라요.</span>
                    </OptionCard>
                  </div>
                  <Show when={choice() === "other"}>
                    <AddressSearch selected={other()} onSelect={setOther} />
                  </Show>
                  <Show when={error()}>
                    <p class="px-1 font-medium break-keep text-red-11">{error()}</p>
                  </Show>
                  <AddressPrivacyNote class="pb-4" />
                </div>
                <Footer
                  type="submit"
                  buttonLabel="저장"
                  variant={saving() ? "loading" : ready() ? "primary" : "disabled"}
                />
              </form>
            </>
          )}
        </Show>
      </Loading>
    </div>
  );
}
