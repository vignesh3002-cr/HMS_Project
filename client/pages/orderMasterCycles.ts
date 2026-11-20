import { format } from "date-fns";
import type { ChemoPlan } from "@/api/chemotherapy.api";
import { getActiveTimezone, getTimezoneOffsetMs, formatInBranchTimezone } from "@/utils/timezone";

/*
 * Pure helpers behind the Chemotherapy Orders table (OrderMaster.tsx).
 *
 * They live in their own module - the same way consultation/doseCalculation.ts
 * sits next to its page - so the cycle maths can be unit-tested without
 * mounting the page (see orderMasterCycles.spec.ts).
 */

/* Avatar treatment matches Dashboard/Staff/Doctor/Appointments (same palette),
   but the colour comes from a hash of the patient id instead of the row index
   so a patient keeps their colour when the table is sorted or paged. */
export const AVATAR_PALETTE = [
  { avatarColor: "#00488D", initBg: "#D6E3FF" },
  { avatarColor: "#7B3200", initBg: "#FFDBCB" },
  { avatarColor: "#00C896", initBg: "rgba(0,200,150,0.12)" },
  { avatarColor: "#475C7F", initBg: "#E6E8EA" },
];

export function getInitials(name: string): string {
  const words = name.replace(/^Dr\.?\s*/i, "").trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

export function avatarFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100003;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

/* Plan statuses that take no further orders. */
export const CLOSED_PLAN_STATUSES = ["COMPLETED", "CANCELLED", "DISCONTINUED"];
/* Cycle statuses that are finished either way. */
const CLOSED_CYCLE_STATUSES = ["COMPLETED", "CANCELLED"];

export interface CycleSummary {
  planned: number;
  completed: number;
  /* "Cycle 2 / Day 3", "Not started" or "-" */
  cycleLabel: string;
  /* "1 / 6 cycles done" or "-" */
  cyclesLabel: string;
  /* 0-100, completed / planned */
  progress: number;
  /* "" once the course is closed */
  nextCycleDate: string;
  /* the cycle the labs should be read from */
  currentCycleId: string;
}

/* ISO date (or date-only string) shifted by whole days, still in UTC so a
   date-only value never drifts a day in negative-offset timezones. Returns
   "" for an unparseable input. */
function addDaysIso(value: string, days: number): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString();
}

/*
 * Everything the Cycle/Day column needs, read from the fields the plans list
 * actually returns:
 *   - chemotherapy_cycle[]  one row per cycle number (1..planned_cycles),
 *                           created up front by the backend
 *   - plan_orders[]         one row per saved cycle + day order
 *   - current_order         the backend's own "day being worked on" (first
 *                           still-ORDERED day, else latest IN_ADMINISTRATION,
 *                           else latest COMPLETED)
 *
 * chemotherapy_cycle.cycle_day is deliberately NOT used: it only records the
 * day last ordered, so it is null on a fresh plan and stale afterwards.
 * Reading cycle_number in descending order (the previous behavior) always
 * returned the LAST planned cycle - which is why a brand new 6-cycle plan
 * showed "Cycle 6" and the "0 / 6" branch was unreachable.
 */
