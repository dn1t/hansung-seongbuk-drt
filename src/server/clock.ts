import env from "../lib/server-env";
import { demoMoment, kstDate, nightOf } from "./night-time";

export {
  ALL_SLOTS,
  isSlot,
  kstDate,
  nightClock,
  nightOf,
  SLOT_MINUTES,
  slotEnd,
  slotIndex,
  slotsBetween,
} from "./night-time";

function demoOffset(value: string) {
  const real = Date.now();
  const moment = demoMoment(value, real);
  return moment === undefined ? 0 : moment - real;
}

const offset = demoOffset(env.DEMO_TIME ?? "");

export function serviceNow() {
  return Date.now() + offset;
}

export function kstToday() {
  return kstDate(serviceNow());
}

export function tonight() {
  return nightOf(serviceNow());
}
