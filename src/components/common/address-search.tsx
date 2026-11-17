import { createMemo, createSignal, Errored, For, isPending, Loading, onSettled, Show } from "solid-js";

import { type AddressResult, searchAddress } from "../../lib/address";
import { isOutsideSeoul } from "../../lib/region";
import { Button } from "./button";
import { FadeScroll } from "./fade-scroll";
import { Input } from "./input";
import { OptionCard } from "./option-card";
import { Sheet } from "./sheet";

export function AddressSearch(props: {
  selected: AddressResult | undefined;
  onSelect: (result: AddressResult | undefined) => void;
  search?: (text: string) => Promise<AddressResult[]>;
}) {
  const [query, setQuery] = createSignal("");
  const [outside, setOutside] = createSignal<AddressResult>();

  function choose(result: AddressResult) {
    if (isOutsideSeoul(result.address)) setOutside(result);
    else props.onSelect(result);
  }

  function keepOutside() {
    const result = outside();
    setOutside(undefined);
    if (result) props.onSelect(result);
  }
  const results = createMemo(() => (query().length >= 2 ? (props.search ?? searchAddress)(query()) : []));
  let timer: ReturnType<typeof setTimeout> | undefined;

  function searchSoon(value: string, delay = 300) {
    clearTimeout(timer);
    timer = setTimeout(() => setQuery(value.trim()), delay);
  }

  onSettled(() => () => clearTimeout(timer));

  return (
    <>
      <Input
        type="search"
        name="search"
        placeholder="정릉로 10"
        icon={PhMagnifyingGlass}
        autocomplete="off"
        onInput={(e) => {
          props.onSelect(undefined);
          searchSoon(e.currentTarget.value);
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          searchSoon(e.currentTarget.value, 0);
        }}
      />
      <FadeScroll class="flex min-h-40 flex-1 basis-0 flex-col">
        <Errored
          fallback={<span class="m-auto text-red-11">주소를 검색하지 못했어요. 잠시 후 다시 시도해 주세요.</span>}
        >
          <Loading fallback={<span class="m-auto text-sand-10">검색 중…</span>}>
            <Show
              when={results().length > 0}
              fallback={
                <span class="m-auto text-sand-10">
                  {query().length < 2
                    ? "주소를 입력해 주세요."
                    : isPending(() => results())
                      ? "검색 중…"
                      : "검색 결과가 없어요."}
                </span>
              }
            >
              <ul class={["flex flex-col gap-y-2 transition-opacity", { "opacity-60": isPending(() => results()) }]}>
                <For each={results()}>
                  {(result) => (
                    <li>
                      <OptionCard selected={props.selected?.id === result.id} onClick={() => choose(result)}>
                        <span class="font-semibold break-keep">{result.title}</span>
                        <Show when={result.subtitle}>
                          <span class="text-sm break-keep text-sand-11">{result.subtitle}</span>
                        </Show>
                      </OptionCard>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </Loading>
        </Errored>
      </FadeScroll>
      <Sheet
        open={outside() !== undefined}
        title="서울 밖 주소예요"
        description="버스는 서울 안에서만 다녀서, 이 주소로 하면 가장 가까운 서울 외곽 정류장에서 내려요. 그게 싫으면 서울 안에서 원하는 곳을 골라 주세요."
        onClose={() => setOutside(undefined)}
      >
        <Show when={outside()}>
          {(result) => <p class="mb-4 px-1 text-sm font-semibold break-keep text-sand-11">{result().address}</p>}
        </Show>
        <Button type="button" onClick={() => setOutside(undefined)}>
          서울 안에서 다시 고르기
        </Button>
        <Button type="button" variant="secondary" onClick={keepOutside}>
          이 주소로 할게요
        </Button>
      </Sheet>
    </>
  );
}

export function AddressPrivacyNote(props: { class?: string }) {
  return (
    <ul class={["flex flex-col gap-y-1.5 px-1 text-sand-11", props.class]}>
      <li class="flex items-start gap-x-1.5">
        <PhInfo aria-hidden="true" class="mt-1 shrink-0 text-xs" />
        <span class="text-sm text-balance break-keep">
          버스는 서울 안에서만 다녀요. 서울 밖 주소는 가장 가까운 서울 외곽 정류장에서 내려요.
        </span>
      </li>
      <li class="flex items-start gap-x-1.5">
        <PhLockSimple aria-hidden="true" class="mt-1 shrink-0 text-xs" />
        <span class="text-sm text-balance break-keep">
          주소는 노선을 짤 때만 사용되며, 기사님이나 다른 사용자에게는 보이지 않아요.
        </span>
      </li>
    </ul>
  );
}
