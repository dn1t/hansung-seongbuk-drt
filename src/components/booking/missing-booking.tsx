import { useNavigate } from "@solidjs/router";

import { Footer, Header } from "../layout/screen";

export function MissingBooking() {
  const nav = useNavigate();

  return (
    <div class="flex flex-1 flex-col">
      <Header
        title="신청을 찾지 못했어요"
        description="이미 취소했거나 지난 날의 신청이에요."
        onBackClick={() => nav("/booking")}
      />
      <Footer type="button" buttonLabel="사전 신청으로 가기" onClick={() => nav("/booking")} />
    </div>
  );
}
