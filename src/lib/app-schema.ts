import { sql } from "drizzle-orm";
import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { users } from "./schema";
import { SURVEY_FARES, SURVEY_FREQUENCIES, SURVEY_WAYS } from "./survey-options";

export const bookings = sqliteTable(
  "bookings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    night: text("night").notNull(),
    slot: text("slot").notNull(),
    address: text("address").notNull(),
    addressDetail: text("address_detail"),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("bookings_user_night_idx").on(table.userId, table.night),
    index("bookings_night_idx").on(table.night),
  ],
);

export const operatingNights = sqliteTable("operating_nights", {
  night: text("night").primaryKey(),
  announcedAt: integer("announced_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

export const stops = sqliteTable("stops", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  address: text("address").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull();

export const plans = sqliteTable("plans", {
  night: text("night").primaryKey(),
  settings: text("settings", { mode: "json" }).notNull(),
  riders: integer("riders").notNull(),
  unplaced: integer("unplaced").notNull(),
  frozenUntil: text("frozen_until"),
  createdAt: createdAt(),
});

export const planPreviews = sqliteTable("plan_previews", {
  night: text("night").primaryKey(),
  inputKey: text("input_key").notNull(),
  result: text("result", { mode: "json" }).notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const buses = sqliteTable(
  "buses",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    night: text("night")
      .notNull()
      .references(() => plans.night, { onDelete: "cascade" }),
    slot: text("slot").notNull(),
    name: text("name").notNull(),
    bearing: real("bearing").notNull(),
    plannedDeparts: integer("planned_departs").notNull(),
    departs: integer("departs").notNull(),
    capacity: integer("capacity").notNull(),
  },
  (table) => [index("buses_night_idx").on(table.night)],
);

export const busStops = sqliteTable(
  "bus_stops",
  {
    busId: text("bus_id")
      .notNull()
      .references(() => buses.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    kind: text("kind", { enum: ["board", "alight"] }).notNull(),
    stopId: text("stop_id"),
    name: text("name").notNull(),
    address: text("address"),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    offset: integer("offset").notNull(),
  },
  (table) => [primaryKey({ columns: [table.busId, table.seq] })],
);

export const busRiders = sqliteTable(
  "bus_riders",
  {
    bookingId: text("booking_id")
      .primaryKey()
      .references(() => bookings.id, { onDelete: "cascade" }),
    busId: text("bus_id")
      .notNull()
      .references(() => buses.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    night: text("night").notNull(),
    boardSeq: integer("board_seq").notNull(),
    alightSeq: integer("alight_seq").notNull(),
  },
  (table) => [
    index("bus_riders_bus_idx").on(table.busId),
    index("bus_riders_user_night_idx").on(table.userId, table.night),
  ],
);

export const rideChoices = sqliteTable(
  "ride_choices",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    night: text("night").notNull(),
    busId: text("bus_id")
      .notNull()
      .references(() => buses.id, { onDelete: "cascade" }),
    startId: text("start_id").notNull(),
    fromSlot: text("from_slot").notNull(),
    toSlot: text("to_slot").notNull(),
    boardSeq: integer("board_seq").notNull(),
    alightSeq: integer("alight_seq").notNull(),
    createdAt: createdAt(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.night] }), index("ride_choices_bus_idx").on(table.busId)],
);

export const boardings = sqliteTable(
  "boardings",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    night: text("night").notNull(),
    busId: text("bus_id")
      .notNull()
      .references(() => buses.id, { onDelete: "cascade" }),
    alightSeq: integer("alight_seq"),
    boardedAt: integer("boarded_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.night] }), index("boardings_bus_idx").on(table.busId)],
);

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

export const startAreas = sqliteTable("start_areas", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  address: text("address").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  createdAt: createdAt(),
});

export const travelTimes = sqliteTable(
  "travel_times",
  {
    fromKey: text("from_key").notNull(),
    toKey: text("to_key").notNull(),
    seconds: integer("seconds").notNull(),
    meters: integer("meters").notNull(),
    fetchedAt: createdAt(),
  },
  (table) => [primaryKey({ columns: [table.fromKey, table.toKey] })],
);

export const emailPrefs = sqliteTable("email_prefs", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  bookingOpen: integer("booking_open", { mode: "boolean" }).default(true).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

export const surveys = sqliteTable("surveys", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  frequency: text("frequency", { enum: SURVEY_FREQUENCIES }).notNull(),
  slot: text("slot").notNull(),
  startId: text("start_id").notNull(),
  way: text("way", { enum: SURVEY_WAYS }).notNull(),
  fare: text("fare", { enum: SURVEY_FARES }).notNull(),
  comment: text("comment"),
  createdAt: createdAt(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});
