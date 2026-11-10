import { Title } from "@solidjs/meta";
import { useNavigate } from "@solidjs/router";
import { createSignal } from "solid-js";
import { env } from "virtual:solid-env/client";

import { Footer, Header } from "../../components/layout/screen";
import { currentPosition } from "../../lib/geo";

export default function AskLocation() {
  const nav = useNavigate();
  const [asking, setAsking] = createSignal(false);
  const done = () => nav("/", { replace: true });

  async function allow() {
    setAsking(true);
    await currentPosition().catch(() => undefined);
    done();
  }

  return (
    <div class="flex flex-1 flex-col px-5">
      <Title>{`위치 권한 - ${env.VITE_APP_NAME}`}</Title>
      <Header
        title="지금 있는 곳을 알려 주세요"
        description="오늘 귀가에서 출발할 곳을 고를 때, 지금 위치에서 가장 가까운 곳을 먼저 보여 드려요."
        isInitialPage
      />
      <div class="mt-4 flex items-center gap-x-1.5 px-1 text-sand-11">
        <PhLockSimple aria-hidden="true" class="shrink-0 text-xs" />
        <span class="text-sm text-balance break-keep">
          위치는 이 휴대폰에서 거리를 잴 때만 쓰고, 서버로 보내거나 저장하지 않아요.
        </span>
      </div>
      <Footer
        type="button"
        buttonLabel="위치 허용하기"
        variant={asking() ? "loading" : "primary"}
        onClick={() => void allow()}
      >
        <button
          type="button"
          class="mx-auto mt-4 block cursor-pointer px-2 py-1 font-semibold text-sand-11"
          onClick={done}
        >
          나중에 할게요
        </button>
      </Footer>
    </div>
  );
}
