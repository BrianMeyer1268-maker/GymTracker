// Date helpers. Dates are stored as local "YYYY-MM-DD" strings so they never
// drift across timezones (a plain new Date("2026-05-16") would parse as UTC).

export function todayISO(): string {
  return toISO(new Date());
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse "YYYY-MM-DD" into a local Date (midnight local time). */
export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "May 28" */
export function fmtShort(iso: string): string {
  const d = parseISO(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "May 28, 2026" */
export function fmtLong(iso: string): string {
  const d = parseISO(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** Whole days from `iso` until today (today = 0, yesterday = 1). */
export function daysAgo(iso: string): number {
  const a = parseISO(iso).getTime();
  const b = parseISO(todayISO()).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Human "today" / "yesterday" / "3d ago" / "May 28". */
export function relDate(iso: string): string {
  const n = daysAgo(iso);
  if (n <= 0) return "today";
  if (n === 1) return "yesterday";
  if (n < 7) return `${n}d ago`;
  return fmtShort(iso);
}

import type { TimeBucket } from "./types";

export const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DOW_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Map a Date's hour to one of the six time-of-day buckets. */
export function timeBucket(d: Date): TimeBucket {
  const h = d.getHours();
  if (h >= 5 && h < 8) return "early-morning";
  if (h >= 8 && h < 11) return "morning";
  if (h >= 11 && h < 14) return "lunch";
  if (h >= 14 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "late-night"; // 21:00–04:59
}

/** "47 min" / "1h 05m". */
export function fmtDuration(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}
