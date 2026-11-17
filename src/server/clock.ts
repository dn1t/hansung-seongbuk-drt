import env from "../lib/server-env";
import { demoMoment, kstDate, nightOf } from "./night-time";

export {
  ALL_SLOTS,
  BOOKING_CUTOFF_MINUTES,
  isSlot,
  kstDate,
  nightClock,
  nightOf,
  SLOT_MINUTES,
  slotCutoff,
  slotEnd,
  slotIndex,
  slotsBetween,
} from "./night-time";

function demoOffset(value: string) {
  const real = Date.now();
  const moment = demoMoment(value, real);
  return moment === undefined ? 0 : moment - real;
}

const envOffset = demoOffset(env.DEMO_TIME ?? "");
let presentationOffset: number | undefined;

export function setPresentationOffset(offset: number | undefined) {
  presentationOffset = offset;
}

export function serviceNow() {
  return Date.now() + (presentationOffset ?? envOffset);
}

export function kstToday() {
  return kstDate(serviceNow());
}

export function tonight() {
  return nightOf(serviceNow());
}
