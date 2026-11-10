const DAY = 24 * 60 * 60_000;
const KST = 9 * 60 * 60_000;

export const BOOKING_SLOTS = ["23:00", "23:30", "00:00", "00:30", "01:00", "01:30", "02:00", "02:30", "03:00", "03:30"];

export function kstToday() {
  return new Date(Math.floor((Date.now() + KST) / DAY) * DAY).toISOString().slice(0, 10);
}
