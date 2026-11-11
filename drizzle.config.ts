import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: process.env.ENV_FILE ?? ".env", override: Boolean(process.env.ENV_FILE), quiet: true });

export default defineConfig({
  schema: ["./src/lib/schema.ts", "./src/lib/app-schema.ts"],
  out: "./migrations",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_CONNECTION_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
});
