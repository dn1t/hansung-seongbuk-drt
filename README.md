# DRT

A late-night ride-home bus for Seongbuk-gu university students. Students book the nights and times they want to ride; each night's routes, buses, and timetable are built from those bookings. Signup doubles as the pre-service survey: the last step asks how often, when, and from where each student would ride, and the operator screens turn those answers into results and a simulated night of routes. See [PRODUCT.md](PRODUCT.md) for the product and [DESIGN.md](DESIGN.md) for the design system.

## Run it

```sh
pnpm install
cp .env.example .env   # then fill it in (see below)
pnpm migrate           # apply database migrations
pnpm dev               # http://localhost:3000
```

`pnpm dev` runs the server in Node. `ENV_FILE=.env.prod pnpm migrate` migrates the database in another env file.

Other scripts:

| Script            | What it does                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| `pnpm test`       | Unit tests for the route planner, night/slot times, the stop-file parser, and demo data                |
| `pnpm test:night` | A whole night against a throwaway SQLite file: plan, options, choosing a bus, departure moves          |
| `pnpm lint`       | oxlint with the Solid 2.0 rules                                                                        |
| `pnpm fmt`        | oxfmt                                                                                                  |
| `pnpm build`      | Production Node build; `pnpm serve` previews it and `pnpm start` runs the emitted server              |
| `pnpm build:deno` | Nitro `deno_server` build for Deno Deploy (`.output/`)                                                  |
| `pnpm serve:deno` | Run the Nitro Deno server locally after `pnpm build:deno`                                               |
| `pnpm deno:env`   | Upload the server and `VITE_` values from `.env` (or `--env <file>`) to Deno Deploy (see Deploy)       |
| `pnpm deno:deploy` | Upload the source to Deno Deploy, which installs, builds, and ships it to production                   |
| `pnpm seed:demo`  | Demo data for a local database (stops, tonight as an operating night, demo riders with survey answers) |
| `pnpm generate`   | Regenerate the auth schema and a migration after schema changes                                        |

## Environment

Required: `AUTH_SECRET`, `TURSO_CONNECTION_URL`, `TURSO_AUTH_TOKEN`, `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `KAKAO_REST_API_KEY`.

Optional:

| Variable            | Default                 | Use                                                                                                                                |
| ------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `BASE_URL`          | `http://localhost:3000` | The site's own address: auth, email links, and the signup link and QR on 가입 조사.                                                |
| `TRUSTED_ORIGINS`   | empty                   | Comma-separated extra origins allowed to call auth (wildcards like `http://192.168.*.*:3000` work).                                |
| `VITE_APP_NAME`     | `DRT`                   | App name in the UI and emails. Baked in at build time.                                                                             |
| `VITE_KAKAO_JS_KEY` | empty                   | Kakao Maps on bus detail (walk map and route map). Without it the maps are left out.                                               |
| `STAFF_CODE`        | empty                   | Shared code for /operator. Empty locks the operator screens.                                                                       |
| `ROUTE_TIMES`       | `estimate`              | `kakao` uses Kakao Mobility directions for bus times between stops.                                                                |
| `WALK_TIMES`        | `estimate`              | `tmap` uses SK TMAP pedestrian routes for walking times shown to students.                                                         |
| `TMAP_APP_KEY`      | empty                   | Needed when `WALK_TIMES=tmap`.                                                                                                     |
| `DEMO_TIME`         | empty                   | `01:00` runs the app as if it were 01:00 tonight; `2026-12-08 01:00` picks the night of Dec 8 (01:00 on Dec 9). For daytime demos. |

Every external lookup falls back to a distance estimate when its key is missing or the call fails.

## Deploy to Deno Deploy

The app uses Solid's official Nitro integration. Nitro's `deno_server` preset produces the complete server and static asset deployment in `.output/`.

How it fits together:

- `deno.json` tells Deno Deploy to install dependencies, run `NITRO_PRESET=deno_server pnpm build`, and start `.output/server/index.mjs`.
- `pnpm build:deno` uses Nitro's official Deno preset. Nitro serves `.output/public` and dispatches unmatched requests to Solid's Fetchable server handler.
- The server bundle uses the HTTP-only `@libsql/client/web`, so the server needs no native addon at runtime. The Turso URL must therefore be `libsql://` or `https://`, not `file:`.
- `deno deploy` uploads what git would track: `.env`, `.env.prod`, `dist`, and `node_modules` stay on your machine.

Steps:

