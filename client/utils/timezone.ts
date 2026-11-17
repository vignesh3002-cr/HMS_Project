// ---------------------------------------------------------------------------
// Single source of truth for timezone handling in the frontend.
//
// The active branch's IANA zone (branch.timezone, e.g. "Asia/Kolkata",
// "America/New_York") is published here by BranchFilterContext whenever the
// selected branch changes. Display code reads it through getActiveTimezone()
// so times are shown in the HOSPITAL's local time - never in whatever
// timezone the viewer's laptop happens to be set to.
//
// A missing/invalid value falls back to Asia/Kolkata, matching the DB default.
// ---------------------------------------------------------------------------

import { format } from "date-fns";

export const DEFAULT_TIMEZONE = "Asia/Kolkata";

let activeTimezone: string = DEFAULT_TIMEZONE;

/** True when `tz` is a zone Intl (all modern browsers) understands. */
export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || tz.length === 0 || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Publish the active branch's zone (invalid/empty -> back to the default). */
export function setActiveTimezone(tz?: string | null): void {
  activeTimezone = isValidTimeZone(tz) ? tz : DEFAULT_TIMEZONE;
}

/** The timezone all display formatting should use right now. */
export function getActiveTimezone(): string {
  return activeTimezone;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Wall-clock fields of `date` as seen in `tz`. */
function zonedParts(tz: string, date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const num = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: num("year"),
    month: num("month"),
    day: num("day"),
    hour: num("hour"),
    minute: num("minute"),
    second: num("second"),
  };
}

/**
 * Offset (ms) of `tz` from UTC at the given instant - DST-aware and recomputed
 * per call (a zone's offset differs in summer vs winter).
 */
export function getTimezoneOffsetMs(tz: string, date: Date = new Date()): number {
  const p = zonedParts(isValidTimeZone(tz) ? tz : DEFAULT_TIMEZONE, date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, date.getUTCMilliseconds());
  return asUtc - date.getTime();
}

/**
 * "Now" shifted so its UTC getters read the wall clock in `tz` - the pattern
 * the old hardcoded IST helpers used, now driven by the active branch zone.
 * (Read the result with getUTC*() only.)
 */
export function getNowIn(tz: string): Date {
  const now = new Date();
  return new Date(now.getTime() + getTimezoneOffsetMs(tz, now));
}

