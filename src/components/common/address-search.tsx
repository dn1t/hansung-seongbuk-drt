import { createMemo, createSignal, Errored, For, isPending, Loading, onSettled, Show } from "solid-js";

import { ADDRESS_DETAIL_MAX_LENGTH, type AddressResult, searchAddress } from "../../lib/address";
import { FadeScroll } from "./fade-scroll";
import { Input } from "./input";
import { OptionCard } from "./option-card";

export function AddressSearch(props: {
  selected: AddressResult | undefined;
  onSelect: (result: AddressResult | undefined) => void;
  detailName?: string;
  defaultDetail?: string;
}) {
  const [query, setQuery] = createSignal("");
  const results = createMemo(() => (query().length >= 2 ? searchAddress(query()) : []));
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
                      <OptionCard selected={props.selected?.id === result.id} onClick={() => props.onSelect(result)}>
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
      <Input
        name={props.detailName ?? "address2"}
        label="상세 주소 (선택)"
        placeholder="201동 101호"
        labelClass="mt-1.5"
        value={props.defaultDetail ?? ""}
        maxlength={ADDRESS_DETAIL_MAX_LENGTH}
      />
    </>
  );
}

export function AddressPrivacyNote(props: { class?: string }) {
  return (
    <div class={["flex items-center gap-x-1.5 px-1 text-sand-11", props.class]}>
      <PhLockSimple aria-hidden="true" class="shrink-0 text-xs" />
      <span class="text-sm text-balance break-keep">
        주소는 노선을 짤 때만 사용되며, 기사님이나 다른 사용자에게는 보이지 않아요.
      </span>
    </div>
  );
}
