import { For } from "solid-js";
import { cn } from "tailwind-variants";

export function TimeLegs(props: {
  walkToStop: number;
  wait: number;
  ride: number;
  walkHome: number;
  class?: string;
  inset?: "pl-3" | "pl-4" | "pl-5";
}) {
  const legs = () => [
    { label: "정류장까지", minutes: props.walkToStop },
    { label: "기다림", minutes: props.wait },
    { label: "타고 가요", minutes: props.ride },
    { label: "집까지", minutes: props.walkHome },
  ];

  return (
    <dl class={cn("grid grid-cols-4", props.class)}>
      <For each={legs()}>
        {(leg, i) => (
          <div
            class={cn(
              "flex flex-col gap-y-0.5 py-3",
              i() > 0 ? "border-l border-sand-4 pl-3" : (props.inset ?? "pl-3"),
            )}
          >
            <dt class="text-xs font-medium break-keep text-sand-11">{leg.label}</dt>
            <dd class="font-bold whitespace-nowrap tabular-nums">{leg.minutes}분</dd>
          </div>
        )}
      </For>
    </dl>
  );
}
