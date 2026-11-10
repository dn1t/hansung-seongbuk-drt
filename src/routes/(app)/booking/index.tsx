import { Title } from "@solidjs/meta";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { createMemo, Errored, For, Loading, Show } from "solid-js";
import { env } from "virtual:solid-env/client";

import { SavedNotice } from "../../../components/common/list-row";
import { Footer, SectionRule } from "../../../components/layout/screen";
import { getBookingOverview } from "../../../lib/booking";
import { formatDate, formatNight, slotRange } from "../../../lib/time";

function savedNotice(saved: string | undefined, count: string | undefined) {
  if (saved === "booked") return `${Number(count) > 1 ? `${count}일 ` : ""}신청했어요.`;
  if (saved === "cancelled") return "신청을 취소했어요.";
  return undefined;
}

export default function BookingTab() {
  const nav = useNavigate();
  const [params] = useSearchParams<{ saved?: string; count?: string }>();
  const overview = createMemo(() => getBookingOverview());

  return (
    <div class="flex flex-1 flex-col px-5 pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <Title>{`사전 신청 - ${env.VITE_APP_NAME}`}</Title>
      <div class="mt-8 flex h-7 items-center px-1">
        <h1 class="text-xl font-bold">사전 신청</h1>
      </div>
      <p class="mt-2 px-1 font-medium text-balance break-keep text-sand-11">
        운행일 밤에 탈 시간을 미리 신청하면, 신청한 학생들의 집 방향으로 그날 노선이 생겨요.
      </p>
      <Errored
        fallback={(_, reset) => (
          <div class="mt-6 px-1">
            <p class="font-semibold">신청 내역을 불러오지 못했어요.</p>
            <button type="button" class="mt-2 cursor-pointer font-semibold text-amber-11" onClick={reset}>
              다시 불러오기
            </button>
          </div>
        )}
      >
        <Loading fallback={<div class="flex-1" />}>
          <div class="mt-5 flex items-center justify-between gap-x-3 rounded-xl border border-sand-4 px-4 py-3">
            <Show
              when={overview().nights.length > 0}
              fallback={
                <span class="text-sm font-semibold break-keep">
                  지금은 신청할 수 있는 날이 없어요. 신청 기간이 열리면 학교 이메일로 알려 드려요.
                </span>
              }
            >
              <span class="text-sm font-semibold tabular-nums">신청할 수 있는 날 {overview().nights.length}일</span>
              <span class="shrink-0 text-sm font-medium text-sand-11 tabular-nums">
                {formatDate(overview().nights.at(-1)!)}까지
              </span>
            </Show>
          </div>
          <SavedNotice message={savedNotice(params.saved, params.count)} class="mt-4" />
          <SectionRule title="내 신청" class="mt-8" />
          <Show
            when={overview().bookings.length > 0}
            fallback={<p class="mt-4 px-1 font-medium text-sand-11">아직 신청한 날이 없어요.</p>}
          >
            <ul class="mt-3 overflow-hidden rounded-2xl bg-sand-2">
              <For each={overview().bookings}>
                {(booking, i) => (
                  <li class={i() > 0 ? "border-t border-sand-4" : undefined}>
                    <a
                      href={`/booking/${booking.id}`}
                      class="flex items-center gap-x-3 py-3.5 pr-3 pl-4 transition-colors active:bg-sand-3"
                    >
                      <div class="flex min-w-0 flex-1 flex-col">
                        <span class="font-semibold tabular-nums">{formatNight(booking.night)} 밤</span>
                        <span class="truncate text-sm font-medium text-sand-11 tabular-nums">
                          {slotRange(booking.slot)} · {booking.isHome ? "집으로" : booking.address}
                        </span>
                      </div>
                      <PhCaretRightBold aria-hidden="true" class="shrink-0 text-sm text-sand-8" />
                    </a>
                  </li>
                )}
              </For>
            </ul>
          </Show>
          <Footer
            type="button"
            buttonLabel="새로 신청하기"
            aboveTabBar
            variant={overview().nights.length > 0 ? "primary" : "disabled"}
            onClick={() => nav("/booking/new")}
          />
        </Loading>
      </Errored>
    </div>
  );
}
