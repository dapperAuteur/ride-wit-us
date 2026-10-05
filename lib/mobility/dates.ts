/** Today's date as YYYY-MM-DD on the user's calendar (UTC when no zone is saved). Pure. */
export function localDate(now: Date, timeZone: string | null): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone ?? "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * The current calendar month as YYYY-MM-DD bounds in the user's time zone (trips store a local
 * `start_date`, so month totals must be cut on the user's calendar, not UTC). Pure.
 */
export function monthBounds(now: Date, timeZone: string | null): { start: string; nextStart: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone ?? "UTC",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const pad = (n: number) => String(n).padStart(2, "0");
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return { start: `${year}-${pad(month)}-01`, nextStart: `${nextYear}-${pad(nextMonth)}-01` };
}
