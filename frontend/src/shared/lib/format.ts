const pounds = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const wholePounds = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

/** £10 for whole pounds, £54.99 otherwise. */
export function gbp(value: number): string {
  return Number.isInteger(value) ? wholePounds.format(value) : pounds.format(value);
}

const relative = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto", style: "short" });
const UNITS = [
  { unit: "day", ms: 86_400_000 },
  { unit: "hour", ms: 3_600_000 },
  { unit: "minute", ms: 60_000 },
] as const;

/** "4 min ago", "2 hr ago", "yesterday"; anything under a minute is "just now". */
export function relativeTime(ms: number, now = Date.now()): string {
  const elapsed = now - ms;
  for (const { unit, ms: size } of UNITS) {
    if (elapsed >= size) return relative.format(-Math.floor(elapsed / size), unit);
  }
  return "just now";
}

const clock = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });

/** "14:05" in the visitor's time zone. */
export function clockTime(ms: number): string {
  return clock.format(ms);
}
