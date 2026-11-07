import type { JSX } from "@solidjs/web/jsx-runtime";

export function Root(props: { children: JSX.Element }) {
  return <main class="min-h-dvh">{props.children}</main>;
}
