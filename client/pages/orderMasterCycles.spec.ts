import { describe, expect, it } from "vitest";
import type { ChemoPlan } from "@/api/chemotherapy.api";
import {
  avatarFor,
  fmtDate,
  getCycleProgress,
  getInitials,
  getStatusSnapshot,
  getUpcomingCycles,
  isOverdue,
  isTodayIso,
  orderStatusOf,
  summarizeCycles,
  toTime,
  upcomingDateOf,
} from "./orderMasterCycles";

/* Minimal plan factory - only the fields the helpers read matter here. */
function plan(overrides: Partial<ChemoPlan> = {}): ChemoPlan {
  return {
    chemotherapy_plan_id: "CP0001",
    patient_id: "PT0001",
    patient_history_id: "PH0001",
    diagnosis_id: "DG0001",
    branch_id: "BR0001",
    treatment_start_date: "2026-01-05T00:00:00.000Z",
    planned_cycles: 6,
    completed_cycles: 0,
    cycle_interval_days: 21,
    treatment_status: "PLANNED",
    chemotherapy_cycle: [
      { chemotherapy_cycle_id: "CC1", cycle_number: 1, cycle_status: "PLANNED", planned_date: "2026-01-05T00:00:00.000Z" },
      { chemotherapy_cycle_id: "CC2", cycle_number: 2, cycle_status: "PLANNED", planned_date: "2026-01-26T00:00:00.000Z" },
      { chemotherapy_cycle_id: "CC3", cycle_number: 3, cycle_status: "PLANNED", planned_date: "2026-02-16T00:00:00.000Z" },
      { chemotherapy_cycle_id: "CC4", cycle_number: 4, cycle_status: "PLANNED", planned_date: "2026-03-09T00:00:00.000Z" },
      { chemotherapy_cycle_id: "CC5", cycle_number: 5, cycle_status: "PLANNED", planned_date: "2026-03-30T00:00:00.000Z" },
      { chemotherapy_cycle_id: "CC6", cycle_number: 6, cycle_status: "PLANNED", planned_date: "2026-04-20T00:00:00.000Z" },
    ],
    plan_orders: [],
    current_order: null,
    ...overrides,
  } as ChemoPlan;
}

