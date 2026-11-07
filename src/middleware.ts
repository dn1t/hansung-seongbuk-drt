import type { StartMiddleware } from "@solidjs/vite-plugin";
import { createAPIHandler } from "filesystem-routing/api";
import routes from "virtual:file-routes";

export default [createAPIHandler(routes)] satisfies StartMiddleware[];
