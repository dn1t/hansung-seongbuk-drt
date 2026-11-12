import solid from "@solidjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { fileRoutes } from "filesystem-routing/vite";
import { nitro } from "nitro/vite";
import autoImport from "unplugin-auto-import/vite";
import iconsResolver from "unplugin-icons/resolver";
import icons from "unplugin-icons/vite";
import { defineConfig } from "vite";

const target = process.env.NITRO_PRESET ? "nitro" : "node";

export default defineConfig({
  plugins: [
    solid({
      start: {
        middleware: "./src/middleware.ts",
        nodeServer: target === "node",
      },
      ssr: true,
      diagnostics: true,
      serverFunctions: { serverSetup: "./src/server-config.ts" },
      extensions: [".jsx", ".tsx"],
    }),
    target === "nitro" ? nitro({ serverEntry: false }) : [],
    fileRoutes({ httpMethods: true, types: true }),
    tailwindcss(),
    autoImport({
      resolvers: [
        iconsResolver({
          prefix: false,
          enabledCollections: ["ph"],
        }),
      ],
    }),
    icons({ compiler: "solid" }),
  ],
  server: { port: 3000 },
  nitro: target === "nitro" ? { preset: process.env.NITRO_PRESET } : undefined,
  build: {
    target: "esnext",
    assetsInlineLimit: 0,
  },
});
