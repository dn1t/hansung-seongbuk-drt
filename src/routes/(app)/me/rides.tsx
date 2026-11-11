import { Title } from "@solidjs/meta";
import { useNavigate } from "@solidjs/router";
import { createMemo, Errored, For, Loading, Show } from "solid-js";
import { env } from "virtual:solid-env/client";

import { Header } from "../../../components/layout/screen";
import { RouteChip } from "../../../components/ride/badges";
import { getRideHistory } from "../../../lib/profile";
import { formatClock, formatNight } from "../../../lib/time";

export default function RideHistory() {
  const nav = useNavigate();
  const rides = createMemo(() => getRideHistory());

  return (
    <div class="flex flex-1 flex-col px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
      <Title>{`탑승 기록 - ${env.VITE_APP_NAME}`}</Title>
      <Header
        title="탑승 기록"
        description="내 QR로 버스에 탄 기록이에요. 최근 30번까지 보여요."
        onBackClick={() => nav("/me")}
      />
      <Errored
        fallback={(_, reset) => (
          <div class="mt-6 px-1">
            <p class="font-semibold">탑승 기록을 불러오지 못했어요.</p>
            <button type="button" class="mt-2 cursor-pointer font-semibold text-amber-11" onClick={reset}>
              다시 불러오기
            </button>
          </div>
        )}
      >
        <Loading fallback={<div class="flex-1" />}>
          <Show
            when={rides().length > 0}
            fallback={<p class="mt-6 px-1 font-medium text-sand-11">아직 탄 기록이 없어요.</p>}
          >
            <ul class="mt-5 overflow-hidden rounded-2xl bg-sand-2">
              <For each={rides()}>
                {(ride, i) => (
                  <li class={["flex items-center gap-x-3 py-3.5 pr-4 pl-4", i() > 0 && "border-t border-sand-4"]}>
                    <div class="flex min-w-0 flex-1 flex-col">
                      <span class="font-semibold tabular-nums">{formatNight(ride.night)} 밤</span>
                      <span class="truncate text-sm font-medium text-sand-11 tabular-nums">
                        {formatClock(ride.boardedAt)} 탑승
                        <Show when={ride.dropOff}>{(stop) => <> · {stop()}에서 내림</>}</Show>
                      </span>
                    </div>
                    <RouteChip name={ride.busName} quiet />
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </Loading>
      </Errored>
    </div>
  );
}
