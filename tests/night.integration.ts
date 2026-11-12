import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";

import { createClient } from "@libsql/client";
import { createServer, type ViteDevServer } from "vite";

import type * as BoardingModule from "../src/server/boarding";
import type * as CancelModule from "../src/server/cancel";
import type * as DemoModule from "../src/server/demo";
import type * as ClockModule from "../src/server/clock";
import type * as NoShowModule from "../src/server/no-show";
import type * as PlansModule from "../src/server/plans";
import type * as RidesModule from "../src/server/rides";
import type * as ServiceModule from "../src/server/service";

const dir = mkdtempSync(join(tmpdir(), "drt-night-"));
const url = `file:${join(dir, "night.db")}`;

Object.assign(process.env, {
  TURSO_CONNECTION_URL: url,
  TURSO_AUTH_TOKEN: "local",
  AUTH_SECRET: "integration-secret-integration-secret",
  MAILGUN_API_KEY: "invalid-local-key",
  MAILGUN_DOMAIN: "invalid.localhost",
  KAKAO_REST_API_KEY: "invalid-local-key",
  STAFF_CODE: "",
  ROUTE_TIMES: "estimate",
  WALK_TIMES: "estimate",
  DEMO_TIME: "22:30",
  NODE_SSR: "1",
});

let vite: ViteDevServer;
type Rides = typeof RidesModule;
type Plans = typeof PlansModule;
type Clock = typeof ClockModule;
type Boarding = typeof BoardingModule;
type Cancel = typeof CancelModule;
type NoShow = typeof NoShowModule;
type Service = typeof ServiceModule;
type Demo = typeof DemoModule;
let rides: Rides;
let plans: Plans;
let clock: Clock;
let boarding: Boarding;
let cancel: Cancel;
let noShow: NoShow;
let service: Service;
let demo: Demo;

const STOPS: [string, string, number, number][] = [
  ["한성대입구역", "서울 성북구 동소문동", 37.5884, 127.0062],
  ["성신여대입구역", "서울 성북구 동선동", 37.5926, 127.0164],
  ["고려대역", "서울 성북구 종암동", 37.5904, 127.0358],
  ["월곡역", "서울 성북구 하월곡동", 37.6019, 127.0415],
  ["장위시장", "서울 성북구 장위동", 37.613, 127.052],
  ["석계역", "서울 성북구 석관동", 37.615, 127.0657],
  ["노원역", "서울 노원구 상계동", 37.6553, 127.0613],
  ["중계역", "서울 노원구 중계동", 37.6448, 127.0645],
  ["창동역", "서울 도봉구 창동", 37.6531, 127.0477],
];

async function seed(night: string) {
  const db = createClient({ url });
  for (const folder of readdirSync("migrations")
    .filter((name) => /^\d/.test(name))
    .sort()) {
    const sql = readFileSync(join("migrations", folder, "migration.sql"), "utf8");
    for (const statement of sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean)) {
      await db.execute(statement);
    }
  }
  for (const [name, address, lat, lng] of STOPS) {
    await db.execute({
      sql: "insert into stops (id, name, address, lat, lng) values (?, ?, ?, ?, ?)",
      args: [crypto.randomUUID(), name, address, lat, lng],
    });
  }
  await db.execute({ sql: "insert into operating_nights (night) values (?)", args: [night] });
  const homes = [
    [37.6553, 127.0613],
    [37.6448, 127.0645],
    [37.6531, 127.0477],
    [37.613, 127.052],
    [37.615, 127.0657],
  ];
  for (let i = 0; i < 36; i++) {
    const [lat, lng] = homes[i % homes.length];
    const id = `rider-${i}`;
    await db.execute({
      sql: "insert into users (id, name, email, email_verified, home_address, home_lat, home_lng) values (?, ?, ?, 1, 'x', ?, ?)",
      args: [id, `학생 ${i}`, `rider${i}@hansung.ac.kr`, lat, lng],
    });
    await db.execute({
      sql: "insert into bookings (id, user_id, night, slot, address, lat, lng) values (?, ?, ?, ?, 'x', ?, ?)",
      args: [`booking-${i}`, id, night, i < 20 ? "23:00" : i < 32 ? "23:30" : "01:00", lat + 0.001, lng],
    });
  }
  db.close();
}