1. Install Deno 2 (`brew install deno`). The first `deno deploy` command opens the browser to log in.
2. Migrate the production database: `ENV_FILE=.env.prod pnpm migrate`.
3. Create the app once: `deno deploy create`, choose local source, keep the build settings it detects from `deno.json`, and pick a region (`us` is closer to the Turso database in Asia than `eu`). The console shows the app's address. The CLI saves the org and app in `deno.json`, so later commands don't need `--org`/`--app`.
4. `pnpm deno:env --env .env.prod --url https://<address students will use>` uploads the server values and sets `BASE_URL` and `TRUSTED_ORIGINS` to that address. `VITE_` values go up as plain values because the build bakes them in; everything else is stored as a secret. `DEMO_TIME` is never uploaded.
5. `pnpm deno:deploy` uploads the source; Deno Deploy installs, builds, and starts it. Run it again after changing values in step 4, since `VITE_` values only change with a new build.
6. Add the address to the Kakao JavaScript key's web platform domains so the maps load. A custom domain is added on the organization's Domains page and assigned to the app; then repeat step 4 with that domain.

To try the Deno build locally, run `turso dev --db-file local.db --port 8090`, set `TURSO_CONNECTION_URL=http://127.0.0.1:8090`, then `pnpm build:deno && PORT=3200 pnpm serve:deno` with the other values in the environment.

Free plan limits to keep in mind: 10 CPU hours and 150 GiB-hours of memory a month. The app is counted at 768 MB for every second it stays loaded, so avoid anything that keeps it awake around the clock; routes are already fixed when a page is opened, not on a timer.

## Demo

Demo riders are flagged `users.demo` and every operator screen counts them apart from real students. They can also be made or cleared from /operator/survey without the script.

1. Point `TURSO_CONNECTION_URL` at a local file (`file:local.db`), run `pnpm migrate`, then `pnpm seed:demo`, and start the app with `pnpm dev`. When `DEMO_TIME` has a date, the seed fills that night. The seed refuses a remote database unless you pass `--remote`. `--night 2026-12-08` and `--riders 200` pick another night and size, and `--days 5` fills that many nights in a row (riders keep the same homes, about 85% ride each night); `--student` also creates a student you can log in as (`demo.student@hansung.ac.kr` / `drtdemo2026`, or `--email` / `--password`) with a booking tonight and booking emails turned off. `--clear` removes the demo riders and that student.
2. Sign up as a student (school email, code, name and password, home address, then the 이용 계획 survey) and book an upcoming night. Each slot's booking closes 1 hour before it leaves, and its routes are fixed the first time anyone opens the night after that; later slots stay a preview. To show a night's buses during the day, set `DEMO_TIME`.
3. Open /operator with `STAFF_CODE`:
   - 노선 shows the generated plan.
   - 탑승 확인 is the QR reader for a phone. It needs HTTPS for the camera.
   - 기사님 화면 shows drop-offs per stop.
   - 가입 조사 shows the signup survey, the signup link and QR, and the demo data controls.
   - 모의 노선 builds one night's routes from survey answers (real, demo, or both) with adjustable route settings, and 발표 화면으로 opens a full-screen slide view of it (arrow keys to move, `f` for full screen).

For running a night step by step (in Korean), see [docs/operator-guide.md](docs/operator-guide.md).

## Where things live

- `src/server/planner/`: the route planner (thin-slot folding, sweep grouping by home direction, rider trades and splits that weigh ride time against bus time, set-cover stops refined against bus detours, nearest neighbor + 2-opt, small-group merging, departure adjustment) and `fleet.ts`, which chains runs into vehicles when a bus can get back within 30 minutes. Pure TypeScript with tests.
- `src/server/plans.ts`: builds, stores, and loads each night's plan.
- `src/server/rides.ts`: what the student sees tonight, the bus options, and choosing a bus.
- `src/server/boarding.ts` and `src/server/qr-sign.ts`: checking a scanned QR and recording the boarding; `src/lib/boarding.ts` exposes them to the reader and driver screens.
- `src/lib/survey.ts`, `src/lib/survey-options.ts`, and `src/components/survey/survey-form.tsx`: the signup survey (questions and labels live in `survey-options.ts`), also editable at 내 정보 → 이용 계획.
- `src/server/research.ts` and `src/lib/research.ts`: survey results and routes built from survey answers. `src/server/demo-data.ts` generates the demo riders for both the seed script and the operator screen.
- `src/lib/operator.ts`: operator data entry, settings, plan view, and the booking-open email.

## Server functions

Every function with `"use server"` becomes a public HTTP endpoint, even when it isn't exported. Its ID is the function name plus a hash that is visible in the browser bundle. So:

- Put `"use server"` only on functions the client calls, and check the session (`requireUserId`) or staff cookie (`requireStaff`) first thing inside them.
- Leave it off internal helpers that run inside other server functions. Never put it on a helper that takes a user ID or returns other people's data.