export function summarizeCycles(plan: ChemoPlan): CycleSummary {
  const cycles = plan.chemotherapy_cycle ?? [];
  const orders = plan.plan_orders ?? [];
  const planned = plan.planned_cycles ?? 0;
  const completed = plan.completed_cycles ?? 0;

  const statusOf = (order: { order_status?: string | null }) =>
    String(order.order_status ?? "").toUpperCase();
  const currentOrder =
    orders.find((order) => statusOf(order) === "ORDERED") ??
    [...orders].reverse().find((order) => statusOf(order) === "IN_ADMINISTRATION") ??
    plan.current_order ??
    null;

  const cycleLabel = currentOrder
    ? `Cycle ${currentOrder.cycle_number} / Day ${currentOrder.cycle_day}`
    : planned > 0
      ? "Not started"
      : "—";

  const cyclesLabel = planned > 0 ? `${completed} / ${planned} cycles done` : "—";
  const progress = planned > 0 ? Math.min(100, Math.round((completed / planned) * 100)) : 0;

  // ---- Next cycle date -------------------------------------------------
  // Mirrors the administration sheet's rule (chemotherapy.service.ts):
  // the cycle being treated is the shown day's open cycle, else the first
  // open one. When that cycle has not been started yet, its own date is
  // next; once a day of it has been released (anything but ORDERED), the
  // successor's date (or the current cycle's actual date + interval) is.
  // This is what stops an in-progress Cycle 1 from showing its own start
  // date as "Next Cycle Date" and lighting up as Delayed.
  const isClosed = CLOSED_PLAN_STATUSES.includes(
    String(plan.treatment_status ?? "").toUpperCase()
  );
  const openCycles = cycles.filter(
    (cycle) => !CLOSED_CYCLE_STATUSES.includes(String(cycle.cycle_status ?? "").toUpperCase())
  );
  const dayCycle = currentOrder
    ? cycles.find(
        (cycle) => cycle.chemotherapy_cycle_id === currentOrder.chemotherapy_cycle_id
      ) ?? null
    : null;
  const currentCycle =
    dayCycle && !CLOSED_CYCLE_STATUSES.includes(String(dayCycle.cycle_status ?? "").toUpperCase())
      ? dayCycle
      : openCycles[0] ?? null;

  const currentCycleOrders = currentCycle
    ? orders.filter(
        (order) => order.chemotherapy_cycle_id === currentCycle.chemotherapy_cycle_id
      )
    : [];
  const started = currentCycleOrders.some((order) => statusOf(order) !== "ORDERED");
  const successor = currentCycle
    ? cycles.find(
        (cycle) => (cycle.cycle_number ?? 0) === (currentCycle.cycle_number ?? 0) + 1
      ) ?? null
    : null;
  const interval = currentCycle?.cycle_interval_days ?? plan.cycle_interval_days ?? 0;

  // Fallback for the defensive case of a plan with no cycle rows at all:
  // start date + interval * completed, as before.
  let derivedNext = "";
  if (interval > 0 && plan.treatment_start_date) {
    derivedNext = addDaysIso(plan.treatment_start_date, completed * interval);
  }

  const successorFallback =
    successor?.next_cycle_date ||
    (currentCycle?.actual_date && interval > 0
      ? addDaysIso(currentCycle.actual_date, interval)
      : "") ||
    successor?.rescheduled_date ||
    successor?.planned_date ||
    "";

  const nextCycleDate = isClosed
    ? ""
    : currentCycle
      ? started
        ? successorFallback
        : currentCycle.next_cycle_date ||
          currentCycle.rescheduled_date ||
          currentCycle.planned_date ||
          ""
      : derivedNext;

  // Lab reviews hang off a cycle, so the lookup key follows the cycle being
  // treated rather than the highest cycle number.
  const currentCycleId =
    currentCycle?.chemotherapy_cycle_id ||
    currentOrder?.chemotherapy_cycle_id ||
    cycles[cycles.length - 1]?.chemotherapy_cycle_id ||
    "";

  return { planned, completed, cycleLabel, cyclesLabel, progress, nextCycleDate, currentCycleId };
}

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return "—";
  // Date-only columns (treatment_start_date, next_cycle_date, planned_date)
  // arrive as UTC midnight - formatting those in local time would shift them
  // back a day for anyone west of UTC. Real timestamps (created_at) keep the
  // existing local-time formatting.
  const isDateOnly =
    parsed.getUTCHours() === 0 &&
    parsed.getUTCMinutes() === 0 &&
    parsed.getUTCSeconds() === 0 &&
    parsed.getUTCMilliseconds() === 0;
  if (!isDateOnly) return formatInBranchTimezone(parsed, "MMM d, yyyy");
  return `${MONTHS_SHORT[parsed.getUTCMonth()]} ${parsed.getUTCDate()}, ${parsed.getUTCFullYear()}`;
}

export function toTime(iso: string | null | undefined): number {
  if (!iso) return 0;
  const time = new Date(iso).getTime();
  return Number.isNaN(time) ? 0 : time;
}

// The backend's appointment status sweep and the due-today/delayed counters
// this page mirrors both run on BRANCH days, so both sides of the comparison
// are reduced to a whole day-number in the ACTIVE BRANCH timezone (the zone
// offset is recomputed per instant, so DST zones stay correct too). Exported
// names are kept for existing consumers.
const DAY_MS = 24 * 60 * 60 * 1000;

const localDayKey = (time: number): number =>
  Math.floor((time + getTimezoneOffsetMs(getActiveTimezone(), new Date(time))) / DAY_MS);

export function istDayKey(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return null;
  return localDayKey(time);
}

export function todayIstKey(): number {
  return localDayKey(Date.now());
}

