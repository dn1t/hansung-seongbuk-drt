import * as v from "valibot";

export default {
  server: {
    SESSION_SECRET: v.pipe(v.string(), v.minLength(32)),
  },
  client: {
    VITE_APP_NAME: v.optional(v.pipe(v.string(), v.minLength(1)), "Solid App"),
  },
};
