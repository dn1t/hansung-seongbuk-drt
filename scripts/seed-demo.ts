import { createClient } from "@libsql/client";

import {
  DEMO_ADDRESS,
  DEMO_EMAIL_PREFIX,
  DEMO_SLOT_WEIGHTS,
  DEMO_SLOTS,
  demoRiders,
  demoSurveys,
  random,
  weighted,
} from "../src/server/demo-data.ts";

const STOPS: [name: string, address: string, lat: number, lng: number][] = [
  ["한성대입구역", "서울 성북구 동소문동", 37.5884, 127.0062],
  ["성신여대입구역", "서울 성북구 동선동", 37.5926, 127.0164],
  ["보문역", "서울 성북구 보문동", 37.5853, 127.0193],
  ["안암역", "서울 성북구 안암동", 37.5863, 127.0291],
  ["고려대역", "서울 성북구 종암동", 37.5904, 127.0358],
  ["종암동 주민센터", "서울 성북구 종암동", 37.602, 127.033],
  ["월곡역", "서울 성북구 하월곡동", 37.6019, 127.0415],
  ["상월곡역", "서울 성북구 상월곡동", 37.6062, 127.0481],
  ["돌곶이역", "서울 성북구 석관동", 37.6103, 127.0565],
  ["장위시장", "서울 성북구 장위동", 37.613, 127.052],
  ["석계역", "서울 성북구 석관동", 37.615, 127.0657],
  ["길음역", "서울 성북구 길음동", 37.6034, 127.0251],
  ["정릉역", "서울 성북구 정릉동", 37.6029, 127.0137],
  ["미아사거리역", "서울 강북구 미아동", 37.6131, 127.03],
  ["미아역", "서울 강북구 미아동", 37.6265, 127.026],
  ["수유역", "서울 강북구 수유동", 37.638, 127.0257],
  ["삼양사거리역", "서울 강북구 미아동", 37.627, 127.0178],
  ["번동 사거리", "서울 강북구 번동", 37.63, 127.041],
  ["월계역", "서울 노원구 월계동", 37.6331, 127.0587],
  ["광운대역", "서울 노원구 월계동", 37.6236, 127.0614],
  ["노원역", "서울 노원구 상계동", 37.6553, 127.0613],
  ["상계역", "서울 노원구 상계동", 37.6609, 127.0738],
  ["중계역", "서울 노원구 중계동", 37.6448, 127.0645],
  ["하계역", "서울 노원구 하계동", 37.6366, 127.0681],
  ["공릉역", "서울 노원구 공릉동", 37.6256, 127.0729],
  ["태릉입구역", "서울 노원구 공릉동", 37.6179, 127.0752],
  ["창동역", "서울 도봉구 창동", 37.6531, 127.0477],
  ["쌍문역", "서울 도봉구 쌍문동", 37.6486, 127.0346],
  ["방학역", "서울 도봉구 방학동", 37.6676, 127.0444],
  ["회기역", "서울 동대문구 회기동", 37.5898, 127.0579],
  ["외대앞역", "서울 동대문구 이문동", 37.5961, 127.0636],
  ["청량리역", "서울 동대문구 전농동", 37.5801, 127.0469],
  ["제기동역", "서울 동대문구 제기동", 37.5781, 127.0348],
  ["신설동역", "서울 동대문구 신설동", 37.5752, 127.025],
  ["상봉역", "서울 중랑구 상봉동", 37.5966, 127.0852],
  ["중화역", "서울 중랑구 중화동", 37.6025, 127.0792],
  ["먹골역", "서울 중랑구 묵동", 37.6106, 127.0776],
  ["망우역", "서울 중랑구 망우동", 37.5993, 127.0919],
  ["혜화역", "서울 종로구 명륜동", 37.5822, 127.0019],
  ["동대문역", "서울 종로구 창신동", 37.5714, 127.0098],
];

function flag(name: string) {
  return process.argv.includes(`--${name}`);
}

