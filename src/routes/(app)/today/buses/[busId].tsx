import { Title } from "@solidjs/meta";
import { useNavigate, useParams, useSearchParams } from "@solidjs/router";
import { createMemo, Loading, Show } from "solid-js";
import { env } from "virtual:solid-env/client";

import { Footer, Header } from "../../../../components/layout/screen";
import { BusDetail, busTitle } from "../../../../components/ride/bus-detail";
import { getBusDetail } from "../../../../lib/ride";
import { FLOW_TOTAL_STEPS, flowHref } from "../../../../lib/ride-flow";

export default function TodayBus() {
  const nav = useNavigate();
  const routeParams = useParams<{ busId: string }>();
  const [params] = useSearchParams<{ start?: string; from?: string; to?: string }>();
  const data = createMemo(() => getBusDetail(routeParams.busId, params.start ?? "", ""));
  const back = () => nav(flowHref("/today/buses", { ...params }));

  return (
    <div class="flex flex-1 flex-col px-5">
      <Loading fallback={<div class="flex-1" />}>
        <Show
          when={data()}
          fallback={
            <>
              <Header
                title="버스를 찾지 못했어요"
                description="목록에서 다시 골라 주세요."
                step={{ current: 3, total: FLOW_TOTAL_STEPS }}
                onBackClick={back}
              />
              <Footer type="button" buttonLabel="버스 목록으로" onClick={back} />
            </>
          }
        >
          {(detail) => (
            <>
              <Title>{`${busTitle(detail().option)} - ${env.VITE_APP_NAME}`}</Title>
              <Header
                title={busTitle(detail().option)}
                description={`${detail().option.stops[detail().option.alightIndex].name} 근처에서 내려요.`}
                step={{ current: 3, total: FLOW_TOTAL_STEPS }}
                onBackClick={back}
              />
              <BusDetail option={detail().option} now={detail().now} />
              <Footer
                type="button"
                buttonLabel="이 버스로 할게요"
                onClick={() => nav(flowHref("/today/drop-off", { ...params, bus: routeParams.busId }))}
              />
            </>
          )}
        </Show>
      </Loading>
    </div>
  );
}
