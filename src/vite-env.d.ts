/// <reference types="vite/client" />
/// <reference types="@solidjs/vite-plugin/boundary-modules" />
/// <reference types="../file-routes.d.ts" />
/// <reference types="../auto-imports.d.ts" />

declare module "~icons/*" {
  import type { ComponentProps, JSX } from "@solidjs/web";

  const component: (props: ComponentProps<"svg">) => JSX.Element;
  export default component;
}

declare module "virtual:icons/*" {
  import type { ComponentProps, JSX } from "@solidjs/web";

  const component: (props: ComponentProps<"svg">) => JSX.Element;
  export default component;
}
