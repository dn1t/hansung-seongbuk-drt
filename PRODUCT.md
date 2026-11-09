# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Students (primary).** Students at universities in Seongbuk-gu who stay late during exam and festival periods, on campus or in nearby nightlife areas, and need to get home after transit stops running. They use the app on their phones, often late at night and tired. The main moments are booking ahead, optionally picking tonight's bus, checking that bus's status, and showing their QR code when boarding.

Who can sign up: students with a verified school email from 고려대학교, 국민대학교, 동덕여자대학교, 서경대학교, 성신여자대학교, 한국예술종합학교, 한성대학교, 동방문화대학원대학교 (`src/lib/schools.ts`).

**Operator (secondary).** Data entry only, such as operating days and stops. The system builds routes, bus counts, timetables, and day-of dispatch changes automatically. The plan's demand map, route confirmation, dispatch, and live-status screens are **not** in scope.

**Driver.** One sample mockup page showing the route and the list of upcoming drop-off stops. It is not a working driver tool.

**QR reader (demo phone).** A web page opened on a demo phone that scans a student's QR code with the camera and shows "can board" or "not a student". It only has to work; its UI is not a priority.

## Product Purpose

DRT (demand-responsive transit) is a paid late-night ride-home bus for Seongbuk-gu university students, running only during exam and festival periods. It exists so students don't have to leave early to catch the last train or bus ("막차 때문에 먼저 일어나지 않아도 돼요").

Success means a student can book, see the bus they'll take, and board with little friction, then get off at a stop close to home.

## Positioning

The route doesn't exist until students book: each operating day's routes, bus counts, and timetable are built from the home locations and preferred times of the students who booked. The bus stops only where someone is getting off. Fixed-route night buses and taxis can't honestly claim either. The service is limited to verified students at a defined group of nearby schools.

## Operating Context

### Before the operating day

1. When a booking period opens, the system emails signed-up students. There is no web push.
2. Signup: school email → 6-digit email code (10-minute expiry) → name and password → home address. The student gets an app ID, and a personal QR code holds that ID.
3. Advance booking: the student picks the date(s) and time they want to ride. The home address saved at signup is the default and can be changed per booking.
4. The system fixes each date's routes, bus count, and timetable from the bookings. Routes never change on the day itself.

### On the operating day

1. Day-of request (optional): the student enters a starting point (a Seongbuk-gu university or a nearby nightlife area) and a boarding time range, then sees the stop and bus options. Each option shows its route and how many people are booked on it. The student also confirms the drop-off stop: the route stop nearest home is the default, and nearby stops are offered as alternatives.
2. The chosen bus appears as a card on the app's first screen, with details such as time until arrival. It shows only inside the app, never in phone notifications.
3. The system adjusts departure times only, based on day-of demand. Example: 20 riders at 2:00 and 5 at 2:30 → move the 2:30 bus earlier. Routes stay fixed.

### Boarding and the ride

1. The student scans their QR code at the bus reader. This checks that they're a student, records the boarding, and adds their drop-off stop to the driver's screen.
2. The bus follows its fixed route and stops only where riders are getting off.
3. Boarding records feed into future route planning.

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
- The QR code holds the student's app ID. It is used for student verification, the boarding record, and telling the driver the drop-off stop.
- Notifications are email only (booking period announcements). There is no web push. Bus status appears only inside the app.
- The home address is used only to build routes and pick stops. Drivers and other riders never see it (stated in the signup copy).

**Student screens (draft):** signup and student verification, advance booking (date, time, address), day-of request (starting point, time range), option comparison (time details per stop and bus), route detail (route, number of riders), chosen bus status, drop-off stop confirmation, my QR.

### Route generation (rule-based, written in TypeScript)

- Inputs: that date's bookings (home coordinates, preferred time), candidate stops (Seoul bus stop locations), and starting-point coordinates. Outputs: routes (stop order), buses per route, departure times, and travel time between stops.
- Steps: (1) split bookings into 30-minute slots; then, per slot: (2) group by direction with a sweep by angle from the starting point, starting a new group when bus capacity or maximum ride time is exceeded, so each group becomes a route; (3) choose drop-off stops by greedy set cover within the maximum walking distance; (4) order stops by nearest neighbor plus 2-opt; (5) set bus count by capacity, use the slot time as departure, merge groups below the minimum size into a neighbor, and compute and store travel times between stops once.
- Day-of dispatch: if a bus is over capacity and the next one is quiet, move the next bus's departure earlier.
- Baseline values are examples, not decided yet: max walk 10 minutes (about 700–800 m), capacity 25–30 seated, max ride time 60 minutes, 30-minute slots, minimum 10 riders per route.
- Walking time: for route generation, estimate it as straight-line distance × 1.3 ÷ 4.5 km/h with no API calls. For student-facing times, call the Kakao walking route API (1,000 free calls a day, then ₩10 per call).
- A VRP solver such as OR-Tools could replace steps 2–4 later, but it would need a separate Python server.

### Stack

- Solid 2.0 RC with pinned package versions, using its built-in start/server features through `@solidjs/vite-plugin` (not SolidStart). Also `@solidjs/router`, Better Auth (email OTP + email/password), Drizzle ORM on libSQL/Turso, Tailwind CSS 4, and Mailgun for email.
- Kakao is used for all map and place features: Map Web (JavaScript) SDK with the JavaScript key, Local API keyword search for starting points, Local API address-to-coordinates for home addresses, and the walking route API. Naver Directions is ruled out because it has no walking routes. The free Kakao quota covers only the first app activated per developer account, so the team shares one account and key.
- The browser camera for the QR reader only works over HTTPS.
- Mobile-first web app: content is held to a max width of `max-w-xl`, the document is `lang="ko"`, and the interface is Korean only.

**Built so far:** welcome, login, signup steps 1–4 plus a completion screen, password reset, and route protection. The home, booking, QR, and account tabs are placeholders.

### Open decisions

- Fare amount, payment method, and how payment is collected (the service is paid).
- Deadline for day-of requests.
- No-show handling.
- The list of boarding stops.
- Drop-off for students who board without a day-of request.
- What happens when a student's drop-off stop isn't on the route of the bus they boarded.
- What happens when a bus is over capacity, including riders who didn't request that day.
- Final route-generation baseline values.
- Which car-routing API (e.g. Kakao Mobility) provides travel time between stops.
- Whether Kakao's terms allow storing API results such as converted coordinates in the database. The code already stores `homeLat`/`homeLng`.

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