/** The calendar day `date` falls on in `tz`, as "YYYY-MM-DD". */
export function getDateIn(tz: string, date: Date): string {
  const p = zonedParts(isValidTimeZone(tz) ? tz : DEFAULT_TIMEZONE, date);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

/** Today's "YYYY-MM-DD" in the active branch timezone. */
export function getTodayInActiveTimezone(): string {
  return getDateIn(activeTimezone, new Date());
}

/** "Now" (shifted) in the active branch timezone - read with getUTC*(). */
export function getNowInActiveTimezone(): Date {
  return getNowIn(activeTimezone);
}

/** Minutes since local midnight in the active branch timezone (0..1439). */
export function getNowMinutesInActiveTimezone(): number {
  const p = zonedParts(activeTimezone, new Date());
  return p.hour * 60 + p.minute;
}

// ---------------------------------------------------------------------------
// Country -> IANA zone suggestions for the branch form.
//
// country-state-city (the Country/State/City source) carries NO timezone
// data, so this curated map covers the countries a branch may plausibly be
// opened in; the first entry of each list is the suggested zone the admin
// confirms. Countries outside the map fall back to DEFAULT_TIMEZONE, which
// the admin can then change from the full zone list.
// ---------------------------------------------------------------------------

export const COUNTRY_TIMEZONES: Record<string, string[]> = {
  IN: ["Asia/Kolkata"],
  US: [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Anchorage",
    "Pacific/Honolulu",
  ],
  CA: ["America/Toronto", "America/Vancouver", "America/Edmonton", "America/Winnipeg", "America/Halifax"],
  MX: ["America/Mexico_City"],
  BR: ["America/Sao_Paulo"],
  AR: ["America/Argentina/Buenos_Aires"],
  CL: ["America/Santiago"],
  CO: ["America/Bogota"],
  PE: ["America/Lima"],
  GB: ["Europe/London"],
  IE: ["Europe/Dublin"],
  FR: ["Europe/Paris"],
  DE: ["Europe/Berlin"],
  NL: ["Europe/Amsterdam"],
  BE: ["Europe/Brussels"],
  LU: ["Europe/Luxembourg"],
  IT: ["Europe/Rome"],
  ES: ["Europe/Madrid"],
  PT: ["Europe/Lisbon"],
  CH: ["Europe/Zurich"],
  AT: ["Europe/Vienna"],
  SE: ["Europe/Stockholm"],
  NO: ["Europe/Oslo"],
  DK: ["Europe/Copenhagen"],
  FI: ["Europe/Helsinki"],
  IS: ["Atlantic/Reykjavik"],
  PL: ["Europe/Warsaw"],
  CZ: ["Europe/Prague"],
  HU: ["Europe/Budapest"],
  RO: ["Europe/Bucharest"],
  GR: ["Europe/Athens"],
  TR: ["Europe/Istanbul"],
  RU: ["Europe/Moscow"],
  UA: ["Europe/Kyiv"],
  AE: ["Asia/Dubai"],
  SA: ["Asia/Riyadh"],
  QA: ["Asia/Qatar"],
  KW: ["Asia/Kuwait"],
  BH: ["Asia/Bahrain"],
  OM: ["Asia/Muscat"],
  IL: ["Asia/Jerusalem"],
  IQ: ["Asia/Baghdad"],
  IR: ["Asia/Tehran"],
  JO: ["Asia/Amman"],
  LB: ["Asia/Beirut"],
  YE: ["Asia/Aden"],
  PK: ["Asia/Karachi"],
  BD: ["Asia/Dhaka"],
  LK: ["Asia/Colombo"],
  NP: ["Asia/Kathmandu"],
  AF: ["Asia/Kabul"],
  KZ: ["Asia/Almaty"],
  UZ: ["Asia/Tashkent"],
  MN: ["Asia/Ulaanbaatar"],
  CN: ["Asia/Shanghai"],
  HK: ["Asia/Hong_Kong"],
  TW: ["Asia/Taipei"],
  JP: ["Asia/Tokyo"],
  KR: ["Asia/Seoul"],
  SG: ["Asia/Singapore"],
  MY: ["Asia/Kuala_Lumpur"],
  TH: ["Asia/Bangkok"],
  VN: ["Asia/Ho_Chi_Minh"],
  PH: ["Asia/Manila"],
  ID: ["Asia/Jakarta"],
  MM: ["Asia/Yangon"],
  KH: ["Asia/Phnom_Penh"],
  LA: ["Asia/Vientiane"],
  AU: ["Australia/Sydney", "Australia/Melbourne", "Australia/Brisbane", "Australia/Adelaide", "Australia/Perth"],
  NZ: ["Pacific/Auckland"],
  ZA: ["Africa/Johannesburg"],
  EG: ["Africa/Cairo"],
  NG: ["Africa/Lagos"],
  KE: ["Africa/Nairobi"],
  GH: ["Africa/Accra"],
  TZ: ["Africa/Dar_es_Salaam"],
  UG: ["Africa/Kampala"],
  ET: ["Africa/Addis_Ababa"],
  MA: ["Africa/Casablanca"],
  DZ: ["Africa/Algiers"],
  SD: ["Africa/Khartoum"],
  ZW: ["Africa/Harare"],
  ZM: ["Africa/Lusaka"],
  BW: ["Africa/Gaborone"],
  MU: ["Indian/Mauritius"],
};

/** Every zone this runtime knows about (modern browsers expose Intl's list). */
export function listAllTimezones(): string[] {
  try {
    const supported = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.(
      "timeZone",
    );
    if (Array.isArray(supported) && supported.length > 0) return supported;
  } catch {
    // fall through to the curated list
  }
  return Array.from(new Set(Object.values(COUNTRY_TIMEZONES).flat()));
}

/** Zones offered for a country: curated list when known, full list otherwise. */
export function getCountryTimezones(countryId?: string | null): string[] {
  const curated = COUNTRY_TIMEZONES[(countryId || "").toUpperCase()];
  const list = curated && curated.length > 0 ? curated : listAllTimezones();
  return list.filter(isValidTimeZone);
}

/**
 * Deterministic suggestion for a country: its first known zone, else the
 * hospital default (Asia/Kolkata). The admin always confirms the final value.
 */
export function suggestTimezone(countryId?: string | null): string {
  const curated = COUNTRY_TIMEZONES[(countryId || "").toUpperCase()];
  if (curated && curated.length > 0 && isValidTimeZone(curated[0])) return curated[0];
  return DEFAULT_TIMEZONE;
}

/**
 * Format helper: toLocale* in the active branch timezone.
 *
 * isDateOnly marks values that are pure calendar dates stored at UTC midnight
 * (e.g. appointment_date "2026-11-13"): those must render with timeZone "UTC"
 * or branches west of UTC would display the PREVIOUS day.
 */
export function formatInActiveTimezone(
  value: Date,
  options: Intl.DateTimeFormatOptions,
  isDateOnly = false
): string {
  return value.toLocaleString(undefined, {
    ...options,
    timeZone: isDateOnly ? "UTC" : activeTimezone,
  });
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** True for a value anchored exactly at UTC midnight (a stored @db.Date). */
function isUtcMidnightAnchor(value: Date): boolean {
  return value.getTime() % DAY_MS === 0;
}

/** True for a date-only value picked at local midnight (calendar pickers). */
function isLocalMidnightAnchor(value: Date): boolean {
  return (
    value.getHours() === 0 &&
    value.getMinutes() === 0 &&
    value.getSeconds() === 0 &&
    value.getMilliseconds() === 0
  );
}

/**
 * date-fns `format` rendered in the ACTIVE BRANCH timezone, not the viewer's
 * laptop zone.
 *
 * - date-only values keep their calendar day exactly as stored (UTC-midnight
 *   anchor) or as picked (local-midnight picker value) - never shifted;
 * - real instants (recorded_at, now, created_at ...) are converted to the
 *   branch's wall clock first, then formatted, so date-fns' local getters
 *   read the HOSPITAL's time.
 *
 * Delegates to date-fns for invalid input so it throws exactly as before.
 */
export function formatInBranchTimezone(value: Date, pattern: string): string {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    // Let date-fns produce its usual Invalid Date error.
    return format(value as Date, pattern);
  }
  const tz = isUtcMidnightAnchor(value)
    ? "UTC"
    : isLocalMidnightAnchor(value)
      ? null // picked day: the local getters already hold it
      : activeTimezone;
  if (tz === null) return format(value, pattern);
  const p = zonedParts(tz, value);
  return format(new Date(p.year, p.month - 1, p.day, p.hour, p.minute, p.second), pattern);
}

/** Shift a "YYYY-MM-DD" calendar string by whole days (pure date math). */
function shiftDayIso(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00.000Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Calendar day of any value for display and day-keys: date-only values keep
 * the day as stored (UTC) or as picked (local); real instants resolve in the
 * active branch zone.
 */
export function dayKeyOf(value: Date): string {
  if (isUtcMidnightAnchor(value)) {
    return `${value.getUTCFullYear()}-${pad2(value.getUTCMonth() + 1)}-${pad2(value.getUTCDate())}`;
  }
  if (isLocalMidnightAnchor(value)) {
    return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
  }
  return getDateIn(activeTimezone, value);
}

/**
 * Branch-zone replacements for date-fns isToday/isYesterday/isTomorrow,
 * which otherwise compare in the viewer's laptop timezone.
 */
export function isTodayInActiveTimezone(value: Date): boolean {
  return dayKeyOf(value) === getTodayInActiveTimezone();
}

export function isYesterdayInActiveTimezone(value: Date): boolean {
  return dayKeyOf(value) === shiftDayIso(getTodayInActiveTimezone(), -1);
}

export function isTomorrowInActiveTimezone(value: Date): boolean {
  return dayKeyOf(value) === shiftDayIso(getTodayInActiveTimezone(), 1);
}