before(async () => {
  vite = await createServer({ logLevel: "error", server: { middlewareMode: true, hmr: false }, appType: "custom" });
  clock = (await vite.ssrLoadModule("/src/server/clock.ts")) as Clock;
  await seed(clock.tonight());
  plans = (await vite.ssrLoadModule("/src/server/plans.ts")) as Plans;
  rides = (await vite.ssrLoadModule("/src/server/rides.ts")) as Rides;
  noShow = (await vite.ssrLoadModule("/src/server/no-show.ts")) as NoShow;
  boarding = (await vite.ssrLoadModule("/src/server/boarding.ts")) as Boarding;
  cancel = (await vite.ssrLoadModule("/src/server/cancel.ts")) as Cancel;
  service = (await vite.ssrLoadModule("/src/server/service.ts")) as Service;
  demo = (await vite.ssrLoadModule("/src/server/demo.ts")) as Demo;
});

after(async () => {
  await vite?.close();
  rmSync(dir, { recursive: true, force: true });
});

const rider = (i: number) => ({ id: `rider-${i}`, email: `rider${i}@hansung.ac.kr` });

describe("a night end to end", () => {
  it("fixes each time slot an hour before it leaves and seats everyone due", async () => {
    const night = clock.tonight();
    assert.equal(await plans.ensurePlan(night), true);
    const state = await plans.loadNight(night);
    assert.ok(state.buses.length >= 1);
    assert.equal(state.seats.length, 32);
    assert.ok(state.buses.every((bus) => bus.slot === "23:00" || bus.slot === "23:30"));
    assert.equal(await plans.frozenUntil(night), "23:30");
    assert.equal(await plans.ensurePlan(night), true);
    assert.equal((await plans.loadNight(night)).buses.length, state.buses.length);
  });

  it("previews the later slots that are still open for booking", async () => {
    const night = clock.tonight();
    const preview = await plans.previewPlan(night);
    assert.deepEqual(
      preview.bookings.map((booking) => booking.id).sort(),
      ["booking-32", "booking-33", "booking-34", "booking-35"],
    );
    assert.ok(preview.result.buses.length >= 1);
    assert.ok(preview.result.buses.every((bus) => !plans.isFrozen("23:30", bus.slot)));
    assert.equal(preview.result.buses.flatMap((bus) => bus.route.seats).length, 4);
    const later = await rides.tonightFor(rider(32));
    assert.equal(later.kind, "booked");
    assert.ok(later.kind === "booked" && later.fixesAt === clock.slotCutoff(night, "01:00"));
  });

  it("keeps a night's preview until its bookings change", async () => {
    const night = clock.tonight();
    const first = await plans.previewPlan(night);
    const db = createClient({ url });
    const stored = await db.execute({ sql: "select input_key from plan_previews where night = ?", args: [night] });
    assert.equal(stored.rows.length, 1);
    const marked = { ...first.result, unplaced: ["from-cache"] };
    await db.execute({
      sql: "update plan_previews set result = ? where night = ?",
      args: [JSON.stringify(marked), night],
    });
    assert.deepEqual((await plans.previewPlan(night)).result.unplaced, ["from-cache"]);

    await db.execute({
      sql: "update bookings set lng = lng + 0.0001 where id = 'booking-33'",
    });
    db.close();
    const changed = await plans.previewPlan(night);
    assert.ok(!changed.result.unplaced.includes("from-cache"), "a changed booking plans the night again");
    assert.equal(changed.result.buses.flatMap((bus) => bus.route.seats).length, 4);
  });

  it("shows a booked student their drop-off stop", async () => {
    const tonight = await rides.tonightFor(rider(0));
    assert.equal(tonight.kind, "booked");
    assert.ok(tonight.kind === "booked" && tonight.dropOff && tonight.dropOff.walkHome <= 13);
  });

  it("lists buses from the student's school and lets them choose one", async () => {
    const options = await rides.busOptionsFor(rider(0), "school-7", "23:00", "23:30");
    assert.ok(options && options.options.length > 0);
    const option = options.options[0];
    const alight = option.stops[option.alightIndex].id;
    const result = await rides.chooseRideFor(rider(0), {
      start: "school-7",
      from: "23:00",
      to: "23:30",
      bus: option.busId,
      alight,
    });
    assert.deepEqual(result, { ok: true });
    const tonight = await rides.tonightFor(rider(0));
    assert.equal(tonight.kind, "waiting");
  });

  it("refuses a student without a booking tonight", async () => {
    const result = await rides.chooseRideFor(
      { id: "nobody", email: "nobody@hansung.ac.kr" },
      {
        start: "school-7",
        from: "23:00",
        to: "23:30",
        bus: "x",
        alight: "1",
      },
    );
    assert.equal(result.ok, false);
  });

  it("moves a quiet bus earlier after a busy one", async () => {
    const night = clock.tonight();
    const state = await plans.loadNight(night);
    const early = state.buses.find((bus) => bus.slot === "23:00");
    const late = state.buses.find((bus) => bus.slot === "23:30");
    assert.ok(early && late, "both slots should have a bus");
    const db = createClient({ url });
    const lateSeats = state.seats.filter((seat) => seat.busId === late.id).slice(0, 6);
    for (const seat of lateSeats) {
      await db.execute({
        sql: "insert into ride_choices (user_id, night, bus_id, start_id, from_slot, to_slot, board_seq, alight_seq) values (?, ?, ?, 'school-7', '23:00', '23:00', 0, ?) on conflict do nothing",
        args: [seat.userId, night, early.id, early.stops.at(-1)!.seq],
      });
    }
    db.close();
    await plans.rebalance(night);
    const moved = (await plans.loadNight(night)).buses.find((bus) => bus.id === late.id)!;
    assert.ok(moved.departs < moved.plannedDeparts, "the quiet 23:30 bus should leave earlier");
  });

  it("shows a boarded student as riding", async () => {
    const night = clock.tonight();
    const state = await plans.loadNight(night);
    const seat = state.seats.find((entry) => entry.userId === "rider-3")!;
    const db = createClient({ url });
    await db.execute({
      sql: "insert into boardings (user_id, night, bus_id, alight_seq, boarded_at) values (?, ?, ?, ?, ?)",
      args: ["rider-3", night, seat.busId, seat.alightSeq, Date.now()],
    });
    db.close();
    const tonight = await rides.tonightFor(rider(3));
    assert.equal(tonight.kind, "riding");
  });

  it("blocks booking after too many no-shows only when the operator turns it on", async () => {
    const db = createClient({ url });
    await db.execute("insert into plans (night, settings, riders, unplaced) values ('2026-01-05', '{}', 1, 0)");
    await db.execute(
      "insert into bookings (id, user_id, night, slot, address, lat, lng) values ('past', 'rider-1', '2026-01-05', '23:00', 'x', 37.6, 127.0)",
    );
    db.close();
    assert.equal(await noShow.bookingBlock("rider-1"), undefined);
    await service.saveServiceSettings({ ...service.DEFAULT_SERVICE, noShowLimit: 1 });
    const recent = await noShow.recentNoShows("rider-1");
    assert.equal(recent, 0, "a night older than 30 days does not count");

    const lastWeek = clock.kstDate(clock.serviceNow() - 7 * 24 * 60 * 60_000);
    const again = createClient({ url });
    await again.execute({
      sql: "insert into plans (night, settings, riders, unplaced) values (?, '{}', 1, 0)",
      args: [lastWeek],
    });
    await again.execute({
      sql: "insert into bookings (id, user_id, night, slot, address, lat, lng) values ('recent', 'rider-1', ?, '23:00', 'x', 37.6, 127.0)",
      args: [lastWeek],
    });
    again.close();
    assert.equal(await noShow.recentNoShows("rider-1"), 1);
    assert.match((await noShow.bookingBlock("rider-1")) ?? "", /타지 않은 날이 1번/);
    await service.saveServiceSettings(service.DEFAULT_SERVICE);
    assert.equal(await noShow.bookingBlock("rider-1"), undefined);
  });

  it("stops day-of choices inside the operator's deadline", async () => {
    const before = (await rides.busOptionsFor(rider(5), "school-7", "23:00", "23:30"))!;
    await service.saveServiceSettings({ ...service.DEFAULT_SERVICE, dayOfCutoffMinutes: 60 });
    const deadline = before.now + 60 * 60_000;
    const after = (await rides.busOptionsFor(rider(5), "school-7", "23:00", "23:30"))!;
    assert.ok(after.options.every((option) => option.stops[option.boardIndex].at > deadline));
    assert.ok(after.options.length <= before.options.length);
    const tooSoon = before.options.find((option) => option.stops[option.boardIndex].at <= deadline);
    if (tooSoon) {
      const result = await rides.chooseRideFor(rider(5), {
        start: "school-7",
        from: "23:00",
        to: "23:30",
        bus: tooSoon.busId,
        alight: tooSoon.stops[tooSoon.alightIndex].id,
      });
      assert.equal(result.ok, false);
      assert.match(result.ok ? "" : result.message, /60분 전까지/);
    }
    await service.saveServiceSettings(service.DEFAULT_SERVICE);
  });

  it("checks QR codes at the door and records the drop-off stop", async () => {
    const { makeQrToken } = await import("../src/server/qr-sign.ts");
    const secret = process.env.AUTH_SECRET!;
    const state = await plans.loadNight(clock.tonight());
    const seat = state.seats.find((entry) => entry.userId === "rider-6")!;
    const bus = state.buses.find((entry) => entry.id === seat.busId)!;
    const stopName = bus.stops.find((stop) => stop.seq === seat.alightSeq)!.name;

    assert.equal((await boarding.boardStudent(bus.id, "rider-6", false)).ok, false, "a bare id needs typing");
    assert.equal((await boarding.boardStudent(bus.id, "nobody", true)).ok, false);

    const old = (await makeQrToken(secret, "rider-6", Date.now() - 20 * 60_000)).value;
    const stale = await boarding.boardStudent(bus.id, old, false);
    assert.ok(!stale.ok && /시간이 지난/.test(stale.message));

    const fresh = (await makeQrToken(secret, "rider-6", Date.now())).value;
    const first = await boarding.boardStudent(bus.id, fresh, false);
    assert.ok(first.ok);
    assert.equal(first.ok && first.dropOff, stopName);
    assert.equal(first.ok && first.again, false);
    assert.equal(first.ok && first.farFromHome, false);
    assert.ok(first.ok && first.walkHome !== null && first.walkHome <= 13);
    const second = await boarding.boardStudent(bus.id, fresh, false);
    assert.equal(second.ok && second.again, true);

    const typed = await boarding.boardStudent(bus.id, "rider-7", true);
    assert.ok(typed.ok);
  });

  it("expects fewer riders from students who often skip", async () => {
    const db = createClient({ url });
    const nights = [9, 10, 11].map((days) => clock.kstDate(clock.serviceNow() - days * 24 * 60 * 60_000));
    for (const [i, night] of nights.entries()) {
      await db.execute({
        sql: "insert into plans (night, settings, riders, unplaced) values (?, '{}', 1, 0) on conflict do nothing",
        args: [night],
      });
      await db.execute({
        sql: "insert into bookings (id, user_id, night, slot, address, lat, lng) values (?, 'rider-2', ?, '23:00', 'x', 37.6, 127.0)",
        args: [`history-${i}`, night],
      });
    }
    const state = await plans.loadNight(clock.tonight());
    await db.execute({
      sql: "insert into buses (id, night, slot, name, bearing, planned_departs, departs, capacity) values ('history-bus', ?, '23:00', 'x', 0, 0, 0, 28)",
      args: [nights[0]],
    });
    await db.execute({
      sql: "insert into boardings (user_id, night, bus_id, alight_seq, boarded_at) values ('rider-2', ?, 'history-bus', null, 0)",
      args: [nights[0]],
    });
    db.close();
    assert.ok(state.buses.length > 0);
    const expected = await noShow.expectedRiders(["rider-2", "rider-9"]);
    assert.ok(Math.abs(expected - (1 / 3 + 1)) < 1e-9, `expected ${expected}`);
  });

  it("offers buses from an operator-added nightlife area near a pickup", async () => {
    const db = createClient({ url });
    await db.execute(
      "insert into start_areas (id, name, address, lat, lng) values ('area-test', '한성대 앞 골목', '서울 성북구', 37.5835, 127.0095)",
    );
    await db.execute(
      "insert into start_areas (id, name, address, lat, lng) values ('area-far', '먼 동네', '서울 강남구', 37.4979, 127.0276)",
    );
    db.close();
    const points = await rides.startPointsFor(rider(8));
    assert.ok(points.points.some((point) => point.id === "area-test" && point.kind === "area"));
    const near = await rides.busOptionsFor(rider(8), "area-test", "23:00", "23:30");
    assert.ok((near?.options.length ?? 0) > 0);
    assert.ok(near!.options.every((option) => option.walkToStop <= 15));
    const far = await rides.busOptionsFor(rider(8), "area-far", "23:00", "23:30");
    assert.equal(far?.options.length, 0);
    assert.equal(far?.passesStart, false);
    assert.equal(near?.passesStart, true);
  });

  it("frees the seat and the day-of choice when a booking is cancelled", async () => {
    const night = clock.tonight();
    const options = (await rides.busOptionsFor(rider(10), "school-7", "23:00", "23:30"))!;
    const option = options.options[0];
    const chosen = await rides.chooseRideFor(rider(10), {
      start: "school-7",
      from: "23:00",
      to: "23:30",
      bus: option.busId,
      alight: option.stops[option.alightIndex].id,
    });
    assert.deepEqual(chosen, { ok: true });
    const before = plans.loadsOf(await plans.loadNight(night)).get(option.busId)!;

    assert.equal(await cancel.cancelBookingFor("rider-10", "booking-10"), true);
    assert.equal(await cancel.cancelBookingFor("rider-10", "booking-10"), false);
    const after = await plans.loadNight(night);
    assert.ok(!after.choices.some((choice) => choice.userId === "rider-10"));
    assert.ok(!after.seats.some((seat) => seat.userId === "rider-10"));
    assert.equal(plans.loadsOf(after).get(option.busId), before - 1);
    assert.equal((await rides.tonightFor(rider(10))).kind, "not-booked");
  });

  it("builds a night's plan once when many requests arrive together", async () => {
    const night = clock.kstDate(clock.serviceNow() - 2 * 24 * 60 * 60_000);
    const db = createClient({ url });
    await db.execute({ sql: "insert into operating_nights (night) values (?)", args: [night] });
    for (let i = 0; i < 12; i++) {
      await db.execute({
        sql: "insert into bookings (id, user_id, night, slot, address, lat, lng) values (?, ?, ?, '01:00', 'x', 37.6553, 127.0613)",
        args: [`race-${i}`, `rider-${i + 11}`, night],
      });
    }
    const results = await Promise.all(Array.from({ length: 6 }, () => plans.ensurePlan(night)));
    assert.ok(results.every(Boolean));
    const count = await db.execute({ sql: "select count(*) as n from plans where night = ?", args: [night] });
    const seats = await db.execute({ sql: "select count(*) as n from bus_riders where night = ?", args: [night] });
    db.close();
    assert.equal(Number(count.rows[0].n), 1);
    assert.equal(Number(seats.rows[0].n), 12);
  });

  it("never overfills a bus when two students take the last seat together", async () => {
    const night = clock.tonight();
    const options = (await rides.busOptionsFor(rider(12), "school-7", "23:00", "23:30"))!;
    const target = options.options.find((option) => !option.mine)!;
    const state = await plans.loadNight(night);
    const load = plans.loadsOf(state).get(target.busId)!;
    const db = createClient({ url });
    await db.execute({ sql: "update buses set capacity = ? where id = ?", args: [load + 1, target.busId] });
    db.close();

    const takers = [13, 14, 15, 16]
      .filter((i) => state.seats.find((seat) => seat.userId === `rider-${i}`)?.busId !== target.busId)
      .slice(0, 2);
    assert.equal(takers.length, 2);
    const choose = (i: number) =>
      rides.chooseRideFor(rider(i), {
        start: "school-7",
        from: "23:00",
        to: "23:30",
        bus: target.busId,
        alight: target.stops[target.alightIndex].id,
      });
    const results = await Promise.all(takers.map(choose));
    assert.ok(results.filter((result) => result.ok).length <= 1);
    const after = plans.loadsOf(await plans.loadNight(night)).get(target.busId)!;
    assert.ok(after <= load + 1, `load ${after} over capacity ${load + 1}`);
  });

  it("adds demo bookings to open slots only and keeps a night that has riders", async () => {
    const night = clock.tonight();
    const open = await demo.openDemoSlots(night);
    assert.ok(!open.includes("23:00") && !open.includes("23:30") && open.includes("00:00"));
    const { added } = await demo.addDemoBookings(night, 30);
    assert.equal(added, 30);
    const db = createClient({ url });
    const rows = await db.execute({
      sql: "select b.slot from bookings b join users u on u.id = b.user_id where b.night = ? and u.demo = 1",
      args: [night],
    });
    db.close();
    assert.equal(rows.rows.length, 30);
    assert.ok(rows.rows.every((row) => open.includes(String(row.slot))));
    assert.equal((await demo.addDemoBookings(night, 30)).added, 30, "adding again replaces the open-slot bookings");

    assert.equal(await demo.clearDemoBookings(night), 30);
    assert.equal(await plans.hasPlan(night), true, "a night where students chose or boarded keeps its plan");
  });
});
