import type { JSX } from "@solidjs/web";
import { createEffect } from "solid-js";

const CLOSE_FALLBACK_MS = 400;
const DISMISS_DISTANCE_RATIO = 0.25;
const DISMISS_VELOCITY = 0.5;
const STRETCH_LIMIT = 64;

const rubberBand = (distance: number) => STRETCH_LIMIT * (1 - 1 / ((distance / STRETCH_LIMIT) * 0.55 + 1));

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Sheet(props: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  children: JSX.Element;
}) {
  let dialog: HTMLDialogElement | undefined;
  let drag: { pointerId: number; startY: number; startTime: number; offset: number } | undefined;

  function open() {
    if (!dialog || dialog.open) return;
    dialog.dataset.state = "closed";
    dialog.showModal();
    dialog.getBoundingClientRect();
    dialog.dataset.state = "open";
  }

  function close() {
    const el = dialog;
    if (!el?.open || el.dataset.state === "closing") return;
    el.style.translate = "";
    el.style.removeProperty("--sheet-stretch");
    el.dataset.state = "closing";
    if (prefersReducedMotion()) return el.close();

    const finish = () => {
      clearTimeout(fallback);
      el.removeEventListener("transitionend", onEnd);
      if (el.dataset.state === "closing") el.close();
    };
    const onEnd = (e: TransitionEvent) => {
      if (e.target === el && e.propertyName === "translate") finish();
    };
    const fallback = setTimeout(finish, CLOSE_FALLBACK_MS);
    el.addEventListener("transitionend", onEnd);
  }

  createEffect(
    () => props.open,
    (isOpen) => (isOpen ? open() : close()),
  );

  function onPointerDown(e: PointerEvent) {
    if (!dialog || e.button !== 0) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag = { pointerId: e.pointerId, startY: e.clientY, startTime: performance.now(), offset: 0 };
    dialog.dataset.dragging = "";
  }

  function onPointerMove(e: PointerEvent) {
    if (!dialog || drag?.pointerId !== e.pointerId) return;
    const delta = e.clientY - drag.startY;
    drag.offset = Math.max(0, delta);
    dialog.style.translate = `0 ${drag.offset}px`;
    dialog.style.setProperty("--sheet-stretch", `${rubberBand(Math.max(0, -delta))}px`);
  }

  function onPointerUp(e: PointerEvent) {
    if (!dialog || drag?.pointerId !== e.pointerId) return;
    const { offset, startTime } = drag;
    drag = undefined;
    delete dialog.dataset.dragging;
    const velocity = offset / Math.max(1, performance.now() - startTime);
    if (offset > dialog.offsetHeight * DISMISS_DISTANCE_RATIO || velocity > DISMISS_VELOCITY) {
      close();
    } else {
      dialog.style.translate = "";
      dialog.style.removeProperty("--sheet-stretch");
    }
  }

  return (
    <dialog
      ref={(el) => (dialog = el)}
      aria-labelledby="sheet-title"
      class="sheet mx-auto mt-auto mb-0 w-full max-w-xl rounded-t-3xl bg-sand-2 px-5 pb-[calc(max(1.75rem,env(safe-area-inset-bottom))+var(--sheet-stretch,0px))] text-sand-12"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClose={() => {
        if (dialog) delete dialog.dataset.state;
        props.onClose();
      }}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const outside =
          e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom;
        if (outside) close();
      }}
    >
      <div
        aria-hidden="true"
        class="-mx-5 flex h-8 cursor-grab touch-none items-center justify-center select-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <span class="h-1 w-9 rounded-full bg-sand-7" />
      </div>
      <h2 id="sheet-title" class="mt-1 px-1 text-xl font-bold text-balance break-keep">
        {props.title}
      </h2>
      <p class="mt-1.5 px-1 font-medium text-balance break-keep text-sand-11">{props.description}</p>
      <div class="mt-6 flex flex-col gap-y-2">{props.children}</div>
    </dialog>
  );
}
