const KST_OFFSET_MINUTES = 9 * 60;
const DAY_MINUTES = 24 * 60;

const pad = (n: number) => String(n).padStart(2, "0");

export function formatClock(time: number) {
  const minutes = (((Math.floor(time / 60_000) + KST_OFFSET_MINUTES) % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

export function minutesBetween(from: number, to: number) {
  return Math.max(0, Math.ceil((to - from) / 60_000));
}

export function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes}분`;
  const rest = minutes % 60;
  return rest === 0 ? `${minutes / 60}시간` : `${Math.floor(minutes / 60)}시간 ${rest}분`;
}

export function withDirectionParticle(clock: string) {
  return `${clock}${["0", "3", "6"].includes(clock.at(-1) ?? "") ? "으로" : "로"}`;
}
