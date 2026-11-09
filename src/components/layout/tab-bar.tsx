import { useLocation } from "@solidjs/router";
import type { ComponentProps, JSX } from "@solidjs/web";
import { For, Show } from "solid-js";
import { cn } from "tailwind-variants";

import { paths } from "../../router";

type Icon = (props: ComponentProps<"svg">) => JSX.Element;

interface Item {
  href: string;
  icon: Icon;
  selectedIcon: Icon;
  label: string;
}

const items: Item[] = [
  { href: paths(), icon: PhMoon, selectedIcon: PhMoonFill, label: "오늘 귀가" },
  { href: paths.users(), icon: PhCalendarBlank, selectedIcon: PhCalendarBlankFill, label: "사전 신청" },
  { href: paths.users(), icon: PhQrCode, selectedIcon: PhQrCodeFill, label: "내 QR" },
  { href: paths.users(), icon: PhUser, selectedIcon: PhUserFill, label: "내 정보" },
];

function Item(props: Item) {
  const loc = useLocation();
  const selected = () =>
    props.href === "/"
      ? loc.pathname === "/"
      : loc.pathname === props.href || loc.pathname.startsWith(`${props.href}/`);

  return (
    <a
      href={props.href}
      aria-current={selected() ? "page" : undefined}
      class={cn(
        "flex h-full w-full flex-col items-center justify-center gap-y-1 text-sand-10 transition-colors",
        selected() && "text-sand-12",
      )}
    >
      <Show when={selected()} fallback={<props.icon aria-hidden="true" class="text-xl" />}>
        <props.selectedIcon aria-hidden="true" class="text-xl" />
      </Show>
      <span class={cn("text-xs font-medium", selected() && "font-bold")}>{props.label}</span>
    </a>
  );
}

export function TabBar() {
  return (
    <nav class="fixed right-0 bottom-0 left-0 w-full">
      <div class="mx-auto w-full max-w-xl border-t border-t-sand-3 bg-sand-1 pb-safe-bottom">
        <div class="flex h-16 items-stretch">
          <For each={items}>{(item) => <Item {...item} />}</For>
        </div>
      </div>
    </nav>
  );
}
