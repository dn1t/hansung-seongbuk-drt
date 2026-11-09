import { defineRelationsPart } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";
import env from "./server-env";

export const db = drizzle({
  connection: {
    url: env.TURSO_CONNECTION_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  },
  relations: { ...defineRelationsPart(schema), ...schema.authRelations },
});