export function isTodayIso(iso: string | null | undefined): boolean {
  return istDayKey(iso) === todayIstKey();
}

export function isOverdue(iso: string | null | undefined): boolean {
  const key = istDayKey(iso);
  return key !== null && key < todayIstKey();
}

/* -------------------------------------------------------------------------
 * Order status + the three bottom widgets.
 *
 * Status is read straight from the plan's own treatment_status -- labs play
 * no part in it. DISCONTINUED shares the Cancelled bucket (the table adds a
 * "Discontinued" sub-label); everything not finished is either Scheduled
 * (PLANNED) or In Progress (ACTIVE).
 * ---------------------------------------------------------------------- */

export type OrderStatus = "Scheduled" | "In Progress" | "Completed" | "Cancelled";

export const ORDER_STATUSES: readonly OrderStatus[] = [
  "Scheduled",
  "In Progress",
  "Completed",
  "Cancelled",
];

export function orderStatusOf(rawStatus: string | null | undefined): OrderStatus {
  const raw = String(rawStatus ?? "").toUpperCase();
  if (raw === "COMPLETED") return "Completed";
  if (raw === "CANCELLED" || raw === "DISCONTINUED") return "Cancelled";
  if (raw === "ACTIVE") return "In Progress";
  return "Scheduled";
}

export function isOpenPlan(rawStatus: string | null | undefined): boolean {
  return !CLOSED_PLAN_STATUSES.includes(String(rawStatus ?? "").toUpperCase());
}

/* The subset of an OrderRow the bottom widgets read. Structural, so the
   page's OrderRow (and a test fixture) can be passed without casting. */
export interface OrderWidgetRow {
  plan_id: string;
  patient_name: string;
  protocol: string;
  cycle_label: string;
  cycles_label: string;
  cycle_progress: number;
  /* The plan's treatment_start_date. Optional because older callers/tests
     built rows before the Start Date column existed. */
  start_date?: string;
  next_cycle_date: string;
  raw_status: string;
}

/* "Cycle Progress": open plans that have completed at least one cycle,
   furthest along first. */
export function getCycleProgress<T extends OrderWidgetRow>(
  rows: readonly T[],
  limit = 5
): T[] {
  return [...rows]
    .filter((row) => isOpenPlan(row.raw_status) && row.cycle_progress > 0)
    .sort(
      (a, b) =>
        b.cycle_progress - a.cycle_progress ||
        toTime(a.next_cycle_date) - toTime(b.next_cycle_date)
    )
    .slice(0, limit);
}

/* The date a row should show in "Upcoming Cycles", or "" if it has none.
 *
 * The plan's own start date is checked FIRST: while the treatment has not
 * started yet and its start date is still ahead, the upcoming event is that
 * start (the next-cycle date of a not-yet-started plan is meaningless).
 * Only once the start date is today/past does the next-cycle / follow-up date
 * matter -- and it, too, has to be strictly after today (IST). Today's dates
 * belong to "Orders Due Today", never to Upcoming.
 */
export function upcomingDateOf(row: OrderWidgetRow): string {
  const today = todayIstKey();

  const startDay = istDayKey(row.start_date);
  if (startDay !== null && startDay > today) return row.start_date as string;

  const nextDay = istDayKey(row.next_cycle_date);
  if (nextDay !== null && nextDay > today) return row.next_cycle_date;

  return "";
}

/* "Upcoming Cycles": open plans with a future start / next-cycle date (see
   upcomingDateOf), soonest effective date first. */
export function getUpcomingCycles<T extends OrderWidgetRow>(
  rows: readonly T[],
  limit = 5
): T[] {
  return [...rows]
    .filter((row) => isOpenPlan(row.raw_status) && !!upcomingDateOf(row))
    .sort((a, b) => toTime(upcomingDateOf(a)) - toTime(upcomingDateOf(b)))
    .slice(0, limit);
}

export interface OrderStatusSnapshotEntry {
  status: OrderStatus;
  count: number;
  /* 0-100, share of all loaded orders. */
  pct: number;
}

/* "Order Status Snapshot": one entry per status, in ORDER_STATUSES order. */
export function getStatusSnapshot(
  rows: readonly { raw_status: string }[]
): OrderStatusSnapshotEntry[] {
  const total = rows.length;
  return ORDER_STATUSES.map((status) => {
    const count = rows.filter((row) => orderStatusOf(row.raw_status) === status).length;
    return { status, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 };
  });
}
