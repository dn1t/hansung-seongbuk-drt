import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { betterAuth } from "better-auth";

import { db } from "./db";
import * as schema from "./schema";
import env from "./server-env";

export const auth = betterAuth({
  secret: env.AUTH_SECRET,
  baseURL: env.BASE_URL,
  database: drizzleAdapter(db, { provider: "sqlite", schema, usePlural: true }),
  advanced: { database: { joins: true } },
  emailAndPassword: {
    enabled: true,
  },
});
