import type { StartMiddleware } from "@solidjs/vite-plugin";
import { createAPIHandler } from "filesystem-routing/api";
import routes from "virtual:file-routes";

import { syncPresentation } from "./server/presentation";

const presentationClock: StartMiddleware = async (_event, next) => {
  await syncPresentation().catch((err) => console.error("syncPresentation:", err));
  return next();
};

export default [presentationClock, createAPIHandler(routes)] satisfies StartMiddleware[];
