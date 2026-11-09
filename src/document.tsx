import { HydrationScript } from "@solidjs/web";
import type { ParentProps } from "solid-js";
import env from "virtual:solid-env/client";

export default function Document(props: ParentProps) {
  return (
    <html lang="ko">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#fdfdfc" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#111110" />
        <link rel="icon" href="/favicon.ico" />
        <link href="/fonts.css" rel="stylesheet" />
        <title>{env.VITE_APP_NAME}</title>
        <HydrationScript />
      </head>
      <body>{props.children}</body>
    </html>
  );
}
