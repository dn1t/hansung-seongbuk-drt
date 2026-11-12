# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Students (primary).** Students at universities in Seongbuk-gu who stay late during exam and festival periods, on campus or in nearby nightlife areas, and need to get home after transit stops running. They use the app on their phones, often late at night and tired. The main moments are booking ahead, optionally picking tonight's bus, checking that bus's status, and showing their QR code when boarding.

Who can sign up: students with a verified school email from 고려대학교, 국민대학교, 동덕여자대학교, 서경대학교, 성신여자대학교, 한국예술종합학교, 한성대학교, 동방문화대학원대학교 (`src/lib/schools.ts`).

**Operator (secondary).** Data entry, such as operating days and stops, plus sending the booking-open email. Before service starts, the operator also reads the signup survey (가입 조사) and presents routes built from it (모의 노선 and its full-screen 발표 화면) to the supervising professor. The system builds routes, bus counts, timetables, and day-of dispatch changes automatically; the operator can only look at the result (a read-only 노선 view) and rebuild a night before anyone has chosen or boarded a bus. A demand map, manual route editing, manual dispatch, and live bus tracking are **not** in scope.

**Driver.** One page (/operator/driver) showing a bus's route and how many boarded riders get off at each stop, refreshed every 10 seconds. It is a demo, not a real driver tool: there is no GPS, so the next stop comes from the timetable.

**QR reader (demo phone).** A web page (/operator/reader) opened on a demo phone that scans a student's QR code with the camera and shows "can board" or "not a student". It only has to work; its UI is not a priority.

## Product Purpose

DRT (demand-responsive transit) is a paid late-night ride-home bus for Seongbuk-gu university students, running only during exam and festival periods. It exists so students don't have to leave early to catch the last train or bus ("막차 때문에 먼저 일어나지 않아도 돼요").

Success means a student can book, see the bus they'll take, and board with little friction, then get off at a stop close to home.

## Positioning

The route doesn't exist until students book: each operating day's routes, bus counts, and timetable are built from the home locations and preferred times of the students who booked. The bus stops only where someone is getting off. Fixed-route night buses and taxis can't honestly claim either. The service is limited to verified students at a defined group of nearby schools.

## Operating Context

### Before the operating day

1. When a booking period opens, the system emails signed-up students. There is no web push.
2. Signup: school email (with consent to collecting and using personal data) → 6-digit email code (10-minute expiry) → name and password → home address → 이용 계획 survey. The student gets an app ID, and a personal QR code holds that ID.
3. The 이용 계획 survey replaces the earlier Google Forms pre-survey: how often they would ride in exam and festival periods, the 30-minute slot they usually head home, where they usually start (their school by default, or a nightlife area), how they get home after the last train today, the most they would pay per ride, and an optional comment. Answers live in `surveys`, can be changed in 내 정보 → 이용 계획, and a signed-up student who hasn't answered is asked once on their next visit.
4. Advance booking: the student picks the date(s) and time they want to ride. The home address saved at signup is the default and can be changed per booking. Booking and changes (date, time, address) stay open until 1 hour before the chosen slot leaves; cancelling stays open after that. The time picker shows each slot's current route count on the chosen nights (the busiest chosen night when several are picked); a slot with no route yet reads 노선 없음 and can still be chosen, since routes only appear once students book.
5. The system fixes routes slot by slot: each 30-minute slot's routes, buses, and timetable are fixed 1 hour before it leaves, from the bookings made by then. Later slots stay a preview that follows new bookings. Students see every slot's routes (fixed or preview) on 사전 신청 → 시간대별 노선, with each route folding open to show all its stops. A fixed route never changes; only departure times move.

### On the operating day

1. Day-of request (optional): the student enters a starting point (a Seongbuk-gu university or a nearby nightlife area) and a boarding time range, then sees the stop and bus options. Each option shows its route and how many people are booked on it. The student also confirms the drop-off stop: the route stop nearest home is the default, and nearby stops are offered as alternatives.
2. The chosen bus appears as a card on the app's first screen, with details such as time until arrival. It shows only inside the app, never in phone notifications.
3. The system adjusts departure times only, based on day-of demand. Example: 20 riders at 2:00 and 5 at 2:30 → move the 2:30 bus earlier. Routes stay fixed.
4. Once a student's slot is fixed, 오늘 귀가 lists the routes near home with a 노선 선택 button. Picking one shows the route detail: with location permission, the nearest boarding stop, the walk to it, the wait, the ride, and the walk home. Before the slot is fixed, the screen says when it will be and links to the preview.

