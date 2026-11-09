import { createSignal, Repeat } from "solid-js";
import { cn } from "tailwind-variants";

interface OTPInputProps {
  length?: number;
  name?: string;
  class?: string;
  autofocus?: boolean;
  disabled?: boolean;
  onInput?: (value: string) => void;
  onComplete?: (value: string) => void;
}

export function OTPInput(props: OTPInputProps) {
  const length = () => props.length ?? 6;
  const [value, setValue] = createSignal("");
  const [focused, setFocused] = createSignal(false);

  function keepCaretAtEnd(el: HTMLInputElement) {
    const end = el.value.length;
    if (el.selectionStart !== end || el.selectionEnd !== end) el.setSelectionRange(end, end);
  }

  return (
    <div class={cn("relative flex w-full gap-x-3", props.class)}>
      <Repeat count={length()}>
        {(i) => (
          <div
            class={cn(
              "flex h-15 flex-1 items-center justify-center rounded-xl border border-sand-5 bg-sand-2 text-2xl font-semibold text-sand-12 tabular-nums transition-colors",
              focused() && i === Math.min(value().length, length() - 1) && "border-amber-8 ring-2 ring-amber-5",
              props.disabled && "opacity-50",
            )}
          >
            {value()[i] ??
              (focused() && i === value().length ? <span class="h-6 w-0.5 animate-pulse bg-amber-9" /> : "")}
          </div>
        )}
      </Repeat>
      <input
        type="text"
        name={props.name}
        inputmode="numeric"
        autocomplete="one-time-code"
        pattern={`\\d{${length()}}`}
        maxlength={length()}
        autofocus={props.autofocus}
        disabled={props.disabled}
        aria-label={`${length()}자리 인증 코드`}
        class="absolute inset-0 h-full w-full opacity-0"
        onFocus={(e) => {
          setFocused(true);
          keepCaretAtEnd(e.currentTarget);
        }}
        onBlur={() => setFocused(false)}
        onSelect={(e) => keepCaretAtEnd(e.currentTarget)}
        onInput={(e) => {
          const next = e.currentTarget.value.replace(/\D/g, "").slice(0, length());
          e.currentTarget.value = next;
          setValue(next);
          props.onInput?.(next);
          if (next.length === length()) props.onComplete?.(next);
        }}
      />
    </div>
  );
}