describe("summarizeCycles", () => {
  it("reports 0 / 6 and 'Not started' for an untouched plan (never the last cycle)", () => {
    const s = summarizeCycles(plan());
    expect(s.cycleLabel).toBe("Not started");
    expect(s.cyclesLabel).toBe("0 / 6 cycles done");
    expect(s.progress).toBe(0);
    expect(s.nextCycleDate).toBe("2026-01-05T00:00:00.000Z");
    expect(s.currentCycleId).toBe("CC1");
  });

  it("reads the day being worked on from the first still-ORDERED order", () => {
    const s = summarizeCycles(
      plan({
        treatment_status: "ACTIVE",
        completed_cycles: 1,
        plan_orders: [
          { plan_order_id: "PO1", chemotherapy_plan_id: "CP0001", chemotherapy_cycle_id: "CC1", cycle_number: 1, cycle_day: 1, order_status: "COMPLETED", hydration_saved: false },
          { plan_order_id: "PO2", chemotherapy_plan_id: "CP0001", chemotherapy_cycle_id: "CC2", cycle_number: 2, cycle_day: 1, order_status: "ORDERED", hydration_saved: false },
        ],
      })
    );
    expect(s.cycleLabel).toBe("Cycle 2 / Day 1");
    expect(s.cyclesLabel).toBe("1 / 6 cycles done");
    expect(s.progress).toBe(17);
    expect(s.currentCycleId).toBe("CC2");
    expect(s.nextCycleDate).toBe("2026-01-26T00:00:00.000Z");
  });

  it("reads the day being administered when no day is still ORDERED", () => {
    const s = summarizeCycles(
      plan({
        treatment_status: "ACTIVE",
        plan_orders: [
          { plan_order_id: "PO1", chemotherapy_plan_id: "CP0001", chemotherapy_cycle_id: "CC1", cycle_number: 1, cycle_day: 1, order_status: "COMPLETED", hydration_saved: false },
          { plan_order_id: "PO2", chemotherapy_plan_id: "CP0001", chemotherapy_cycle_id: "CC1", cycle_number: 1, cycle_day: 2, order_status: "IN_ADMINISTRATION", hydration_saved: false },
        ],
      })
    );
    expect(s.cycleLabel).toBe("Cycle 1 / Day 2");
    expect(s.currentCycleId).toBe("CC1");
  });

  it("prefers a day still being ORDERED over one being administered", () => {
    const s = summarizeCycles(
      plan({
        treatment_status: "ACTIVE",
        plan_orders: [
          { plan_order_id: "PO1", chemotherapy_plan_id: "CP0001", chemotherapy_cycle_id: "CC1", cycle_number: 1, cycle_day: 1, order_status: "IN_ADMINISTRATION", hydration_saved: false },
          { plan_order_id: "PO2", chemotherapy_plan_id: "CP0001", chemotherapy_cycle_id: "CC1", cycle_number: 1, cycle_day: 2, order_status: "ORDERED", hydration_saved: false },
        ],
      })
    );
    expect(s.cycleLabel).toBe("Cycle 1 / Day 2");
  });

  it("falls back to the backend's current_order when no day is still ORDERED", () => {
    const s = summarizeCycles(
      plan({
        treatment_status: "COMPLETED",
        completed_cycles: 6,
        current_order: { plan_order_id: "PO9", chemotherapy_plan_id: "CP0001", chemotherapy_cycle_id: "CC6", cycle_number: 6, cycle_day: 1, order_status: "COMPLETED", hydration_saved: false, chemotherapy_plan_items: [], chemotherapy_plan_hydration: [] },
      })
    );
    expect(s.cycleLabel).toBe("Cycle 6 / Day 1");
    expect(s.cyclesLabel).toBe("6 / 6 cycles done");
    expect(s.progress).toBe(100);
    // A closed course has nothing upcoming.
    expect(s.nextCycleDate).toBe("");
  });

  it("skips cycles that are already COMPLETED or CANCELLED when picking the next one", () => {
    const s = summarizeCycles(
      plan({
        treatment_status: "ACTIVE",
        completed_cycles: 1,
        chemotherapy_cycle: [
          { chemotherapy_cycle_id: "CC1", cycle_number: 1, cycle_status: "COMPLETED", next_cycle_date: "2026-01-26T00:00:00.000Z", planned_date: "2026-01-05T00:00:00.000Z" },
          { chemotherapy_cycle_id: "CC2", cycle_number: 2, cycle_status: "CANCELLED", planned_date: "2026-01-26T00:00:00.000Z" },
          { chemotherapy_cycle_id: "CC3", cycle_number: 3, cycle_status: "PLANNED", next_cycle_date: "2026-02-16T00:00:00.000Z", planned_date: "2026-02-16T00:00:00.000Z" },
        ],
      })
    );
    expect(s.nextCycleDate).toBe("2026-02-16T00:00:00.000Z");
    expect(s.currentCycleId).toBe("CC3");
  });

  it("derives the next cycle date from start + interval * completed when no cycle rows exist", () => {
    const s = summarizeCycles(
      plan({ treatment_status: "ACTIVE", completed_cycles: 1, chemotherapy_cycle: [] })
    );
    expect(s.nextCycleDate).toBe("2026-01-26T00:00:00.000Z");
    expect(s.currentCycleId).toBe("");
  });

  it("never uses expected_end_date as the next cycle date", () => {
    const s = summarizeCycles(
      plan({ expected_end_date: "2026-04-20T00:00:00.000Z", chemotherapy_cycle: [] })
    );
    expect(s.nextCycleDate).not.toBe("2026-04-20T00:00:00.000Z");
  });

  it("handles a plan with no planned cycles at all", () => {
    const s = summarizeCycles(plan({ planned_cycles: 0, chemotherapy_cycle: [] }));
    expect(s.cycleLabel).toBe("—");
    expect(s.cyclesLabel).toBe("—");
    expect(s.progress).toBe(0);
  });

  it("moves an in-progress Cycle 1 to Cycle 2's date, not its own start date", () => {
    const s = summarizeCycles(
      plan({
        treatment_status: "ACTIVE",
        plan_orders: [
          { plan_order_id: "PO1", chemotherapy_plan_id: "CP0001", chemotherapy_cycle_id: "CC1", cycle_number: 1, cycle_day: 1, order_status: "IN_ADMINISTRATION", hydration_saved: false },
        ],
      })
    );
    expect(s.currentCycleId).toBe("CC1");
    // Cycle 1 has been started, so "next" is Cycle 2's planned date.
    expect(s.nextCycleDate).toBe("2026-01-26T00:00:00.000Z");
  });

  it("keeps Cycle 1's date while every day of it is still just ORDERED", () => {
    const s = summarizeCycles(
      plan({
        treatment_status: "ACTIVE",
        plan_orders: [
          { plan_order_id: "PO1", chemotherapy_plan_id: "CP0001", chemotherapy_cycle_id: "CC1", cycle_number: 1, cycle_day: 1, order_status: "ORDERED", hydration_saved: false },
        ],
      })
    );
    expect(s.nextCycleDate).toBe("2026-01-05T00:00:00.000Z");
  });

  it("prefers the successor's own next_cycle_date when it has one", () => {
    const s = summarizeCycles(
      plan({
        treatment_status: "ACTIVE",
        chemotherapy_cycle: [
          { chemotherapy_cycle_id: "CC1", cycle_number: 1, cycle_status: "PLANNED", actual_date: "2026-01-06T00:00:00.000Z", planned_date: "2026-01-05T00:00:00.000Z" },
          { chemotherapy_cycle_id: "CC2", cycle_number: 2, cycle_status: "PLANNED", next_cycle_date: "2026-02-20T00:00:00.000Z", planned_date: "2026-01-26T00:00:00.000Z" },
        ],
        plan_orders: [
          { plan_order_id: "PO1", chemotherapy_plan_id: "CP0001", chemotherapy_cycle_id: "CC1", cycle_number: 1, cycle_day: 1, order_status: "IN_ADMINISTRATION", hydration_saved: false },
        ],
      })
    );
    expect(s.currentCycleId).toBe("CC1");
    expect(s.nextCycleDate).toBe("2026-02-20T00:00:00.000Z");
  });

  it("falls back to the current cycle's actual date + interval", () => {
    const s = summarizeCycles(
      plan({
        treatment_status: "ACTIVE",
        chemotherapy_cycle: [
          { chemotherapy_cycle_id: "CC1", cycle_number: 1, cycle_status: "PLANNED", actual_date: "2026-01-07T00:00:00.000Z", planned_date: "2026-01-05T00:00:00.000Z" },
          { chemotherapy_cycle_id: "CC2", cycle_number: 2, cycle_status: "PLANNED", planned_date: null },
        ],
        plan_orders: [
          { plan_order_id: "PO1", chemotherapy_plan_id: "CP0001", chemotherapy_cycle_id: "CC1", cycle_number: 1, cycle_day: 1, order_status: "IN_ADMINISTRATION", hydration_saved: false },
        ],
      })
    );
    // 2026-01-07 + 21 days.
    expect(s.nextCycleDate).toBe("2026-01-28T00:00:00.000Z");
  });

  it("has no next date once the course is discontinued or cancelled", () => {
    for (const status of ["DISCONTINUED", "CANCELLED"]) {
      const s = summarizeCycles(plan({ treatment_status: status }));
      expect(s.nextCycleDate).toBe("");
    }
  });
});

