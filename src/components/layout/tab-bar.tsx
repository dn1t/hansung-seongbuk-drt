import { useLocation } from "@solidjs/router";
import type { ComponentProps, JSX } from "@solidjs/web";
import { For } from "solid-js";
import { cn } from "tailwind-variants";

import { paths } from "../../router";

interface Item {
  href: string;
  icon: (props: ComponentProps<"svg">) => JSX.Element;
  label: string;
}

const items: Item[] = [
  { href: paths(), icon: PhMoon, label: "오늘 귀가" },
  { href: paths.users(), icon: PhCalendarBlank, label: "사전 신청" },
  { href: paths.users(), icon: PhQrCode, label: "내 QR" },
  { href: paths.users(), icon: PhUser, label: "내 정보" },
];

function Item(props: Item) {
  const loc = useLocation();
  const selected = () => (loc.pathname === "/" ? loc.pathname === props.href : props.href.startsWith(loc.pathname));

  return (
    <a
      href={props.href}
      class={cn("flex w-full flex-col items-center gap-y-1 pt-0.5 text-sand-9", selected() && "text-sand-12")}
    >
      <props.icon class="text-lg" />
      <span class="text-xs font-medium">{props.label}</span>
    </a>
  );
}
export function TabBar() {
  return (
    <nav class="fixed right-0 bottom-0 left-0 w-full">
      <div class="mx-auto flex h-16 w-full max-w-xl items-center border-t border-t-sand-3 bg-sand-1/80">
        <For each={items}>{(item) => <Item {...item} />}</For>
      </div>
    </nav>
  );
}
