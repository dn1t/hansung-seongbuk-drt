import { For, Show } from "solid-js";

export interface BarItem {
  key: string;
  label: string;
  count: number;
}

const share = (count: number, total: number) => (total > 0 ? Math.round((count / total) * 100) : 0);

export function BarList(props: { items: BarItem[]; total: number; unit?: string; large?: boolean }) {
  const max = () => Math.max(1, ...props.items.map((item) => item.count));
  return (
    <ul class={["flex flex-col", props.large ? "gap-y-3" : "gap-y-2"]}>
      <For each={props.items} keyed={(item) => item.key}>
        {(item) => (
          <li
            class={[
              "grid items-center gap-x-3",
              props.large ? "grid-cols-[13rem_1fr_7rem] text-xl" : "grid-cols-[minmax(0,9rem)_1fr_5.5rem] text-sm",
            ]}
            title={`${item().label}: ${item().count}${props.unit ?? "명"} (${share(item().count, props.total)}%)`}
          >
            <span class="truncate font-semibold">{item().label}</span>
            <span class={["flex rounded-sm bg-sand-3", props.large ? "h-5" : "h-3"]}>
              <Show when={item().count > 0}>
                <span class="rounded-sm bg-sand-9" style={{ width: `max(4px, ${(item().count / max()) * 100}%)` }} />
              </Show>
            </span>
            <span class="text-end font-medium text-sand-11 tabular-nums">
              <b class="font-bold text-sand-12">{item().count.toLocaleString()}</b>
              {props.unit ?? "명"} · {share(item().count, props.total)}%
            </span>
          </li>
        )}
      </For>
    </ul>
  );
}

export function Columns(props: { items: BarItem[]; unit?: string; large?: boolean; every?: number }) {
  const max = () => Math.max(1, ...props.items.map((item) => item.count));
  return (
    <ul
      class={["grid items-end gap-x-1", props.large ? "h-72" : "h-40"]}
      style={{ "grid-template-columns": `repeat(${Math.max(1, props.items.length)}, minmax(0, 1fr))` }}
    >
      <For each={props.items} keyed={(item) => item.key}>
        {(item, index) => (
          <li
            class="flex h-full min-w-0 flex-col items-center justify-end gap-y-1"
            title={`${item().label}: ${item().count}${props.unit ?? "명"}`}
          >
            <span
              class={[
                "font-bold tabular-nums",
                props.large ? "text-lg" : "text-xs",
                item().count ? "" : "text-sand-10",
              ]}
            >
              {item().count}
            </span>
            <span class="flex w-full flex-1 items-end">
              <span
                class="w-full rounded-t-sm bg-sand-9"
                style={{ height: item().count > 0 ? `max(4px, ${(item().count / max()) * 100}%)` : "0" }}
              />
            </span>
            <span
              class={[
                "w-full text-center font-medium whitespace-nowrap text-sand-11 tabular-nums",
                props.large ? "text-base" : "text-[11px]",
                index() % (props.every ?? 1) === 0 ? "" : "invisible",
              ]}
            >
              {item().label}
            </span>
          </li>
        )}
      </For>
    </ul>
  );
}
