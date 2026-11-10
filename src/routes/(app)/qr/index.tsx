import { Title } from "@solidjs/meta";
import { createMemo, Errored, Loading, Match, Switch } from "solid-js";
import { env } from "virtual:solid-env/client";

import { QRCode } from "../../../components/common/qr-code";
import { RouteChip, SampleBadge } from "../../../components/ride/badges";
import { getProfile } from "../../../lib/profile";
import { getTonight } from "../../../lib/ride";
import { formatClock } from "../../../lib/time";

export default function MyQR() {
  const profile = createMemo(() => getProfile());
  const tonight = createMemo(() => getTonight(""));
  const chosenRide = () => {
    const state = tonight();
    return state.kind === "waiting" ? state.ride : undefined;
  };

  return (
    <div class="flex flex-1 flex-col px-5 pb-[calc(4rem+env(safe-area-inset-bottom)+1.75rem)]">
      <Title>{`내 QR - ${env.VITE_APP_NAME}`}</Title>
      <div class="mt-8 flex h-7 items-center px-1">
        <h1 class="text-xl font-bold">내 QR</h1>
      </div>
      <Errored
        fallback={(_, reset) => (
          <div class="mt-6 px-1">
            <p class="font-semibold">QR을 불러오지 못했어요.</p>
            <button type="button" class="mt-2 cursor-pointer font-semibold text-amber-11" onClick={reset}>
              다시 불러오기
            </button>
          </div>
        )}
      >
        <Loading fallback={<div class="flex-1" />}>
          <section class="mt-5 flex flex-col items-center rounded-2xl border border-sand-4 bg-white px-6 pt-8 pb-6 text-[#21201c]">
            <QRCode value={profile().id} label="버스 단말기에 보여 줄 내 QR" class="aspect-square w-full max-w-60" />
            <p class="mt-6 text-xl font-bold">{profile().name}</p>
            <p class="mt-0.5 text-sm font-medium text-[#63635e]">{profile().school}</p>
          </section>
          <p class="mt-4 px-1 text-sm font-medium text-balance break-keep text-sand-11">
            버스에 탈 때 단말기에 보여 주세요. 화면 밝기를 올리면 더 잘 읽혀요.
          </p>
          <div class="mt-6 rounded-2xl border border-sand-4 px-4 py-3.5">
            <Switch>
              <Match when={chosenRide()}>
                {(ride) => (
                  <div class="flex flex-col gap-y-1.5">
                    <div class="flex items-center justify-between gap-x-3">
                      <span class="text-sm font-semibold text-sand-11">오늘 탈 버스</span>
                      <SampleBadge />
                    </div>
                    <div class="flex items-center gap-x-2">
                      <RouteChip name={ride().routeName} quiet />
                      <span class="font-bold tabular-nums">{formatClock(ride().stops[ride().boardIndex].at)} 승차</span>
                    </div>
                    <span class="text-sm font-medium break-keep text-sand-11">
                      {ride().stops[ride().boardIndex].name}에서 타요
                    </span>
                  </div>
                )}
              </Match>
              <Match when={tonight().kind === "booked"}>
                <p class="text-sm font-medium break-keep text-sand-11">
                  오늘 탈 버스를 고르지 않아도 이 QR로 탈 수 있어요.
                </p>
              </Match>
              <Match when={true}>
                <p class="text-sm font-medium break-keep text-sand-11">오늘은 탈 버스가 없어요.</p>
              </Match>
            </Switch>
          </div>
        </Loading>
      </Errored>
    </div>
  );
}
