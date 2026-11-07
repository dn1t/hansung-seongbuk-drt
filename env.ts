import * as v from "valibot";

export default {
  server: {
    AUTH_SECRET: v.pipe(v.string(), v.minLength(32)),
    BASE_URL: v.optional(v.pipe(v.string(), v.minLength(1)), "http://localhost:3000"),
    TURSO_CONNECTION_URL: v.pipe(v.string(), v.minLength(1)),
    TURSO_AUTH_TOKEN: v.pipe(v.string(), v.minLength(1)),
  },
  client: {
    VITE_APP_NAME: v.optional(v.pipe(v.string(), v.minLength(1)), "DRT"),
  },
};
