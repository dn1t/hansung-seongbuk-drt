// pnpm generate:colors
import { writeFileSync } from "node:fs";

import * as radix from "@radix-ui/colors";

type Palette = {
  [K in keyof typeof radix & string]: `${K}Dark` extends keyof typeof radix ? K : never;
}[keyof typeof radix & string];

const PALETTES: Palette[] = ["sand", "amber", "green", "red"];
const INCLUDE_ALPHA = false;
const OUT = new URL("../src/radix-colors.css", import.meta.url);

type Scale = Record<string, string>;
const scales = radix as unknown as Record<string, Scale>;

function steps(scale: Scale) {
  return Object.values(scale);
}

function lines(name: string, light: Scale, dark: Scale, suffix = "") {
  const l = steps(light);
  const d = steps(dark);
  return l.map((value, i) => `  --color-${name}-${suffix}${i + 1}: light-dark(${value}, ${d[i]});`);
}

const out = ["@theme {", "  --color-*: initial;", "  --color-black: #000;", "  --color-white: #fff;"];

if (INCLUDE_ALPHA)
  for (const name of ["black", "white"])
    steps(scales[`${name}A`]).forEach((value, i) => out.push(`  --color-${name}-a${i + 1}: ${value};`));

for (const name of PALETTES) {
  out.push("", ...lines(name, scales[name], scales[`${name}Dark`]));
  if (INCLUDE_ALPHA) out.push(...lines(name, scales[`${name}A`], scales[`${name}DarkA`], "a"));
}

out.push("}", "");
writeFileSync(OUT, out.join("\n"));

console.log(`wrote ${OUT.pathname} (${PALETTES.length} palettes)`);
