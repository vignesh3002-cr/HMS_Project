import { useState, useEffect } from "react";

export type SampleUrgencyLevel =
  | "NOT_COLLECTED"
  | "COMPLETED"
  | "EXPIRED"
  | "CRITICAL" // < 30m remaining
  | "WARNING"  // 30m - 60m remaining
  | "SAFE";    // > 60m remaining

export interface SampleStabilityInfo {
  collectionTime: Date | null;
  formattedCollectionTime: string;
  deadlineTime: Date | null;
  formattedDeadlineTime: string;
  remainingMinutes: number;
  remainingSeconds: number;
  digitalCountdown: string; // e.g., "01:45:20" or "Expired before 2 hrs"
  percentRemaining: number; // 0 to 100 for progress bar
  isExpired: boolean;
  isExpiringSoon: boolean; // <= 30m
  isWarning: boolean;      // 30m - 60m
  isSafe: boolean;         // > 60m
  isCollected: boolean;
  isCompleted: boolean;
  urgencyLevel: SampleUrgencyLevel;
  badgeLabel: string;
  expiredBeforeLabel?: string; // e.g. "Expired before 2 hrs"
  badgeClasses: string;
  dotClasses: string;
  stabilityHours: number;
  alertBannerMessage?: string;
}

/**
 * Determines the clinical stability window in hours.
 * 1. Checks explicit database expiry_time_hours if present.
 * 2. Clinical standards heuristic:
 * - Arterial Blood Gas (ABG): 0.5 - 1 hr
 * - Coagulation (PT/INR): 2 hrs
 * - Unseparated Blood Glucose / Potassium / Electrolytes: 2 hrs
 * - Urine routine / microscopic: 2 hrs
 * - STAT / Emergency priority: 1 hr
 * - Standard default: 2 hrs after sample collection (phlebotomy draw time)
 */
export function resolveStabilityHours(
  testName?: string,
  sampleType?: string,
  tatHours?: number | string | null,
  priority?: string | null,
  dbExpiryHours?: number | string | null
): number {
  if (dbExpiryHours != null && !Number.isNaN(Number(dbExpiryHours))) {
    const parsedDb = Number(dbExpiryHours);
    if (parsedDb > 0) return parsedDb;
  }

  const p = (priority || "").toLowerCase();
  if (p === "stat" || p === "emergency") return 1;

  const t = (testName || "").toLowerCase();
  const s = (sampleType || "").toLowerCase();

  if (t.includes("abg") || t.includes("blood gas")) return 1;
  if (t.includes("pt") || t.includes("inr") || t.includes("prothrombin") || t.includes("coagulation")) return 2;
  if (t.includes("glucose") || t.includes("sugar") || t.includes("rbs") || t.includes("fbs")) return 2;
  if (t.includes("potassium") || t.includes("electrolyte") || t.includes("k+")) return 2;
  if (t.includes("urine") || s.includes("urine")) return 2;
  if (t.includes("cbc") || t.includes("blood count")) return 2;

  const numTat = Number(tatHours);
  if (!Number.isNaN(numTat) && numTat > 0 && numTat <= 4) {
    return numTat;
  }

  // Default standard 2-hour processing window post-collection
  return 2;
}

/**
 * Parses any ISO, date-time string or timestamp into a valid Date.
 */