describe("fmtDate", () => {
  it("formats a date-only column in UTC (no off-by-one west of UTC)", () => {
    expect(fmtDate("2026-01-05T00:00:00.000Z")).toBe("Jan 5, 2026");
  });

  it("returns a dash for missing or invalid values", () => {
    expect(fmtDate(null)).toBe("—");
    expect(fmtDate("")).toBe("—");
    expect(fmtDate("not-a-date")).toBe("—");
  });
});

describe("due-today / overdue helpers", () => {
  it("treats today in IST as due today, not overdue", () => {
    // istDayKey adds the IST offset itself, so feed it the real current
    // instant (adding 5.5h here would double-count and land on tomorrow).
    const now = new Date().toISOString();
    expect(isTodayIso(now)).toBe(true);
    expect(isOverdue(now)).toBe(false);
  });

  it("flags past days as overdue and ignores missing values", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(isOverdue(threeDaysAgo)).toBe(true);
    expect(isOverdue(null)).toBe(false);
    expect(isTodayIso(undefined)).toBe(false);
  });

  it("sorts invalid dates to the epoch instead of NaN", () => {
    expect(toTime("not-a-date")).toBe(0);
    expect(toTime(null)).toBe(0);
  });
});

describe("patient avatar", () => {
  it("builds two-letter initials", () => {
    expect(getInitials("Ravi Kumar")).toBe("RK");
    expect(getInitials("Dr. Meera Nair")).toBe("MN");
    expect(getInitials("")).toBe("?");
  });

  it("picks the same palette entry for the same patient id", () => {
    expect(avatarFor("PT0001")).toEqual(avatarFor("PT0001"));
  });
});

