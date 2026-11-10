import type { JSX } from "@solidjs/web";
import { createSignal, onSettled } from "solid-js";
import { cn } from "tailwind-variants";

const EDGE_TOLERANCE = 1;

export function FadeScroll(props: { class?: string; children: JSX.Element }) {
  let el: HTMLDivElement | undefined;
  const [fadeTop, setFadeTop] = createSignal(false);
  const [fadeBottom, setFadeBottom] = createSignal(false);

  function measure() {
    if (!el) return;
    setFadeTop(el.scrollTop > EDGE_TOLERANCE);
    setFadeBottom(el.scrollTop + el.clientHeight < el.scrollHeight - EDGE_TOLERANCE);
  }

  onSettled(() => {
    if (!el) return;
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(el);
    const mutation = new MutationObserver(measure);
    mutation.observe(el, { childList: true, subtree: true });
    return () => {
      resize.disconnect();
      mutation.disconnect();
    };
  });

  return (
    <div
      ref={(node) => (el = node)}
      class={cn("fade-scroll overflow-y-auto overscroll-contain", props.class)}
      style={{ "--fade-top": fadeTop() ? "1.5rem" : "0rem", "--fade-bottom": fadeBottom() ? "1.5rem" : "0rem" }}
      onScroll={measure}
    >
      {props.children}
    </div>
  );
}
