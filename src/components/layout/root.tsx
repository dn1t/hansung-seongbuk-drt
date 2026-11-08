import type { JSX } from "@solidjs/web";

export function Root(props: { children: JSX.Element }) {
  return (
    <main class="mx-auto w-full max-w-xl">
      <div class="fixed top-0 bottom-0">
        <div class="relative -left-px h-full w-px bg-sand-3" />
      </div>
      {props.children}
      <div class="fixed top-0 bottom-0">
        <div class="relative left-(--container-xl) h-full w-px bg-sand-3" />
      </div>
    </main>
  );
}