/* Minimal OrderRow factory for the status + bottom-widget helpers. */
function orderRow(overrides: Record<string, unknown> = {}) {
  return {
    plan_id: "CP0001",
    patient_name: "Ravi Kumar",
    protocol: "FOLFOX",
    cycle_label: "Cycle 1 / Day 1",
    cycles_label: "0 / 6 cycles done",
    cycle_progress: 0,
    start_date: "2026-01-05T00:00:00.000Z",
    next_cycle_date: "2026-01-05T00:00:00.000Z",
    raw_status: "PLANNED",
    ...overrides,
  };
}

describe("orderStatusOf", () => {
  it("maps the plan's own treatment_status (no lab states)", () => {
    expect(orderStatusOf("PLANNED")).toBe("Scheduled");
    expect(orderStatusOf("ACTIVE")).toBe("In Progress");
    expect(orderStatusOf("COMPLETED")).toBe("Completed");
    expect(orderStatusOf("CANCELLED")).toBe("Cancelled");
    expect(orderStatusOf("DISCONTINUED")).toBe("Cancelled");
  });

  it("is case-insensitive and defaults missing/unknown statuses to Scheduled", () => {
    expect(orderStatusOf("active")).toBe("In Progress");
    expect(orderStatusOf(null)).toBe("Scheduled");
    expect(orderStatusOf(undefined)).toBe("Scheduled");
    expect(orderStatusOf("SOMETHING_ELSE")).toBe("Scheduled");
  });
});

describe("getCycleProgress", () => {
  it("keeps open plans with at least one completed cycle, furthest along first", () => {
    const rows = [
      orderRow({ plan_id: "A", cycle_progress: 20, raw_status: "ACTIVE" }),
      orderRow({ plan_id: "B", cycle_progress: 80, raw_status: "ACTIVE" }),
      orderRow({ plan_id: "C", cycle_progress: 50, raw_status: "PLANNED" }),
      orderRow({ plan_id: "D", cycle_progress: 0, raw_status: "ACTIVE" }),
      orderRow({ plan_id: "E", cycle_progress: 100, raw_status: "COMPLETED" }),
    ];
    expect(getCycleProgress(rows).map((r) => r.plan_id)).toEqual(["B", "C", "A"]);
  });

  it("caps the widget at five rows", () => {
    const rows = Array.from({ length: 8 }, (_, i) =>
      orderRow({ plan_id: `P${i}`, cycle_progress: i * 10 + 10, raw_status: "ACTIVE" })
    );
    expect(getCycleProgress(rows)).toHaveLength(5);
  });
});

