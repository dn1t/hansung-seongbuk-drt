import solid from "@solidjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { fileRoutes } from "filesystem-routing/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    solid({
      start: {
        middleware: "./src/middleware.ts",
        nodeServer: true,
      },
      ssr: true,
      diagnostics: true,
      serverFunctions: { serverSetup: "./src/server-config.ts" },
      extensions: [".jsx", ".tsx"],
    }),
    fileRoutes({ httpMethods: true, types: true }),
    tailwindcss(),
  ],
  server: { port: 3000 },
  build: {
    target: "esnext",
    assetsInlineLimit: 0,
  },
});