### Boarding and the ride

1. The student scans their QR code at the bus reader. This checks that they're a student, records the boarding, and adds their drop-off stop to the driver's screen.
2. The bus follows its fixed route and stops only where riders are getting off. Once boarding is over (2 minutes after the last pickup, with every boarded rider's drop-off known), drop-off stops that no boarded rider uses are marked "지나쳐요" on the driver screen and skipped. When exactly a no-show counts as final, and finer route trimming, are still to be decided.
3. Boarding records feed into future route planning. As built, they give each upcoming night an expected rider count on the 노선 view (each booked student's show-up rate over the last 30 days, counted as 1 with fewer than 3 planned nights), and they drive the optional no-show limit. Routes themselves are still planned for every booking.

### Main navigation

Bottom tab bar: 오늘 귀가 (tonight's ride), 사전 신청 (advance booking), 내 QR (my QR), 내 정보 (my account).

## Capabilities and Constraints

### Confirmed rules

- Only students who finished verification can ride.
- Starting points must be universities in Seongbuk-gu or major nightlife areas nearby.
- Routes are fixed per date from advance bookings and never change in real time. Only departure times are adjusted on the day.
- Buses stop only at stops with a rider getting off.
- Drop-off stop: the route stop nearest home is the default, nearby stops are offered as options, and the student confirms it in the day-of request.
- Time is shown as four separate values: walk to the boarding stop, time until the bus arrives, ride time, and walk from the drop-off stop to home.
- The day-of request is optional. A student can board with just their QR code; how drop-off is handled in that case is still open.
- The QR code holds the student's app ID, signed with a one-minute time window so a screenshot stops working after 10 minutes (`D1.<id>.<window>.<signature>`). It is used for student verification, the boarding record, and telling the driver the drop-off stop. Staff can still type a bare ID into the reader by hand.
- Notifications are email only (booking period announcements, sent from 운행일 by the operator; students can turn them off in 내 정보). There is no web push. Bus status appears only inside the app.
- The home address is used only to build routes and pick stops. Drivers and other riders never see it (stated in the signup copy).

**Student screens (draft):** signup and student verification, advance booking (date, time, address), day-of request (starting point, time range), option comparison (time details per stop and bus), route detail (route, number of riders), chosen bus status, drop-off stop confirmation, my QR.

### Route generation (rule-based, written in TypeScript)

- Inputs: that date's bookings (home coordinates, preferred time), candidate stops (Seoul bus stop locations), and starting-point coordinates. Outputs: routes (stop order), buses per route, departure times, and travel time between stops.
- Steps: (1) split bookings into 30-minute slots; then, per slot: (2) group by direction with a sweep by angle from the starting point, starting a new group when bus capacity or maximum ride time is exceeded, so each group becomes a route; (3) choose drop-off stops by greedy set cover within the maximum walking distance; (4) order stops by nearest neighbor plus 2-opt; (5) set bus count by capacity, use the slot time as departure, merge groups below the minimum size into a neighbor, and compute and store travel times between stops once.
- Day-of dispatch: if a bus is over capacity and the next one is quiet, move the next bus's departure earlier.
- Baseline values are examples, not decided yet: max walk 10 minutes (about 700–800 m), capacity 25–30 seated, max ride time 60 minutes, 30-minute slots, minimum 10 riders per route.
- Walking time: for route generation, estimate it as straight-line distance × 1.3 ÷ 4.5 km/h with no API calls. For student-facing times, call the Kakao walking route API (1,000 free calls a day, then ₩10 per call).
- A VRP solver such as OR-Tools could replace steps 2–4 later, but it would need a separate Python server.

**As built** (`src/server/planner/`; unit tests with `pnpm test`, a whole-night integration test with `pnpm test:night`):

- Values in use: capacity 28, max walk 700 m straight-line (about 12 minutes), max ride 60 minutes, minimum 10 riders, 30-minute slots, bus speed 36 km/h × 1.35 road detour plus 1 minute per stop. The operator sets the service window and the first four values at /operator/settings (stored in `app_settings`); the rest sit in `settings.ts`. Each night's plan saves the values it was built with.
- Advance bookings have no starting point, so the planner assumes each student starts from their own school (from the email domain). A school's boarding stop is the nearest candidate stop within 400 m, or the campus itself ("○○대학교 앞").
- Steps, as built: (1) riders are split into their 30-minute slots, and a thin slot (no more than one busload) is folded into the next one when that saves more than 10 minutes per shifted rider (운행 설정 → 한산한 시간대는 다음 시간대와 합치기, on by default). (2) Within a slot, riders are swept by home direction from the center of the night's boarding stops and cut into a new run when capacity or maximum ride time is exceeded. (3) Runs of the same slot then trade riders, split off a direction or a campus into a new run, or merge, whenever that lowers a cost that counts each run's driving time, its drive back toward the campuses, a fixed cost per run, and half a minute for every minute a student sits on the bus. That last term is what stops one run from looping through two directions just because the 60-minute limit allows it. A run never drops below the minimum (4 by default). (4) Drop-off stops come from a greedy set cover over candidate stops; a stop moves or is dropped when that saves more bus time than it adds walking (4 walking minutes per bus minute, never past the walking limit). Everyone boards first, then stops are ordered by nearest neighbor plus 2-opt from the last pickup. (5) Runs are chained into vehicles: a bus that finishes a run takes a later run when it can drive empty to that run's first stop in 30 minutes or less and still arrive 5 minutes before it leaves (maximum bipartite matching, so the night uses as few buses as the timetable allows). The planner also tries fuller runs in busy slots when that lowers the vehicle count by enough (each vehicle counts as 240 minutes).
- 운행 설정 → 노선을 만들 때 먼저 볼 것 picks the trade-off: 학생 먼저 (no vehicle pressure), 균형 (default), 버스 대수 먼저 (ride time weighted at 0.15). Measured on demo data, 160/300/500 riders, against the earlier planner: 균형 cuts the average ride from 32/29/31 to 23/19/20 minutes (a direct trip would be about 12) and riders more than twice a direct trip from 71%/59%/70% to 29%/22%/21%, with 7/10/12 buses instead of 5/8/10 doing 21/36/46 runs; nobody waits a slot later at 300 and 500 riders. 학생 먼저 needs 10/13/17 buses for 22/18/18-minute rides; 버스 대수 먼저 needs 6/8/10 for 28/25/27.
- Bus names come from the district of the last stop (노원행; 노원행 1 and 2 when one slot has two). When a stop's address has no district, the nearest district office decides.
- Routes are fixed per slot. Each slot closes 1 hour before it leaves; the first request after that plans the not-yet-seated bookings of every closed slot plus the next slot (so a thin slot can still fold into it), stores the buses of the closed slots in `buses`, `bus_stops`, and `bus_riders`, and records how far the night is fixed in `plans.frozen_until`. Riders folded into the next slot are seated when that slot closes. The preview of the open slots is stored per night in `plan_previews` with a fingerprint of its inputs (unseated bookings, settings, how far the night is fixed, candidate stops). Screens read the stored preview and plan again only when the fingerprint changes; booking, change, cancel, and demo writes also start that recompute in the background. A stored read costs about 2 ms of CPU, a recompute 30–250 ms for 40–100 riders. The 노선 view and 시간대별 노선 show fixed buses together with a preview of the open slots. The operator can rebuild the fixed part until someone chooses or boards a bus.
- Day-of dispatch: after every day-of choice or cancellation, a bus moves up to 15 minutes earlier when the same-direction bus in the previous slot is at least 70% full and it is at most 30% full. It stays at least 10 minutes behind that bus and never moves within 30 minutes of departure. If demand evens out, it goes back to the planned time.
- Day-of options: a bus is offered when one of its boarding stops is within 800 m of the chosen starting point and one of its drop-off stops is within 1 km of the booked address.
- Bus travel time between stops: the distance estimate, or real road times from the Kakao Mobility directions API when `ROUTE_TIMES=kakao` (fetched once per stop pair when a plan is stored, cached in `travel_times`, and falling back to the estimate on any error).
- Walking times shown to students: the distance estimate, or SK TMAP pedestrian routes when `WALK_TIMES=tmap` and `TMAP_APP_KEY` are set. Kakao has no public walking-route API. Each rider's drop-off-to-home walk is fetched in the background when a plan is stored and cached in `travel_times`; anything not cached yet uses the estimate.
- 모의 노선 runs the same planner on survey answers instead of bookings: each respondent's home, survey slot (moved to the nearest slot in the service window), and chosen start. "모두 탄다면" uses every respondent; "답한 횟수만큼" keeps each one with a fixed per-person chance by answer (4일 이상 0.9, 2–3일 0.5, 1일 0.2, 거의 안 탐 0.1), so a run is repeatable. Route settings can be changed for the run without touching 운행 설정. Nothing is stored.
- Demo data: generated riders (`demo-rider-NNN`, `users.demo = 1`, address "예시 주소") with survey answers, made or cleared from 가입 조사 or by `pnpm seed:demo`. 운행일 → 데모 신청 adds demo bookings to a real operating night (only slots still open, weighted toward the busy hours) so routes and dispatch include them, and clears them per night. Removing demo riders or their bookings rebuilds a night's plan only when no one has chosen or boarded a bus that night; otherwise the fixed routes stay. Every count shows real and demo apart, demo riders never get email, and the 발표 화면 marks slides that include them.
- `DEMO_TIME` (for example `01:00`, or `2026-12-08 01:00` for another night, the date being the operating night) runs the app as if it were that moment, for daytime demos. `pnpm seed:demo` fills a local database with stops, tonight as an operating night, and 160 sample riders; it refuses a remote database unless given `--remote`.

### Stack

- Solid 2.0 RC with pinned package versions, using its built-in start/server features through `@solidjs/vite-plugin` (not SolidStart). Also `@solidjs/router`, Better Auth (email OTP + email/password), Drizzle ORM on libSQL/Turso, Tailwind CSS 4, and Mailgun for email.
- Deployed on Deno Deploy through Solid's official Nitro integration (`NITRO_PRESET=deno_server`). Email goes through the Mailgun HTTP API with `fetch`; background work after a response (warming walk times) is started without blocking the response.
- Kakao is used for map and place features: Map Web (JavaScript) SDK with the JavaScript key (walk map and route map), Local API keyword search for stops and starting points, Local API address-to-coordinates for home addresses, and optionally the Kakao Mobility directions API for bus travel times. Walking routes come from SK TMAP, since Kakao has no public walking API. Naver Directions is ruled out because it has no walking routes. The free Kakao quota covers only the first app activated per developer account, so the team shares one account and key.
- The browser camera for the QR reader only works over HTTPS.
- Mobile-first web app: content is held to a max width of `max-w-xl`, the document is `lang="ko"`, and the interface is Korean only.

**Built so far:** welcome, login, signup steps 1–5 (the fifth is the 이용 계획 survey) plus a completion screen, password reset, and route protection. All four tabs: 오늘 귀가 on the real nightly plan, with the optional day-of request (choices in `ride_choices`, full buses can't be chosen, a missed bus shows its own state, bus detail has a route map), 사전 신청 (bookings on operating nights within the operator's service window; each slot closes 1 hour before it leaves, after which time and address are locked but cancelling still works; 시간대별 노선 shows each slot's routes, and each booking's page shows its current route in brief: fixed or preview, where to board and get off, the walk home, and a note when a thin slot was merged into the next bus), 내 QR (rotating signed code), and 내 정보 (with 탑승 기록, the last 30 boardings). At /operator, behind a shared `STAFF_CODE`: operating nights with the booking-open email, candidate stops (search, or bulk import of the Seoul open-data bus stop file, xlsx or CSV, leaving out median-lane stops and river ferry docks), starting areas (`start_areas`), the 노선 view (fixed and preview runs per slot, past nights with boarding rate, CSV dispatch sheet), the QR reader, the driver screen (skips drop-off stops no boarded rider uses), and 운행 설정. Boarding records are stored in `boardings` and switch the student's home tab to riding. After login or signup the app asks for location permission; the starting-point list then marks and sorts by the nearest place, computed on the phone. The app has a web manifest and icons so it can be added to the home screen. No sample data is left in the student app. The welcome screen and the top of 오늘 귀가 say that this is a demo, not a running service. Also at /operator: 가입 조사 (survey results by school, district, slot, frequency, start, current way home, and fare; daily answers; comments; an anonymized CSV; the signup link and QR; demo data controls), 모의 노선, and 발표 화면 (a seven-slide view for presenting).

### Open decisions

- Fare amount, payment method, and how payment is collected (the service is paid).
- Deadline for day-of requests. For now it is an operator setting (운행 설정, default: up to 5 minutes before the bus reaches the student's boarding stop).
- No-show handling. For now it is an operator setting, off by default (운행 설정 → 안 탄 날 제한): N or more booked-but-not-boarded planned nights in the last 30 days blocks new bookings, with the reason shown on 사전 신청.
- The list of boarding stops. For now each school boards at the nearest operator stop within 400 m, or at the campus itself; nightlife areas board at whichever bus pickup is within 800 m.
- Drop-off for students who board without a day-of request. For now the reader uses the stop the plan gave them on that bus, or the bus's stop nearest their booked or home address.
- What happens when a student's drop-off stop isn't on the route of the bus they boarded. For now the reader picks that bus's stop nearest the student's booked (or home) address, and the driver screen counts it there.
- What happens when a bus is over capacity, including riders who didn't request that day. For now a full bus can't be chosen in the day-of request, and the reader still lets a student on but shows that the bus is over capacity.
- Final route-generation baseline values. For now the operator sets capacity, max walk, max ride, minimum riders, and the service window in 운행 설정.
- Which car-routing API provides travel time between stops. Kakao Mobility directions is wired in behind `ROUTE_TIMES=kakao`, but the request and response fields are not yet confirmed against a live key.
- Whether Kakao's terms allow storing API results such as converted coordinates in the database. The code already stores `homeLat`/`homeLng`, and `travel_times` caches Kakao Mobility and TMAP results when those are turned on; check both providers' terms before turning them on in production.

**Terms:** 오늘 귀가, 사전 신청, 당일 신청, 하차 정류장, 승차 정류장, 노선, 배차, 기사님, 내 QR, 학교 이메일, 인증 코드.

## Brand Commitments

- Name: **DRT** (`VITE_APP_NAME`). Descriptor: "성북구 대학생 전용 심야 귀가 버스".
- Voice: warm, plain Korean in 해요체. Short sentences, written from the student's side ("~해 주세요", "~했어요"). Error messages say what happened and what to do next. Drivers are called 기사님.
- Existing assets: transactional email templates (`src/server/emails/`) and the favicon (`public/favicon.ico`).
- The user's planning draft (기획서 §6, 2026-11-08) has draft UI rules: Radix Amber/Sand, dark mode as default for night use, Pretendard Variable, and set radius and type scales. These are visual decisions, so they belong in DESIGN.md. They will be reconciled with the code there, not here.

## Evidence on Hand

- This is a class/capstone project, built as a working web app for a demo. There is no real operating history, ridership, schedule, partner, testimonial, or press coverage. Future work must not invent operating stats, partner institutions (schools, the district office, or bus companies), fares, or user quotes.
- Real facts that can be used: the list of eligible schools, the ride flow and rules above, and the address-privacy promise.
- Source: the user's planning draft "심야 귀가 버스 웹앱 기획서" (2026-11-08). It is not stored in the repo.

## Product Principles

1. **Build around the late-night moment.** Each screen should work for a tired student on a phone in one quick glance: which bus, how long until it arrives, where to get off, the QR code.
2. **Booking creates the route.** Explain the demand-built route clearly, and never present it as a fixed timetable. On the day, only departure times move.
3. **Privacy is part of the promise.** The home address is only for building routes. Keep that limit visible and never weaken it.
4. **Students only, with low friction.** Verifying school email is the gate. Everything after it, including the optional day-of request, should be as light as possible.
5. **Honest for a demo.** Show only real rules and flows. Use clearly labeled sample data for operating data that doesn't exist yet. Demo-only parts (the driver mockup, the QR reader) only need to work.
