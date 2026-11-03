const TIME: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
const DATE: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };

/**
 * When an item was first found: "14:32" if today, otherwise "3 Nov, 14:32".
 * A bare time is misleading once items can be days old (they persist until sold out).
 */
export function formatFoundTime(timestamp: number, now: Date = new Date()): string {
  const found = new Date(timestamp);
  const time = found.toLocaleTimeString("en-GB", TIME);

  if (found.toDateString() === now.toDateString()) {
    return time;
  }

  return `${found.toLocaleDateString("en-GB", DATE)}, ${time}`;
}
