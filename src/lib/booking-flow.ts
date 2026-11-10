export const BOOKING_TOTAL_STEPS = 3;

export function parseNights(value: string | undefined) {
  return (value ?? "").split(",").filter((night) => /^\d{4}-\d{2}-\d{2}$/.test(night));
}

export function nightsSummary(nights: string[], format: (night: string) => string) {
  if (nights.length === 0) return "";
  return nights.length === 1 ? format(nights[0]) : `${format(nights[0])} 외 ${nights.length - 1}일`;
}