export function parseDateSafe(input?: string | Date | null): Date | null {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;

  const d = new Date(input);
  if (!isNaN(d.getTime())) return d;

  const parts = String(input).match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (parts) {
    const day = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10) - 1;
    let year = parseInt(parts[3], 10);
    if (year < 100) year += 2000;
    const hour = parts[4] ? parseInt(parts[4], 10) : 0;
    const min = parts[5] ? parseInt(parts[5], 10) : 0;
    const sec = parts[6] ? parseInt(parts[6], 10) : 0;
    const parsed = new Date(year, month, day, hour, min, sec);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

/**
 * Formats elapsed overtime in human-readable clinical phrasing:
 * e.g., "Expired before 2 hrs", "Expired before 1 hr 15 mins", "Expired before 25 mins"
 */
export function formatExpiredBefore(elapsedSeconds: number): string {
  const totalSec = Math.max(0, Math.floor(elapsedSeconds));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (hours >= 1) {
    if (minutes > 0) {
      return `Expired before ${hours} hr${hours > 1 ? "s" : ""} ${minutes} min${minutes > 1 ? "s" : ""}`;
    }
    return `Expired before ${hours} hr${hours > 1 ? "s" : ""}`;
  }

  if (minutes >= 1) {
    if (seconds > 0 && minutes < 5) {
      return `Expired before ${minutes} min${minutes > 1 ? "s" : ""} ${seconds}s`;
    }
    return `Expired before ${minutes} min${minutes > 1 ? "s" : ""}`;
  }

  return `Expired before ${seconds} sec${seconds !== 1 ? "s" : ""}`;
}

/**
 * Calculates real-time sample stability, countdown, and urgency tier.
 * NOTE: The timer for sample expiry starts strictly AFTER THE SAMPLE IS COLLECTED.
 * If the sample is not yet collected, the countdown does NOT start.
 */
export function calculateSampleStability(
  collectionTimeInput?: string | Date | null,
  stabilityHours: number = 2,
  status?: string,
  nowTime: number = Date.now(),
  isCollected: boolean = true,
  expiryTimeInput?: string | Date | null
): SampleStabilityInfo {
  const isCompleted =
    (status || "").toUpperCase() === "COMPLETED" ||
    (status || "").toUpperCase() === "VERIFIED_COMPLETED";

  // If the sample is NOT yet collected from the patient, the timer must NOT begin!
  if (!isCollected || !collectionTimeInput) {
    return {
      collectionTime: null,
      formattedCollectionTime: "—",
      deadlineTime: null,
      formattedDeadlineTime: "—",
      remainingMinutes: 9999,
      remainingSeconds: 999999,
      digitalCountdown: "—:—",
      percentRemaining: 100,
      isExpired: false,
      isExpiringSoon: false,
      isWarning: false,
      isSafe: true,
      isCollected: false,
      isCompleted,
      urgencyLevel: isCompleted ? "COMPLETED" : "NOT_COLLECTED",
      badgeLabel: isCompleted ? "Completed" : "Awaiting Draw",
      badgeClasses: "bg-slate-100 text-slate-500 border border-slate-200 font-medium",
      dotClasses: "bg-slate-400",
      stabilityHours,
    };
  }

  const collectionDate = parseDateSafe(collectionTimeInput);

  if (!collectionDate) {
    return {
      collectionTime: null,
      formattedCollectionTime: "—",
      deadlineTime: null,
      formattedDeadlineTime: "—",
      remainingMinutes: 9999,
      remainingSeconds: 999999,
      digitalCountdown: "—:—",
      percentRemaining: 100,
      isExpired: false,
      isExpiringSoon: false,
      isWarning: false,
      isSafe: true,
      isCollected: false,
      isCompleted,
      urgencyLevel: isCompleted ? "COMPLETED" : "NOT_COLLECTED",
      badgeLabel: isCompleted ? "Completed" : "Awaiting Draw",
      badgeClasses: "bg-slate-100 text-slate-500 border border-slate-200 font-medium",
      dotClasses: "bg-slate-400",
      stabilityHours,
    };
  }

  const formattedCollectionTime = collectionDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  // Expiry deadline: Use database expiry_datetime if provided, else compute from collection + stabilityHours
  let deadlineDate = parseDateSafe(expiryTimeInput);
  if (!deadlineDate) {
    const deadlineMs = collectionDate.getTime() + stabilityHours * 3600 * 1000;
    deadlineDate = new Date(deadlineMs);
  }

  const formattedDeadlineTime = deadlineDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  if (isCompleted) {
    return {
      collectionTime: collectionDate,
      formattedCollectionTime,
      deadlineTime: deadlineDate,
      formattedDeadlineTime,
      remainingMinutes: 0,
      remainingSeconds: 0,
      digitalCountdown: "00:00:00",
      percentRemaining: 100,
      isExpired: false,
      isExpiringSoon: false,
      isWarning: false,
      isSafe: true,
      isCollected: true,
      isCompleted: true,
      urgencyLevel: "COMPLETED",
      badgeLabel: "Completed",
      badgeClasses: "bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium",
      dotClasses: "bg-emerald-500",
      stabilityHours,
    };
  }

  const diffMs = deadlineDate.getTime() - nowTime;
  const remainingTotalSeconds = Math.floor(diffMs / 1000);
  const remainingMinutes = Math.floor(diffMs / 60000);
  const isExpired = remainingTotalSeconds <= 0;
  const isExpiringSoon = !isExpired && remainingMinutes <= 30;
  const isWarning = !isExpired && remainingMinutes > 30 && remainingMinutes <= 60;
  const isSafe = !isExpired && remainingMinutes > 60;

  // Format digital countdown: HH:MM:SS
  const absSec = Math.abs(remainingTotalSeconds);
  const h = Math.floor(absSec / 3600);
  const m = Math.floor((absSec % 3600) / 60);
  const s = absSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  const elapsedSec = isExpired ? Math.abs(remainingTotalSeconds) : 0;
  const expiredBeforeLabel = isExpired ? formatExpiredBefore(elapsedSec) : undefined;

  // Before expiry: timer counts down in seconds (e.g. 29, 28, 27)
  // After expiry: displays "Expired before 2 hrs"
  const digitalCountdown = isExpired
    ? (expiredBeforeLabel || "Expired")
    : `${pad(h)}:${pad(m)}:${pad(s)}`;

  // Calculate percentage remaining for the progress bar
  const totalWindowSec = Math.max(1, stabilityHours * 3600);
  const percentRemaining = isExpired
    ? 0
    : Math.min(100, Math.max(0, Math.round((remainingTotalSeconds / totalWindowSec) * 100)));

  let urgencyLevel: SampleUrgencyLevel = "SAFE";
  let badgeLabel = "";
  let badgeClasses = "";
  let dotClasses = "";
  let alertBannerMessage: string | undefined = undefined;

  if (isExpired) {
    urgencyLevel = "EXPIRED";
    badgeLabel = expiredBeforeLabel || "Expired";
    // After expiry: High visibility red/rose style
    badgeClasses = "bg-rose-50 text-rose-700 border border-rose-300 font-bold shadow-2xs";
    dotClasses = "bg-rose-600";
    alertBannerMessage = `⛔ Specimen Expired: ${expiredBeforeLabel}. Sample recollection or supervisor override required.`;
  } else {
    // BEFORE EXPIRY: Displayed in GREEN COLOUR with reducing seconds (29, 28, 27...)
    badgeLabel = `${pad(h)}:${pad(m)}:${pad(s)} left`;
    badgeClasses = "bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold shadow-2xs";
    dotClasses = "bg-emerald-500 animate-pulse";

    if (remainingMinutes <= 30) {
      urgencyLevel = "CRITICAL";
      alertBannerMessage = `⚠️ Short Time Alert: Only ${remainingMinutes}m left before sample expires! Complete testing and record results immediately.`;
    } else if (remainingMinutes <= 60) {
      urgencyLevel = "WARNING";
      alertBannerMessage = `⏰ Caution: Specimen expiring in ${remainingMinutes} minutes. Expedite testing on analyzer.`;
    } else {
      urgencyLevel = "SAFE";
    }
  }

  return {
    collectionTime: collectionDate,
    formattedCollectionTime,
    deadlineTime: deadlineDate,
    formattedDeadlineTime,
    remainingMinutes,
    remainingSeconds: remainingTotalSeconds,
    digitalCountdown,
    percentRemaining,
    isExpired,
    isExpiringSoon,
    isWarning,
    isSafe,
    isCollected: true,
    isCompleted: false,
    urgencyLevel,
    badgeLabel,
    expiredBeforeLabel,
    badgeClasses,
    dotClasses,
    stabilityHours,
    alertBannerMessage,
  };
}

/**
 * React hook that yields the current timestamp, updating every `intervalMs` ms.
 * Defaults to 1000ms (1 second) so seconds count down (29, 28, 27...) in real-time.
 */
export function useCurrentTimeTicker(intervalMs: number = 1000): number {
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}

/**
 * Priority sorting comparator:
 * 1. Active collected specimens with least remaining stability time (< 30m) at the very top.
 * 2. Active collected specimens with remaining time (30-60m, > 60m).
 * 3. Expired specimens (need immediate attention/recollect).
 * 4. Specimens not yet collected (awaiting phlebotomy draw).
 * 5. Completed tests at the bottom.
 */
export function compareBySampleStability(
  a: { remainingMinutes: number; isCompleted: boolean; isExpired: boolean; isCollected?: boolean },
  b: { remainingMinutes: number; isCompleted: boolean; isExpired: boolean; isCollected?: boolean }
): number {
  // Completed items always go last
  if (a.isCompleted && !b.isCompleted) return 1;
  if (!a.isCompleted && b.isCompleted) return -1;
  if (a.isCompleted && b.isCompleted) return 0;

  // Specimens not yet collected go after active collected specimens
  const aCol = a.isCollected !== false;
  const bCol = b.isCollected !== false;
  if (aCol && !bCol) return -1;
  if (!aCol && bCol) return 1;
  if (!aCol && !bCol) return 0;

  // Active collected items expiring soonest float to top
  if (a.isExpired && !b.isExpired) {
    return b.remainingMinutes <= 30 ? 1 : -1;
  }
  if (!a.isExpired && b.isExpired) {
    return a.remainingMinutes <= 30 ? -1 : 1;
  }

  return a.remainingMinutes - b.remainingMinutes;
}
