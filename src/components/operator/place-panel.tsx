import type { JSX } from "@solidjs/web";
import { createMemo, createSignal, Errored, For, isPending, Loading, onSettled, Show } from "solid-js";

import type { AddressResult } from "../../lib/address";
import { type OperatorResult, searchStopPlaces, STOP_NAME_MAX_LENGTH } from "../../lib/operator";
import { Button } from "../common/button";
import { FadeScroll } from "../common/fade-scroll";
import { Input } from "../common/input";
import { OptionCard } from "../common/option-card";
import { SectionRule } from "../layout/screen";

export function AddPlacePanel(props: {
  title: string;
  nameLabel: string;
  placeholder: string;
  hint: string;
  submitLabel: string;
  savedText: (name: string) => string;
  onAdd: (input: { name: string; address: string; lat: number; lng: number }) => Promise<OperatorResult>;
  children?: JSX.Element;
}) {
  const [query, setQuery] = createSignal("");
  const [picked, setPicked] = createSignal<AddressResult>();
  const [name, setName] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const [message, setMessage] = createSignal<{ kind: "saved" | "error"; text: string }>();
  const results = createMemo(() => (query().length >= 2 ? searchStopPlaces(query()) : []));
  let timer: ReturnType<typeof setTimeout> | undefined;
  let searchInput: HTMLInputElement | undefined;

  function searchSoon(value: string, delay = 300) {
    clearTimeout(timer);
    timer = setTimeout(() => setQuery(value.trim()), delay);
  }

  onSettled(() => () => clearTimeout(timer));

  async function submit() {
    const place = picked();
    if (!place) return;
    setMessage(undefined);
    setBusy(true);
    try {
      const stopName = name().trim() || place.title;
      const result = await props.onAdd({ name: stopName, address: place.address, lat: place.lat, lng: place.lng });
      if (!result.ok) throw new Error(result.message);
      setMessage({ kind: "saved", text: props.savedText(stopName) });
      setPicked(undefined);
      setName("");
      setQuery("");
      if (searchInput) {
        searchInput.value = "";
        searchInput.focus();
      }
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "넣지 못했어요. 다시 시도해 주세요." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside class="lg:sticky lg:top-8 lg:self-start">
      <SectionRule title={props.title} />
      <form
        class="mt-4 flex flex-col gap-y-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Input
          ref={(el) => (searchInput = el)}
          type="search"
          label="장소 검색"
          placeholder={props.placeholder}
          icon={PhMagnifyingGlass}
          autocomplete="off"
          onInput={(e) => {
            setPicked(undefined);
            searchSoon(e.currentTarget.value);
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            searchSoon(e.currentTarget.value, 0);
          }}
        />
        <FadeScroll class="-mx-1 flex h-72 flex-col p-1">
          <Errored
            fallback={
              <span class="m-auto px-4 text-center text-red-11">
                장소를 검색하지 못했어요. 잠시 후 다시 시도해 주세요.
              </span>
            }
          >
            <Loading fallback={<span class="m-auto text-sand-10">검색 중…</span>}>
              <Show
                when={results().length > 0}
                fallback={
                  <span class="m-auto text-sand-10">
                    {query().length < 2 ? props.hint : isPending(() => results()) ? "검색 중…" : "검색 결과가 없어요."}
                  </span>
                }
              >
                <ul class={["flex flex-col gap-y-2 transition-opacity", { "opacity-60": isPending(() => results()) }]}>
                  <For each={results()}>
                    {(result) => (
                      <li>
                        <OptionCard
                          selected={picked()?.id === result.id}
                          onClick={() => {
                            setPicked(result);
                            setName(result.title);
                            setMessage(undefined);
                          }}
                        >
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
          type="text"
          label={props.nameLabel}
          placeholder="장소를 고르면 채워져요"
          maxlength={STOP_NAME_MAX_LENGTH}
          disabled={!picked()}
          value={name()}
          class="disabled:cursor-not-allowed disabled:text-sand-11"
          onInput={(e) => setName(e.currentTarget.value)}
        />
        <Show when={message()}>
          {(current) => (
            <p
              role="status"
              class={[
                "flex items-center gap-x-1.5 px-1 font-semibold break-keep",
                current().kind === "saved" ? "text-green-11" : "text-red-11",
              ]}
            >
              <Show
                when={current().kind === "saved"}
                fallback={<PhWarningCircle aria-hidden="true" class="shrink-0" />}
              >
                <PhCheckCircle aria-hidden="true" class="shrink-0" />
              </Show>
              {current().text}
            </p>
          )}
        </Show>
        <Button type="submit" class="mt-1" variant={busy() ? "loading" : picked() ? "primary" : "disabled"}>
          {props.submitLabel}
        </Button>
      </form>
      {props.children}
    </aside>
  );
}