function option(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

function tonight() {
  const demoNight = process.env.DEMO_TIME?.match(/^(\d{4}-\d{2}-\d{2})[ T]/)?.[1];
  if (demoNight) return demoNight;
  const kst = Date.now() + 9 * 3_600_000 - 12 * 3_600_000;
  return new Date(kst).toISOString().slice(0, 10);
}

const url = process.env.TURSO_CONNECTION_URL;
if (!url) throw new Error("TURSO_CONNECTION_URL이 없어요.");
if (!url.startsWith("file:") && !flag("remote")) {
  console.error("원격 DB에는 예시 데이터를 넣지 않아요. 정말 넣으려면 --remote를 붙여 주세요.");
  process.exit(1);
}

const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
const night = option("night") ?? tonight();
const count = Number(option("riders") ?? 160);
const days = Math.min(30, Math.max(1, Number(option("days") ?? 1) || 1));
const nights = Array.from({ length: days }, (_, i) => {
  const date = new Date(`${night}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + i);
  return date.toISOString().slice(0, 10);
});

if (flag("clear")) {
  const demo = `${DEMO_EMAIL_PREFIX}%`;
  await client.execute({
    sql: "delete from plans where night in (select night from bookings where user_id in (select id from users where demo = 1 or email like ?))",
    args: [demo],
  });
  await client.execute({ sql: "delete from users where demo = 1 or email like ?", args: [demo] });
  console.log("데모 학생과 그 답변, 신청을 지웠어요.");
  process.exit(0);
}

let addedStops = 0;
for (const [name, address, lat, lng] of STOPS) {
  const found = await client.execute({ sql: "select id from stops where name = ?", args: [name] });
  if (found.rows.length > 0) continue;
  await client.execute({
    sql: "insert into stops (id, name, address, lat, lng) values (?, ?, ?, ?, ?)",
    args: [crypto.randomUUID(), name, address, lat, lng],
  });
  addedStops++;
}

const START_AREAS: [name: string, address: string, lat: number, lng: number][] = [
  ["성신여대 먹자골목", "서울 성북구 동선동1가", 37.592, 127.017],
  ["안암 참살이길", "서울 성북구 안암동5가", 37.5865, 127.029],
];
for (const [name, address, lat, lng] of START_AREAS) {
  const found = await client.execute({ sql: "select id from start_areas where name = ?", args: [name] });
  if (found.rows.length > 0) continue;
  await client.execute({
    sql: "insert into start_areas (id, name, address, lat, lng) values (?, ?, ?, ?, ?)",
    args: [crypto.randomUUID(), name, address, lat, lng],
  });
}

const homes = demoRiders(count);
const areaIds = (await client.execute("select id from start_areas")).rows.map((row) => String(row.id));
const answers = demoSurveys(homes, { slots: DEMO_SLOTS, areaIds });

await client.batch(
  [
    ...homes.map((home) => ({
      sql: `insert into users (id, name, email, email_verified, home_address, home_lat, home_lng, demo)
            values (?, ?, ?, 1, ?, ?, ?, 1)
            on conflict(id) do update set name = excluded.name, home_lat = excluded.home_lat,
              home_lng = excluded.home_lng, demo = 1`,
      args: [home.id, home.name, home.email, DEMO_ADDRESS, home.lat, home.lng],
    })),
    ...answers.map((answer) => ({
      sql: `insert into surveys (user_id, frequency, slot, start_id, way, fare) values (?, ?, ?, ?, ?, ?)
            on conflict(user_id) do update set frequency = excluded.frequency, slot = excluded.slot,
              start_id = excluded.start_id, way = excluded.way, fare = excluded.fare`,
      args: [answer.userId, answer.frequency, answer.slot, answer.startId, answer.way, answer.fare],
    })),
  ],
  "write",
);

const RIDE_CHANCE = 0.85;
for (const day of nights) {
  await client.execute({ sql: "insert into operating_nights (night) values (?) on conflict do nothing", args: [day] });
  const next = random(Number(day.replaceAll("-", "")));
  const statements = [];
  for (const home of homes) {
    const rides = nights.length === 1 || next() < RIDE_CHANCE;
    const slot = weighted(DEMO_SLOTS, DEMO_SLOT_WEIGHTS, next);
    statements.push(
      rides
        ? {
            sql: `insert into bookings (id, user_id, night, slot, address, lat, lng) values (?, ?, ?, ?, ?, ?, ?)
                  on conflict(user_id, night) do update set slot = excluded.slot, lat = excluded.lat, lng = excluded.lng`,
            args: [crypto.randomUUID(), home.id, day, slot, DEMO_ADDRESS, home.lat, home.lng],
          }
        : { sql: "delete from bookings where user_id = ? and night = ?", args: [home.id, day] },
    );
  }
  await client.execute({ sql: "delete from plans where night = ?", args: [day] });
  await client.batch(statements, "write");
}

console.log(
  `${nights.length > 1 ? `${nights[0]}–${nights.at(-1)}` : night}: 정류장 ${addedStops}곳을 새로 넣고, 데모 학생 ${count}명의 가입 조사 답변과 신청을 넣었어요.`,
);

if (flag("student")) {
  const { hashPassword } = await import("better-auth/crypto");
  const email = option("email") ?? "demo.student@hansung.ac.kr";
  const password = option("password") ?? "drtdemo2026";
  const id = "demo-student";
  const home = { address: "서울 성북구 장위로 21", lat: 37.613, lng: 127.052 };
  const now = Date.now();
  await client.batch(
    [
      {
        sql: `insert into users (id, name, email, email_verified, home_address, home_lat, home_lng, demo)
              values (?, '데모 학생', ?, 1, ?, ?, ?, 1)
              on conflict(id) do update set email = excluded.email, home_address = excluded.home_address, demo = 1`,
        args: [id, email, home.address, home.lat, home.lng],
      },
      {
        sql: `insert into accounts (id, account_id, provider_id, user_id, password, updated_at) values (?, ?, 'credential', ?, ?, ?)
              on conflict(id) do update set password = excluded.password, updated_at = excluded.updated_at`,
        args: [`${id}-credential`, id, id, await hashPassword(password), now],
      },
      {
        sql: "insert into email_prefs (user_id, booking_open) values (?, 0) on conflict(user_id) do update set booking_open = 0",
        args: [id],
      },
      {
        sql: `insert into surveys (user_id, frequency, slot, start_id, way, fare) values (?, '2-3', '01:00', 'school-7', 'taxi', '3000')
              on conflict(user_id) do nothing`,
        args: [id],
      },
      {
        sql: `insert into bookings (id, user_id, night, slot, address, lat, lng) values (?, ?, ?, '01:00', ?, ?, ?)
              on conflict(user_id, night) do update set slot = excluded.slot`,
        args: [crypto.randomUUID(), id, night, home.address, home.lat, home.lng],
      },
    ],
    "write",
  );
  console.log(`데모 학생: ${email} / ${password} (알림 메일은 꺼져 있어요)`);
}
console.log("이 날의 노선은 다음에 열 때 새로 만들어져요.");
