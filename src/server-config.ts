import { createFlightDataCollector } from "@solidjs/router/server";
import { configureServerFunctionsServer } from "@solidjs/web/server-functions/server";

import { Router } from "./router";

configureServerFunctionsServer({
  collectFlightData: createFlightDataCollector(Router),
});