describe("getUpcomingCycles", () => {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const inDays = (n: number) => new Date(Date.now() + n * DAY_MS).toISOString();

  it("keeps only open plans whose effective date is strictly after today, soonest first", () => {
    const rows = [
      orderRow({ plan_id: "A", start_date: inDays(-30), next_cycle_date: inDays(5) }),
      orderRow({ plan_id: "B", start_date: inDays(-30), next_cycle_date: inDays(1) }),
      orderRow({ plan_id: "C", start_date: inDays(-30), next_cycle_date: "—" }),
      orderRow({ plan_id: "D", start_date: inDays(-30), next_cycle_date: "" }),
      orderRow({ plan_id: "E", start_date: inDays(-30), next_cycle_date: inDays(1), raw_status: "COMPLETED" }),
      // Today's cycle is "due today", never "upcoming".
      orderRow({ plan_id: "F", start_date: inDays(-30), next_cycle_date: inDays(0) }),
    ];
    expect(getUpcomingCycles(rows).map((r) => r.plan_id)).toEqual(["B", "A"]);
  });

  it("uses a future start date even when the next-cycle date is also in the future", () => {
    const rows = [
      // Plan has not started yet: the start is the upcoming event, not cycle 2.
      orderRow({ plan_id: "NEW", start_date: inDays(3), next_cycle_date: inDays(40) }),
    ];
    const result = getUpcomingCycles(rows);
    expect(result.map((r) => r.plan_id)).toEqual(["NEW"]);
    expect(upcomingDateOf(result[0])).toBe(result[0].start_date);
  });

  it("falls through to the next-cycle date once the start date is today or past", () => {
    const nextCycle = inDays(4);
    const rows = [
      orderRow({ plan_id: "STARTED", start_date: inDays(-10), next_cycle_date: nextCycle }),
      // Start date today = started today; the next cycle still comes later.
      orderRow({ plan_id: "STARTS_TODAY", start_date: inDays(0), next_cycle_date: inDays(21) }),
    ];
    expect(getUpcomingCycles(rows).map((r) => r.plan_id)).toEqual(["STARTED", "STARTS_TODAY"]);
    expect(upcomingDateOf(getUpcomingCycles(rows)[0])).toBe(nextCycle);
  });

  it("drops past cycles and plans with no future date at all", () => {
    const rows = [
      orderRow({ plan_id: "PAST", start_date: inDays(-30), next_cycle_date: inDays(-3) }),
      orderRow({ plan_id: "TODAY", start_date: inDays(-30), next_cycle_date: inDays(0) }),
      orderRow({ plan_id: "NO_DATES", start_date: "", next_cycle_date: "" }),
      orderRow({ plan_id: "FUTURE_START_TODAY", start_date: inDays(0), next_cycle_date: inDays(0) }),
    ];
    expect(getUpcomingCycles(rows)).toEqual([]);
  });

  it("sorts by the effective date, not by whichever column matched", () => {
    const rows = [
      orderRow({ plan_id: "LATER_START", start_date: inDays(10), next_cycle_date: inDays(1) }),
      orderRow({ plan_id: "SOONER_START", start_date: inDays(2), next_cycle_date: inDays(60) }),
      orderRow({ plan_id: "ONGOING", start_date: inDays(-20), next_cycle_date: inDays(5) }),
    ];
    expect(getUpcomingCycles(rows).map((r) => r.plan_id)).toEqual([
      "SOONER_START",
      "ONGOING",
      "LATER_START",
    ]);
  });

  it("caps the widget at five rows", () => {
    const rows = Array.from({ length: 8 }, (_, i) =>
      orderRow({ plan_id: `P${i}`, start_date: inDays(-30), next_cycle_date: inDays(i + 1) })
    );
    const result = getUpcomingCycles(rows);
    expect(result).toHaveLength(5);
    expect(result.map((r) => r.plan_id)).toEqual(["P0", "P1", "P2", "P3", "P4"]);
  });
});

describe("getStatusSnapshot", () => {
  it("counts every status and reports its share of all orders", () => {
    const rows = [
      orderRow({ raw_status: "PLANNED" }),
      orderRow({ raw_status: "ACTIVE" }),
      orderRow({ raw_status: "ACTIVE" }),
      orderRow({ raw_status: "COMPLETED" }),
      orderRow({ raw_status: "DISCONTINUED" }),
    ];
    expect(getStatusSnapshot(rows)).toEqual([
      { status: "Scheduled", count: 1, pct: 20 },
      { status: "In Progress", count: 2, pct: 40 },
      { status: "Completed", count: 1, pct: 20 },
      { status: "Cancelled", count: 1, pct: 20 },
    ]);
  });

  it("returns zeroed percentages for an empty list", () => {
    expect(getStatusSnapshot([]).every((entry) => entry.count === 0 && entry.pct === 0)).toBe(true);
  });
});
