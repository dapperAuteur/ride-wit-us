/**
 * Wall-clock times in a named time zone. A flight departs 08:10 in America/Chicago and lands 11:45
 * in America/New_York: the form takes each as local time plus its zone, the database stores the
 * instant (timestamptz) plus the zone, and the itinerary shows each end in its own zone. Pure.
 */

const LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

export function isIanaZone(zone: string): boolean {
  if (!zone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** Wall-clock parts of `instant` in `timeZone`, as if they were UTC (ms). */
function wallClockMs(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
}

/**
 * "2026-10-05T08:10" in "America/Chicago" → the UTC instant. Returns null for a malformed time or
 * an unknown zone. In a DST gap the result lands on the first valid instant after it; in an
 * overlap, the earlier of the two.
 */
export function zonedLocalToUtc(local: string, timeZone: string): Date | null {
  const m = LOCAL.exec(local.trim());
  if (!m || !isIanaZone(timeZone)) return null;
  const [, y, mo, d, h, mi, s] = m;
  const guess = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s ?? 0));
  const check = new Date(guess);
  if (check.getUTCMonth() !== Number(mo) - 1 || check.getUTCDate() !== Number(d)) return null;
  const offset1 = wallClockMs(guess, timeZone) - guess;
  let result = guess - offset1;
  const offset2 = wallClockMs(result, timeZone) - result;
  if (offset2 !== offset1) result = guess - offset2;
  return new Date(result);
}

/** The instant as "YYYY-MM-DDTHH:mm" in `timeZone`, for a datetime-local input. */
export function utcToZonedLocal(instant: Date, timeZone: string): string {
  const iso = new Date(wallClockMs(instant.getTime(), isIanaZone(timeZone) ? timeZone : "UTC")).toISOString();
  return iso.slice(0, 16);
}

/** "Mon, Oct 5, 8:10 AM CDT": the instant in its own zone, with the zone named. */
export function formatZoned(instant: Date, timeZone: string | null, locale = "en-US"): string {
  const zone = timeZone && isIanaZone(timeZone) ? timeZone : "UTC";
  return new Intl.DateTimeFormat(locale, {
    timeZone: zone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(instant);
}

/** "Mon, Oct 5, 2026" for a stored YYYY-MM-DD date, without shifting it through a time zone. */
export function formatDate(date: string, locale = "en-US"): string {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
