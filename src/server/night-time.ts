const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const KST = 9 * HOUR;
const NIGHT_STARTS_AT = 12 * HOUR;

export const SLOT_MINUTES = 30;

export const ALL_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const minutes = (18 * 60 + i * SLOT_MINUTES) % (24 * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

export function slotIndex(clock: string) {
  return ALL_SLOTS.indexOf(clock);
}

export function slotsBetween(first: string, last: string) {
  return ALL_SLOTS.slice(slotIndex(first), slotIndex(last) + 1);
}

export function kstDate(time: number) {
  return new Date(time + KST).toISOString().slice(0, 10);
}

export function nightOf(time: number) {
  return kstDate(time - NIGHT_STARTS_AT);
}

export function nightClock(night: string, clock: string) {
  const [h, m] = clock.split(":").map(Number);
  const midnight = Date.parse(`${night}T00:00:00Z`) - KST;
  return midnight + ((h < 12 ? h + 24 : h) * 60 + m) * MINUTE;
}

export function slotEnd(night: string, clock: string) {
  return nightClock(night, clock) + SLOT_MINUTES * MINUTE;
}

export function isSlot(clock: string | undefined): clock is string {
  return clock !== undefined && ALL_SLOTS.includes(clock);
}

const DEMO_TIME = /^(?:(\d{4}-\d{2}-\d{2})[ T])?(([01]\d|2[0-3]):[0-5]\d)$/;

export function demoMoment(value: string, now: number) {
  const match = value.trim().match(DEMO_TIME);
  if (!match) return undefined;
  const night = match[1] ?? nightOf(now);
  if (Number.isNaN(Date.parse(`${night}T00:00:00Z`)) || kstDate(Date.parse(`${night}T00:00:00Z`)) !== night) {
    return undefined;
  }
  return nightClock(night, match[2]);
}
