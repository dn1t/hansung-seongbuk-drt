# DRT

A late-night ride-home bus for Seongbuk-gu university students. Students book the nights and times they want to ride; each night's routes, buses, and timetable are built from those bookings. See [PRODUCT.md](PRODUCT.md) for the product and [DESIGN.md](DESIGN.md) for the design system.

## Run it

```sh
pnpm install
cp .env.example .env   # then fill it in (see below)
pnpm migrate           # apply database migrations
pnpm dev               # http://localhost:3000
```

Other scripts:

| Script            | What it does                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------- |
| `pnpm test`       | Unit tests for the route planner, night/slot times, and the stop-file parser                  |
| `pnpm test:night` | A whole night against a throwaway SQLite file: plan, options, choosing a bus, departure moves |
| `pnpm lint`       | oxlint with the Solid 2.0 rules                                                               |
| `pnpm fmt`        | oxfmt                                                                                         |
| `pnpm build`      | Production build; `pnpm start` serves it                                                      |
| `pnpm seed:demo`  | Demo data for a local database (stops, tonight as an operating night, demo riders with survey answers) |
| `pnpm generate`   | Regenerate the auth schema and a migration after schema changes                               |

## Environment

Required: `AUTH_SECRET`, `TURSO_CONNECTION_URL`, `TURSO_AUTH_TOKEN`, `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `KAKAO_REST_API_KEY`.

Optional:

| Variable            | Default    | Use                                                                                  |
| ------------------- | ---------- | ------------------------------------------------------------------------------------ |
| `VITE_KAKAO_JS_KEY` | empty      | Kakao Maps on bus detail (walk map and route map). Without it the maps are left out. |
| `STAFF_CODE`        | empty      | Shared code for /operator. Empty locks the operator screens.                         |
| `ROUTE_TIMES`       | `estimate` | `kakao` uses Kakao Mobility directions for bus times between stops.                  |
| `WALK_TIMES`        | `estimate` | `tmap` uses SK TMAP pedestrian routes for walking times shown to students.           |
| `TMAP_APP_KEY`      | empty      | Needed when `WALK_TIMES=tmap`.                                                       |
| `DEMO_TIME`         | empty      | `01:00` runs the app as if it were 01:00 tonight; `2026-12-08 01:00` picks the night of Dec 8 (01:00 on Dec 9). For daytime demos. |

Every external lookup falls back to a distance estimate when its key is missing or the call fails.

## Deploy to Cloudflare Workers

The app runs on Workers through `@cloudflare/vite-plugin` (`wrangler.jsonc`). `pnpm dev` and `pnpm serve` run the server in workerd locally; tests set `NODE_SSR=1` to keep it in Node. `pnpm start` still serves the same build on Node.

1. `npx wrangler login`
2. `pnpm cf:secrets` (add `--env .env.prod` for another file) uploads the server values as Worker secrets, creating the Worker if it doesn't exist yet. Cloudflare starts the code once on upload, and the server refuses to start without them, so they go first. `DEMO_TIME` is always left empty.
3. `pnpm cf:deploy` builds and deploys, then prints the `*.workers.dev` address. `VITE_` values (app name, Kakao map key) are baked in at build time from `.env`.
4. `pnpm cf:secrets --url https://<that address>` again, which sets `BASE_URL` and `TRUSTED_ORIGINS` to it. Secrets apply without a rebuild.
5. Run `pnpm migrate` against the production database (`ENV_FILE=.env.prod pnpm migrate`), and add the address to the Kakao JavaScript key's web platform domains so the maps load.

Login hashes passwords with scrypt and route planning takes tens of milliseconds, both over the Workers Free plan's 10 ms CPU limit, so use the Workers Paid plan.

## Demo

Demo riders are flagged `users.demo` and every operator screen counts them apart from real students. They can also be made or cleared from /operator/survey without the script.

1. Point `TURSO_CONNECTION_URL` at a local file (`file:local.db`), run `pnpm migrate`, then `pnpm seed:demo`. When `DEMO_TIME` has a date, the seed fills that night. The seed refuses a remote database unless you pass `--remote`. `--night 2026-12-08` and `--riders 200` pick another night and size, and `--days 5` fills that many nights in a row (riders keep the same homes, about 85% ride each night); `--student` also creates a student you can log in as (`demo.student@hansung.ac.kr` / `drtdemo2026`, or `--email` / `--password`) with a booking tonight and booking emails turned off. `--clear` removes the demo riders and that student.
2. Sign up as a student and book an upcoming night. Booking closes at midnight before each night, and the night's plan is fixed the first time anyone opens it after that. To show a night's buses during the day, set `DEMO_TIME`.
3. Open /operator with `STAFF_CODE`:
   - 노선 shows the generated plan.
   - 탑승 확인 is the QR reader for a phone. It needs HTTPS for the camera.
   - 기사님 화면 shows drop-offs per stop.
   - 가입 조사 shows the signup survey, the signup link and QR, and the demo data controls.
   - 모의 노선 builds one night's routes from survey answers (real, demo, or both) with adjustable route settings, and 발표 화면으로 opens a full-screen slide view of it (arrow keys to move, `f` for full screen).

For running a night step by step (in Korean), see [docs/operator-guide.md](docs/operator-guide.md).

## Where things live

- `src/server/planner/`: the route planner (sweep grouping, set-cover stops, nearest neighbor + 2-opt, small-group merging, departure adjustment). Pure TypeScript with tests.
- `src/server/plans.ts`: builds, stores, and loads each night's plan.
- `src/server/rides.ts`: what the student sees tonight, the bus options, and choosing a bus.
- `src/server/boarding.ts` and `src/server/qr-sign.ts`: checking a scanned QR and recording the boarding; `src/lib/boarding.ts` exposes them to the reader and driver screens.
- `src/server/research.ts` and `src/lib/research.ts`: survey results and routes built from survey answers. `src/server/demo-data.ts` generates the demo riders for both the seed script and the operator screen.
- `src/lib/operator.ts`: operator data entry, settings, plan view, and the booking-open email.

## Server functions

Every function with `"use server"` becomes a public HTTP endpoint, even when it isn't exported. Its ID is the function name plus a hash that is visible in the browser bundle. So:

- Put `"use server"` only on functions the client calls, and check the session (`requireUserId`) or staff cookie (`requireStaff`) first thing inside them.
- Leave it off internal helpers that run inside other server functions. Never put it on a helper that takes a user ID or returns other people's data.
