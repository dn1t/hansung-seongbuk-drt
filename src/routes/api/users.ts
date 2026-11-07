import type { APIHandler } from "filesystem-routing/api";

import { listUsers } from "../../server/db";

export const GET: APIHandler = () => Response.json(listUsers());
