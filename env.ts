import * as v from "valibot";

export default {
  server: {
    AUTH_SECRET: v.pipe(v.string(), v.minLength(32)),
    BASE_URL: v.optional(v.pipe(v.string(), v.minLength(1)), "http://localhost:3000"),
    TRUSTED_ORIGINS: v.optional(v.string(), ""),
    TURSO_CONNECTION_URL: v.pipe(v.string(), v.minLength(1)),
    TURSO_AUTH_TOKEN: v.pipe(v.string(), v.minLength(1)),
    MAILGUN_API_KEY: v.pipe(v.string(), v.minLength(1)),
    MAILGUN_DOMAIN: v.pipe(v.string(), v.minLength(1)),
    KAKAO_REST_API_KEY: v.pipe(v.string(), v.minLength(1)),
    STAFF_CODE: v.optional(v.string(), ""),
    ROUTE_TIMES: v.optional(v.picklist(["estimate", "kakao"]), "estimate"),
    WALK_TIMES: v.optional(v.picklist(["estimate", "tmap"]), "estimate"),
    TMAP_APP_KEY: v.optional(v.string(), ""),
    DEMO_TIME: v.optional(v.pipe(v.string(), v.regex(/^(|(\d{4}-\d{2}-\d{2}[ T])?([01]\d|2[0-3]):[0-5]\d)$/)), ""),
  },
  client: {
    VITE_APP_NAME: v.optional(v.pipe(v.string(), v.minLength(1)), "DRT"),
    VITE_KAKAO_JS_KEY: v.optional(v.string(), ""),
  },
};
