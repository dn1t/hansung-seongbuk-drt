import { createMemo } from "solid-js";
import { encode } from "uqr";

export function QRCode(props: { value: string; class?: string; label: string }) {
  const code = createMemo(() => encode(props.value, { ecc: "M", border: 0 }));
  const path = () =>
    code()
      .data.flatMap((row, y) => row.map((on, x) => (on ? `M${x} ${y}h1v1h-1z` : "")))
      .join("");

  return (
    <svg
      role="img"
      aria-label={props.label}
      viewBox={`0 0 ${code().size} ${code().size}`}
      shape-rendering="crispEdges"
      class={props.class}
    >
      <path d={path()} fill="#21201c" />
    </svg>
  );
}
