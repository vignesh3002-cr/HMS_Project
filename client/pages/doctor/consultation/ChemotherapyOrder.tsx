import React, { useEffect, useRef, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import API, { getActiveBranchId } from "../../../api/axios";
import { getUser } from "../../../utils/token";
import { Calendar } from "../../../components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../components/ui/popover";
import { UserProfileDropdown } from "../../../components/ui/User_profile_dropdown";
import VoiceToText from "@/components/ui/voicetotext";
import type {
  ConsultationState,
  Drug,
  MeasurementValues,
  RegimenProtocolDay,
  RegimenProtocolDetail,
  RegimenProtocolDilution,
  RegimenProtocolItem,
} from "./types";
import {
  createChemotherapyPlanForPatient,
  formatDateDMY,
  formatPickedDate,
  parseDateValue,
  parsePickedDate,
  toIsoDate,
} from "./helpers";
import { BackIcon, BellIcon, CheckIcon } from "./icons";
import {
  DOSE_CALC_OPTIONS,
  buildDosingSnapshot,
  buildPlanItemsFromOrder,
  computePatientDose,
  defaultDoseCalc,
  normalizeDoseCalc,
  normalizeLegacyDraftDrug,
  parseSex,
  primaryDoseFields,
  resolveDoseCalc,
  resolveTargetAuc,
  summarizeDosingInputs,
  toPositiveNumber,
  type DosingInputs,
  type PatientDoseResult,
} from "./doseCalculation";

/* ============================================================
   CHEMOTHERAPY ORDER COMPONENT
   (combined from client/pages/doctor/chemo.tsx 
    renamed App-style component ChemotherapyOrder to the same
    embedded pattern as LabReview / Diagnosis / DischargeMedication,
    icons moved inside the component to avoid colliding with the
    module-level CheckIcon / BackIcon, original chemo.tsx file
    left untouched)
============================================================ */

/* Parse a MeasurementValues height/weight/bsa string like "170 cm",
   "70 kg", "1.8 m²" back to a number. */
const parseMeasureString = (value: string): number | null => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

type ChemotherapyPlanItem = {
  chemotherapy_plan_item_id: string;
  medicine_id: string;
  drug_role: string | null;
  protocol_dose: number | null;
  protocol_dose_unit: string | null;
  dose_calculation_method?: string | null;
  calculated_dose?: number | string | null;
  calculated_dose_unit?: string | null;
  formulation: string | null;
  dilution_volume: number | null;
  medicine_master: {
    medicine_name: string;
    generic_name: string | null;
    dosage_form: string | null;
    unit: string | null;
  } | null;
};

type ChemotherapyPlan = {
  chemotherapy_plan_id: string;
  protocol_name: string | null;
  regimen_name: string | null;
  regimen_code: string | null;
  treatment_start_date: string | null;
  planned_cycles: number | null;
  completed_cycles: number | null;
  treatment_status: string | null;
  chemotherapy_cycle: {
    cycle_number: number;
    cycle_day: number | null;
  }[] | null;
  chemotherapy_plan_items: ChemotherapyPlanItem[] | null;
  chemotherapy_regimen_protocol: {
    protocol_id: string;
    regimen_code: string | null;
    regimen_name: string | null;
  } | null;
};

const ChemotherapyOrder: React.FC<{
  embedded?: boolean;
  patientId?: string;
  measurements?: MeasurementValues;
  gender?: string;
  age?: string | number | null;
  onNext?: () => void;
}> = ({
  embedded = false,
  patientId,
  measurements,
  gender,
  age,
  onNext,
}) => {
  const [userAvatarUrl, setUserAvatarUrl] = useState<string>(() => localStorage.getItem("user_photo") || "");
  const [avatarLoading, setAvatarLoading] = useState<boolean>(() => !localStorage.getItem("user_photo"));

  const location = useLocation();
  const statePatientId = (
    (location.state as ConsultationState | null)?.patientId ?? ""
  );
  const resolvedPatientId = patientId || statePatientId;

  /* Serum creatinine for Cockcroft-Gault CrCl, used by Carboplatin -
     Calvert rows. It is a lab value, not a vital, so it is entered here. */
  const [serumCreatinine, setSerumCreatinine] = useState("");

  /* Inputs every PRIMARY row's Dose Cal formula uses: height / weight
     from the banner vitals, age / sex from the patient record. */
  const dosingInputs: DosingInputs = useMemo(
    () => ({
      heightCm: parseMeasureString(measurements?.height ?? ""),
      weightKg: parseMeasureString(measurements?.weight ?? ""),
      ageYears: toPositiveNumber(age),
      sex: parseSex(gender),
      serumCreatinine: toPositiveNumber(serumCreatinine),
    }),
    [measurements?.height, measurements?.weight, age, gender, serumCreatinine]
  );
  const dosingSummary = summarizeDosingInputs(dosingInputs);

  const [cycleDay, setCycleDay] = useState("");
  const [startDate, setStartDate] = useState("");
  const [activeTab, setActiveTab] = useState("Chemotherapy Orders");
  const [cycleDayOpen, setCycleDayOpen] = useState(false);
  const [protocolName, setProtocolName] = useState("");
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState("");
  const [discussion, setDiscussion] = useState("");
  const [postChemoInstructions, setPostChemoInstructions] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [premedicationDrugs, setPremedicationDrugs] = useState<Drug[]>(
    []
  );
  const [supportiveDrugs, setSupportiveDrugs] = useState<Drug[]>([]);

  const userTouched = useRef({
    cycleDay: false,
    startDate: false,
    drugs: false,
    premedication: false,
    supportive: false,
  });

  const protocolRef = useRef<RegimenProtocolDetail | null>(null);
  const protocolDaysRef = useRef<RegimenProtocolDay[]>([]);
  const cycleDayRef = useRef<string>("");
  const planIdRef = useRef<string>("");
  /* Snapshot of the previously-scheduled next cycle, captured at the very
     start of mount (before any ref/plan/protocol loads rewrite the shared
     localStorage key), so a returning patient's order can resume at the
     exact cycle/day the last visit scheduled. */
  const storedNextCycleRef = useRef<string>("");
  const planItemsRef = useRef<ChemotherapyPlanItem[]>([]);
  const selectedProtocolIdRef = useRef<string>("");

  /* Administration instructions derived from the selected regimen
     protocol items (route, infusion, frequency, timing, remarks,
     administration detail). */
  type AdminInstruction = {
    id: number;
    medicineName: string;
    route: string;
    infusion: string;
    frequency: string;
    timing: string;
    remarks: string;
    administrationDetail: string;
  };
  const [adminInstructions, setAdminInstructions] = useState<
    AdminInstruction[]
  >([]);

  /* Hydration rows seeded on the selected regimen protocol (document
     Section 3). Each row carries a hydration_stage of PRE or POST. */
  const [hydrationRows, setHydrationRows] = useState<RegimenProtocolDilution[]>(
    []
  );

  /* Edit-in-place state (medication rows) */
  const [editingRow, setEditingRow] = useState<{
    kind: "drug" | "premedication" | "supportive";
    id: number;
  } | null>(null);
  const [editDraft, setEditDraft] = useState<Drug | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const latestCycleRef = useRef<
    NonNullable<ChemotherapyPlan["chemotherapy_cycle"]>[number] | null
  >(null);

  /* Single source of truth for cycle/day: always keeps the ref in sync
     with the state so async protocol loads filter by the CURRENT day
     (never a stale mount-time closure). */
  const updateCycleDay = (value: string) => {
    cycleDayRef.current = value;
    setCycleDay(value);
  };

  const applyNextCycle = (
    protocol: RegimenProtocolDetail | null,
    latestCycle: {
      cycle_number: number;
      cycle_day: number | null;
    } | null,
    baseDateValue?: string | null
  ) => {
    if (!protocol || !resolvedPatientId) return;

    const interval =
      protocol.cycle_interval_days && protocol.cycle_interval_days > 0
        ? protocol.cycle_interval_days
        : null;
    const maxCycles =
      protocol.standard_cycles && protocol.standard_cycles > 0
        ? protocol.standard_cycles
        : Number.POSITIVE_INFINITY;
    const latestCycleNumber = latestCycle?.cycle_number ?? 0;

    /* The cycle/day to be administered on this visit is whatever the
       previous visit scheduled as its "next" (hms_next_cycle). This makes
       the order advance day-by-day within the cycle (Cycle 2 / Day 1 ->
       Cycle 2 / Day 2 -> ...) and roll to the next cycle's Day 1 once a
       cycle completes, instead of always starting at Day 1.
       The stored value is authoritative when the patient has a recorded
       cycle in the DB OR an active treatment plan exists (the plan the
       doctor already saved - so the next scheduled cycle/day is honored
       even before a cycle record exists). A truly brand-new treatment
       (no plan and no recorded cycle) must always present Cycle 1 / Day
       1, never a leftover hms_next_cycle value from an abandoned earlier
       session - which this very function (and the follow-up effect) also
       rewrite during the same mount. */
    const storedParsed =
      latestCycle || planIdRef.current
        ? getCycleAndDay(storedNextCycleRef.current)
        : null;

    let formCycleNumber = storedParsed
      ? storedParsed.cycle
      : latestCycleNumber > 0
      ? latestCycleNumber + 1
      : 1;
    if (formCycleNumber > maxCycles) {
      formCycleNumber = maxCycles;
    }
    const formCycleDay = storedParsed ? storedParsed.day : 1;

    // Never auto-land on a rest day. Once a cycle's meds are entered the
    // next scheduled visit should skip to the next day that actually has
    // drugs in the protocol (some cycles have fewer medication days).
    const snappedFormDay =
      nextAvailableDay(protocol, formCycleDay) ?? formCycleDay;

    const baseDate = parseDateValue(baseDateValue) ?? new Date();
    const baseStart = new Date(baseDate);
    baseStart.setHours(0, 0, 0, 0);

    const formDate = new Date(baseStart);
    formDate.setDate(
      formDate.getDate() + (formCycleNumber - 1) * interval
    );

    const formatDate = (date: Date) => {
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      return `${day}-${month}-${date.getFullYear()}`;
    };

    const formCycleStr = `Cycle ${formCycleNumber} / Day ${snappedFormDay}`;
    const nextAvailable = nextAvailableDay(protocol, snappedFormDay + 1);
    const nextCycleStr =
      nextAvailable != null
        ? `Cycle ${formCycleNumber} / Day ${nextAvailable}`
        : computeNextCycle(formCycleStr, protocol.no_of_days);

    const next = getCycleAndDay(nextCycleStr);
    const nextCycleNumber = (next?.cycle ?? formCycleNumber) > maxCycles
      ? maxCycles
      : (next?.cycle ?? formCycleNumber);

    const nextDate = new Date(baseStart);
    nextDate.setDate(
      nextDate.getDate() + (nextCycleNumber - 1) * interval
    );

    updateCycleDay(formCycleStr);
    setStartDate(formatDate(formDate));
    localStorage.setItem(
      `hms_next_cycle_${resolvedPatientId}`,
      nextCycleStr
    );
    localStorage.setItem(
      `hms_next_cycle_date_${resolvedPatientId}`,
      formatDate(nextDate)
    );
  };

  /* ------------------------------------------------------------
     CYCLE-DAY DRIVEN DRUG FILTERING
     The regimen protocol endpoint returns chemotherapy_regimen_
     protocol_days (one entry per cycle day, each carrying its own
     nested items, and some days marked same_as_day_one). The drugs
     shown in the Chemotherapy Orders / Premedication / Supportive
     tables must reflect only the day selected in the Cycle/Day field
     (some protocols run >6 days, some <6, some exactly 6).
  ------------------------------------------------------------ */

  const getCycleDayNumber = (value: string): number | null => {
    const match = value.trim().match(/Day\s*(\d+)/i);
    return match ? Number(match[1]) : null;
  };

  const getCycleNumber = (value: string): number | null => {
    const match = value.trim().match(/Cycle\s*(\d+)/i);
    return match ? Number(match[1]) : null;
  };

  const getCycleAndDay = (
    value: string
  ): { cycle: number; day: number } | null => {
    const cycle = getCycleNumber(value);
    const day = getCycleDayNumber(value);
    if (cycle === null || day === null) return null;
    return { cycle, day };
  };

  /* Given the CURRENT cycle/day being treated and the protocol's days
     per cycle (no_of_days), compute the next scheduled day:
       - same cycle, next day while the cycle has more days to run
       - next cycle, Day 1 once the current cycle's last day completes
     Rest days (days with no drugs) are skipped using the protocol's
     actual medication days, so protocols with >6 / <6 / exactly 6 days
     advance correctly. */
  const computeNextCycle = (
    cycleDayValue: string,
    noOfDays: number | null
  ): string => {
    const current = getCycleAndDay(cycleDayValue);
    if (!current) return "";
    const protocol = protocolRef.current;
    const medDays = getAvailableDays(protocol);
    const daysPerCycle =
      noOfDays && noOfDays > 0
        ? noOfDays
        : medDays.length > 0
        ? Math.max(...medDays)
        : 6;
    const lastDay = medDays.length > 0 ? medDays[medDays.length - 1] : daysPerCycle;
    if (medDays.length > 0) {
      if (current.day >= lastDay) {
        return `Cycle ${current.cycle + 1} / Day ${medDays[0] ?? 1}`;
      }
      const nextMedDay = medDays.find((d) => d > current.day);
      return `Cycle ${current.cycle} / Day ${nextMedDay ?? (medDays[0] ?? 1)}`;
    }
    if (current.day < daysPerCycle) {
      return `Cycle ${current.cycle} / Day ${current.day + 1}`;
    }
    return `Cycle ${current.cycle + 1} / Day 1`;
  };

  /* A protocol item's day within a cycle, using the field the backend
     actually populates (administration_day) or, failing that, the legacy
     cycle_day. Items without any explicit day belong to Day 1. */
  const protocolItemDay = (item: RegimenProtocolItem): number => {
    const d = Number(item.administration_day ?? item.cycle_day);
    return Number.isFinite(d) && d > 0 ? d : 1;
  };

  /* The distinct cycle days that actually have medication in the protocol,
     derived from the flat items' day (administration_day ?? cycle_day).
     Protocols with rest days (e.g. day 2 has no drugs) simply won't list
     that day here. */
  const getAvailableDays = (
    protocol: RegimenProtocolDetail | null | undefined
  ): number[] => {
    const set = new Set<number>();
    (protocol?.chemotherapy_regimen_protocol_items ?? []).forEach((item) => {
      set.add(protocolItemDay(item));
    });
    return [...set].sort((a, b) => a - b);
  };

  /* The first day >= fromDay that has drugs, so auto-advance never lands
     on a rest day. Returns null when fromDay has passed the last med day
     of the cycle (roll to the next cycle). */
  const nextAvailableDay = (
    protocol: RegimenProtocolDetail | null | undefined,
    fromDay: number
  ): number | null => {
    const days = getAvailableDays(protocol);
    if (days.length === 0) return null;
    return days.find((d) => d >= fromDay) ?? null;
  };

  const resolveProtocolDayItems = (
    days: RegimenProtocolDay[] | null | undefined,
    dayNumber: number
  ): RegimenProtocolItem[] => {
    const entries = days ?? [];

    // A day marked same_as_day_one mirrors the medicines of day 1.
    if (entries.length > 0) {
      const day = entries.find((d) => d.day_number === dayNumber);
      if (day?.same_as_day_one && dayNumber !== 1) {
        const firstDay = entries.find((d) => d.day_number === 1);
        if (firstDay) {
          dayNumber = 1;
        }
      }
    }

    // The daily breakdown is not an array of items per day; instead the
    // flat chemotherapy_regimen_protocol_items rows carry a day (either
    // administration_day or cycle_day) that maps them onto a protocol
    // day. Filter them the same way the backend's day view does.
    const flat = protocolRef.current?.chemotherapy_regimen_protocol_items ?? [];
    return flat.filter((item) => protocolItemDay(item) === dayNumber);
  };

  const toDrugFromItem = (
    item: RegimenProtocolItem,
    index: number
  ): Drug => ({
    id: index,
    name:
      item.medicine_master?.medicine_name ||
      item.medicine_master?.generic_name ||
      "",
    form:
      item.medicine_master?.dosage_form ||
      item.administration_route ||
      "",
    /* Protocol dose as written (mg/m², mg/kg, ...); the Patient Dose
       column applies the row's Dose Cal formula. The unit comes from the
       protocol only - medicine_master.unit is "mg" for almost every drug
       and would turn per-m² doses into flat ones. */
    dose: item.dosage != null ? String(Number(item.dosage)) : "",
    unit: item.dosage_unit || "",
    volume: "",
    medicineId: item.medicine_id,
    protocolDoseCalc: item.dose_calculation_method ?? null,
    doseCalc: defaultDoseCalc(item.dosage_unit, item.dose_calculation_method),
  });

  const applyCycleDayDrugs = (
    dayValue: string,
    days: RegimenProtocolDay[] | null | undefined
  ) => {
    let dayNumber = getCycleDayNumber(dayValue);

    // If the selected day is a rest day (or not parseable) but the
    // protocol has medication days, snap forward to the next day that
    // actually has drugs so the tables are never empty. Explicitly valid
    // medication days are left untouched.
    const available = getAvailableDays(protocolRef.current);
    if (available.length > 0 && (dayNumber == null || !available.includes(dayNumber))) {
      const fallback =
        available.find((d) => d >= (dayNumber ?? 1)) ?? available[0];
      dayNumber = fallback;
    }

    // Show only the medicines mapped to the selected cycle's day. Protocols
    // with items that have no explicit day treat all of them as Day 1. If a
    // valid day is missing, show nothing (never dump the whole cycle across
    // every day).
    const items =
      dayNumber != null ? resolveProtocolDayItems(days, dayNumber) : [];

    setDrugs(
      items
        .filter((item) => item.drug_role === "PRIMARY")
        .map(toDrugFromItem)
    );
    setPremedicationDrugs(
      items
        .filter((item) => item.drug_role?.toUpperCase() === "PREMEDICATION")
        .map(toDrugFromItem)
    );
    setSupportiveDrugs(
      items
        .filter((item) => item.drug_role === "SUPPORTIVE")
        .map(toDrugFromItem)
    );
    setAdminInstructions(
      items.map((item, index) => ({
        id: index,
        medicineName:
          item.medicine_master?.medicine_name ||
          item.medicine_master?.generic_name ||
          "",
        route: item.administration_route || "",
        infusion: [
          item.infusion_type,
          item.infusion_duration_minutes != null
            ? `${item.infusion_duration_minutes} min`
            : "",
        ]
          .filter(Boolean)
          .join(" · "),
        frequency: item.frequency || "",
        timing: item.timing_relative_to_primary || "",
        remarks: item.remarks || "",
        administrationDetail: item.administration_detail || "",
      }))
    );
    setHydrationRows(
      (protocolRef.current?.protocol_dilutions ?? [])
        .filter((dilution) => !!dilution.hydration_stage)
        .sort((a, b) => {
          const rank = (stage: string | null) =>
            (stage ?? "").toUpperCase() === "PRE" ? 0 : 1;
          const byStage = rank(a.hydration_stage) - rank(b.hydration_stage);
          if (byStage !== 0) return byStage;
          return (a.diluent ?? "").localeCompare(b.diluent ?? "");
        })
    );
  };

  const orderDraftKey = `hms_chemo_order_${resolvedPatientId}`;

  useEffect(() => {
    if (!resolvedPatientId) return;
    const saved = localStorage.getItem(orderDraftKey);

    if (!saved) return;

    try {
      const data = JSON.parse(saved) as {
        cycleDay?: string;
        startDate?: string;
        drugs?: Drug[];
        premedicationDrugs?: Drug[];
        supportiveDrugs?: Drug[];
        discussion?: string;
        postChemoInstructions?: string;
        additionalNotes?: string;
        serumCreatinine?: string;
      };

      if (data.cycleDay) {
        updateCycleDay(data.cycleDay);
        userTouched.current.cycleDay = true;
      }

      if (data.discussion) {
        setDiscussion(data.discussion);
      }

      if (data.postChemoInstructions) {
        setPostChemoInstructions(data.postChemoInstructions);
      }

      if (data.additionalNotes) {
        setAdditionalNotes(data.additionalNotes);
      }

      if (data.serumCreatinine) {
        setSerumCreatinine(data.serumCreatinine);
      }

      if (data.startDate) {
        setStartDate(data.startDate);
        userTouched.current.startDate = true;
      }

      if (Array.isArray(data.drugs) && data.drugs.length > 0) {
        setDrugs(data.drugs.map(normalizeLegacyDraftDrug));
        userTouched.current.drugs = true;
      }

      if (
        Array.isArray(data.premedicationDrugs) &&
        data.premedicationDrugs.length > 0
      ) {
        setPremedicationDrugs(
          data.premedicationDrugs.map(normalizeLegacyDraftDrug)
        );
        userTouched.current.premedication = true;
      }

      if (
        Array.isArray(data.supportiveDrugs) &&
        data.supportiveDrugs.length > 0
      ) {
        setSupportiveDrugs(data.supportiveDrugs.map(normalizeLegacyDraftDrug));
        userTouched.current.supportive = true;
      }
    } catch (error) {
      console.error("Failed to restore chemotherapy order draft:", error);
    }
  }, [orderDraftKey, resolvedPatientId]);

  useEffect(() => {
    if (!resolvedPatientId) return;
    localStorage.setItem(
      orderDraftKey,
      JSON.stringify({
        cycleDay: userTouched.current.cycleDay ? cycleDay : "",
        startDate: userTouched.current.startDate ? startDate : "",
        drugs: userTouched.current.drugs ? drugs : [],
        premedicationDrugs: userTouched.current.premedication
          ? premedicationDrugs
          : [],
        supportiveDrugs: userTouched.current.supportive
          ? supportiveDrugs
          : [],
        discussion,
        postChemoInstructions,
        additionalNotes,
        serumCreatinine,
        /* Discharge Medication rebuilds the plan items from this draft
           with the same Dose Cal inputs. */
        dosingInputs,
      })
    );
  }, [
    cycleDay,
    startDate,
    drugs,
    premedicationDrugs,
    supportiveDrugs,
    discussion,
    postChemoInstructions,
    additionalNotes,
    serumCreatinine,
    dosingInputs,
    orderDraftKey,
    resolvedPatientId,
  ]);

  const tabs = [
    "Chemotherapy Orders",
    "Premedication",
    "Supportive",
    "Hydration",
    "Admin Instructions",
  ];

  /* Number of days selectable for the current cycle, driven by the
     protocol's no_of_days (falling back to the distinct administration
     days present in the flat items). */
  const protocolDayCount = (() => {
    const explicit = Number(
      protocolRef.current?.no_of_days ?? null
    );
    if (Number.isFinite(explicit) && explicit > 0) return explicit;
    const adminDays = new Set<number>();
    (protocolRef.current?.chemotherapy_regimen_protocol_items ?? []).forEach(
      (item) => {
        const d = Number(item.administration_day ?? item.cycle_day);
        if (Number.isFinite(d) && d > 0) adminDays.add(d);
      }
    );
    return adminDays.size > 0 ? Math.max(...adminDays) : 6;
  })();

  /* The distinct days selectable for the current cycle, driven by the
     protocol's no_of_days (all days 1..N regardless of which days
     have items) merged with the distinct item-level days. This ensures
     the day-selector always matches the protocol header's day count. */
  const availableDays = (() => {
    const set = new Set<number>(getAvailableDays(protocolRef.current));
    const explicit = Number(protocolRef.current?.no_of_days ?? null);
    if (Number.isFinite(explicit) && explicit > 0) {
      for (let i = 1; i <= explicit; i++) set.add(i);
    } else if (set.size === 0) {
      return Array.from({ length: protocolDayCount }, (_, i) => i + 1);
    }
    return [...set].sort((a, b) => a - b);
  })();

  /* The distinct cycles (1..standard_cycles) available for the selected
     protocol, used to render the cycle-selector checkboxes. */
  const availableCycles = (() => {
    const total = Number(protocolRef.current?.standard_cycles ?? 0);
    if (Number.isFinite(total) && total > 0) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    return Array.from({ length: 6 }, (_, i) => i + 1);
  })();

  /* Set the cycle while preserving the currently selected day (clamped to
     the protocol's available days). Updates the Cycle / Day field and
     refetches that cycle's medications. */
  const selectCycle = (cycle: number) => {
    const currentDay = getCycleDayNumber(cycleDay) ?? availableDays[0] ?? 1;
    const day = availableDays.includes(currentDay)
      ? currentDay
      : (availableDays[0] ?? 1);
    const value = `Cycle ${cycle} / Day ${day}`;
    updateCycleDay(value);
    applySelectedDay(value);
  };

  /* Jump to a specific day in the current cycle, preserving the cycle
     number already selected in the Cycle / Day field. The filtered drugs
     are applied immediately (synchronously) so the tables update the
     instant the day is picked. */
  const selectDay = (day: number) => {
    const currentCycle = getCycleNumber(cycleDay) || 1;
    const value = `Cycle ${currentCycle} / Day ${day}`;
    updateCycleDay(value);
    applySelectedDay(value);
  };

  /* Apply the day's filtered drugs to the three tables. If the regimen
     protocol has not been loaded yet for this session, load it on demand
     (using the stored protocol id) so selecting a day always fetches that
     day's drugs instead of leaving the tables empty. */
  const applySelectedDay = async (value: string) => {
    if (protocolRef.current) {
      applyCycleDayDrugs(value, protocolDaysRef.current);
      return;
    }
    const protocolId = selectedProtocolIdRef.current;
    if (!protocolId) {
      applyCycleDayDrugs(value, protocolDaysRef.current);
      return;
    }
    try {
      const protocolResponse = await API.get<{
        success: boolean;
        data: RegimenProtocolDetail;
      }>(`/chemotherapy/regimen-protocols/${protocolId}`);
      const protocol = protocolResponse.data.data;
      protocolRef.current = protocol;
      protocolDaysRef.current = protocol.chemotherapy_regimen_protocol_days ?? [];
      setProtocolName(
        protocol.regimen_code
          ? `${protocol.regimen_code} - ${protocol.regimen_name}`
          : protocol.regimen_name
      );
      applyCycleDayDrugs(value, protocolDaysRef.current);
    } catch (error) {
      console.error("Failed to load regimen protocol on day select:", error);
    }
  };

  const handleNext = async () => {
    if (savingPlan) return;

    if (!resolvedPatientId) {
      setPlanError(
        "Patient is not selected. Open this page from a patient consultation to continue."
      );
      return;
    }

    const hasAnyData = cycleDay.trim() || startDate.trim();

    if (!hasAnyData) {
      setPlanError(
        "Please select or enter the important field in the previous form."
      );
      return;
    }

    setPlanError("");
    setSavingPlan(true);

    let navigated = false;
    const navigateNext = () => {
      if (navigated) return;
      navigated = true;
      onNext?.();
    };
    const navigateTimer = setTimeout(navigateNext, 500);

    const saveOrder = async () => {
      const planItems = buildPlanItemsFromOrder(
        drugs,
        premedicationDrugs,
        supportiveDrugs,
        dosingInputs
      );

      const planStartDate =
        toIsoDate(startDate) ||
        toIsoDate(
          localStorage.getItem(`hms_planned_start_date_${resolvedPatientId}`)
        ) ||
        toIsoDate(new Date().toISOString());

      return createChemotherapyPlanForPatient(
        resolvedPatientId,
        planStartDate,
        planItems.length > 0 ? planItems : undefined,
        undefined,
        discussion,
        buildDosingSnapshot(dosingInputs)
      );
    };

    try {
      const { error } = await saveOrder();

      if (error) {
        clearTimeout(navigateTimer);
        setPlanError(error);
        return;
      }

      clearTimeout(navigateTimer);
      navigateNext();
    } catch (err: any) {
      clearTimeout(navigateTimer);
      console.error("Failed to save chemotherapy order:", err);
      setPlanError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to save chemotherapy order. Please try again."
      );
    } finally {
      setSavingPlan(false);
    }
  };

  const formatDateDMY = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${day}-${month}-${date.getFullYear()}`;
  };

  useEffect(() => {
    if (!resolvedPatientId) return;
    let cancelled = false;
    setPlanLoading(true);
    setPlanError("");

    /* Snapshot the previously scheduled next cycle/day BEFORE any protocol
       or plan load rewrites hms_next_cycle during this mount, so a
       returning visit resumes at the exact cycle the last visit planned
       (e.g. Cycle 2 / Day 1 -> Cycle 2 / Day 2). */
    storedNextCycleRef.current =
      localStorage.getItem(`hms_next_cycle_${resolvedPatientId}`) ?? "";

    const savedStartDate = localStorage.getItem(
      `hms_planned_start_date_${resolvedPatientId}`
    );
    if (!userTouched.current.startDate) {
      const isoMatch = savedStartDate
        ?.trim()
        .match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        setStartDate(`${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1]}`);
      } else if (savedStartDate) {
        setStartDate(savedStartDate.trim());
      }
    }
    if (!userTouched.current.cycleDay) {
      updateCycleDay("Cycle 1 / Day 1");
    }

    const savedProtocolId = localStorage.getItem(
      `hms_selected_protocol_id_${resolvedPatientId}`
    );
    if (savedProtocolId) {
      selectedProtocolIdRef.current = savedProtocolId;
    }

    const loadRegimenProtocol = async (protocolId: string) => {
      try {
        const protocolResponse = await API.get<{
          success: boolean;
          data: RegimenProtocolDetail;
        }>(`/chemotherapy/regimen-protocols/${protocolId}`);
        if (cancelled) return;
        const protocol = protocolResponse.data.data;
        setProtocolName(
          protocol.regimen_code
            ? `${protocol.regimen_code} - ${protocol.regimen_name}`
            : protocol.regimen_name
        );
        const items =
          protocol.chemotherapy_regimen_protocol_items ?? [];

        protocolRef.current = protocol;
        protocolDaysRef.current = protocol.chemotherapy_regimen_protocol_days ?? [];
        applyCycleDayDrugs(cycleDayRef.current, protocolDaysRef.current);
        applyNextCycle(protocol, latestCycleRef.current, savedStartDate);
      } catch (error) {
        console.error("Failed to load regimen protocol:", error);
        if (!cancelled) {
          setPlanError(
            error?.response?.data?.message ||
              "Failed to load the regimen protocol."
          );
        }
      }
    };

    if (savedProtocolId) {
      void loadRegimenProtocol(savedProtocolId);
    }

    API.get<{ success: boolean; data: ChemotherapyPlan[] }>(
      "/chemotherapy/plans",
      {
        params: {
          patient_id: resolvedPatientId,
          branchId:
            getActiveBranchId() ?? getUser()?.branch_id ?? undefined,
        },
      }
    )
      .then((response) => {
        if (cancelled) return;
        const plans = response.data.data;
        const plan = plans[0];
        if (!plan) return;

        planIdRef.current = plan.chemotherapy_plan_id;

        const planItems = plan.chemotherapy_plan_items ?? [];
        planItemsRef.current = planItems;

        if (!userTouched.current.startDate) {
          setStartDate(formatDateDMY(plan.treatment_start_date));
        }

        const cycles = plan.chemotherapy_cycle ?? [];
        const latestCycle = cycles[cycles.length - 1] ?? null;
        latestCycleRef.current = latestCycle;
        if (!userTouched.current.cycleDay) {
          updateCycleDay(
            latestCycle
              ? `Cycle ${latestCycle.cycle_number} / Day ${
                  latestCycle.cycle_day ?? ""
                }`
              : "Cycle 1 / Day 1"
          );
        }
        applyNextCycle(
          protocolRef.current,
          latestCycle,
          plan.treatment_start_date
        );

        if (!savedProtocolId) {
          setProtocolName(
            plan.protocol_name || plan.regimen_name || ""
          );
          const toPlanDrug = (
            item: ChemotherapyPlanItem,
            index: number
          ): Drug => ({
            id: index,
            planItemId: item.chemotherapy_plan_item_id,
            name:
              item.medicine_master?.medicine_name ||
              item.medicine_master?.generic_name ||
              "",
            form:
              item.formulation ||
              item.medicine_master?.dosage_form ||
              "",
            dose:
              item.protocol_dose != null
                ? String(Number(item.protocol_dose))
                : "",
            unit: item.protocol_dose_unit || "",
            volume:
              item.dilution_volume != null
                ? `${item.dilution_volume}`
                : "",
            medicineId: item.medicine_id,
            doseCalc: normalizeDoseCalc(item.dose_calculation_method) ?? undefined,
          });

          setDrugs(
            planItems
              .filter((item) => item.drug_role === "PRIMARY")
              .map(toPlanDrug)
          );
          setPremedicationDrugs(
            planItems
              .filter((item) => item.drug_role?.toUpperCase() === "PREMEDICATION")



              .map(toPlanDrug)
          );
          setSupportiveDrugs(
            planItems
              .filter((item) => item.drug_role === "SUPPORTIVE")
              .map(toPlanDrug)
          );

          const protocolId =
            plan.chemotherapy_regimen_protocol?.protocol_id;
          if (protocolId) {
            selectedProtocolIdRef.current = String(protocolId);
            void loadRegimenProtocol(String(protocolId));
          }
        }
      })
      .catch((error) => {
        console.error("Failed to load chemotherapy plans:", error);
        if (!cancelled) {
          setPlanError(
            error?.response?.data?.message ||
              "Failed to load chemotherapy orders."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setPlanLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [resolvedPatientId]);

  useEffect(() => {
    if (!resolvedPatientId) return;
    setSupportiveDrugs([]);
  }, [resolvedPatientId]);

  /* Re-apply the role-filtered drugs whenever the selected cycle
     day changes so the tables reflect that day's regimen. The ref is the
     single source of truth (kept in sync by updateCycleDay), so async
     loads never filter by a stale mount-time value. We only overwrite
     the ref when a real value is present, preserving the default set on
     first mount. */
  useEffect(() => {
    if (!resolvedPatientId) return;
    if (cycleDay.trim()) {
      cycleDayRef.current = cycleDay;
    }
    applyCycleDayDrugs(cycleDayRef.current, protocolDaysRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleDay, resolvedPatientId]);

  /* Keep the Follow-Up "Next Cycle" label in sync with the cycle/day
     selected in this form and the protocol's days-per-cycle. When the
     current day is not the cycle's last day, the next entry is the next
     day of the same cycle (e.g. Cycle 2 / Day 1 -> Cycle 2 / Day 2);
     once the last day is reached it rolls to the next cycle Day 1. */
  useEffect(() => {
    if (!resolvedPatientId) return;
    const protocol = protocolRef.current;
    if (!protocol) return;
    const next = computeNextCycle(cycleDay, protocol.no_of_days);
    if (next) {
      localStorage.setItem(`hms_next_cycle_${resolvedPatientId}`, next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleDay, resolvedPatientId]);

  const handleAddDrug = () => {
    userTouched.current.drugs = true;

    const newDrug: Drug = {
      id: Date.now(),
      name: "",
      form: "",
      dose: "",
      unit: "",
      volume: "",
    };

    setDrugs((current) => [...current, newDrug]);
  };

  const handleDelete = (id: number) => {
    userTouched.current.drugs = true;

    setDrugs((current) =>
      current.filter((drug) => drug.id !== id)
    );
  };

  /* Dose Cal / target AUC change on a PRIMARY row that isn't in edit mode. */
  const updatePrimaryDrug = (id: number, patch: Partial<Drug>) => {
    userTouched.current.drugs = true;
    setDrugs((current) =>
      current.map((drug) => (drug.id === id ? { ...drug, ...patch } : drug))
    );
  };

  const startEdit = (
    kind: "drug" | "premedication" | "supportive",
    drug: Drug
  ) => {
    if (editingRow || savingEdit) return;

    userTouched.current[
      kind === "drug" ? "drugs" : kind === "premedication" ? "premedication" : "supportive"
    ] = true;
    setEditError("");
    setEditingRow({ kind, id: drug.id });
    setEditDraft({ ...drug });
  };

  const handleEdit = (id: number) => {
    const drug = drugs.find((item) => item.id === id);

    if (drug) {
      startEdit("drug", drug);
    }
  };

  const handleEditPremedication = (id: number) => {
    const drug = premedicationDrugs.find(
      (item) => item.id === id
    );

    if (drug) {
      startEdit("premedication", drug);
    }
  };

  const handleEditSupportive = (id: number) => {
    const drug = supportiveDrugs.find((item) => item.id === id);

    if (drug) {
      startEdit("supportive", drug);
    }
  };

  const cancelEdit = () => {
    if (savingEdit) return;

    setEditingRow(null);
    setEditDraft(null);
    setEditError("");
  };

  const updateEditDraft = (field: keyof Drug, value: string) => {
    setEditDraft((previous) =>
      previous
        ? {
            ...previous,
            [field]: value,
          }
        : previous
    );
  };

  const resolvePlanItemId = (
    kind: "drug" | "premedication" | "supportive",
    name: string,
    medicineId?: string
  ) => {
    const role =
      kind === "drug"
        ? "PRIMARY"
        : kind === "premedication"
        ? "PREMEDICATION"
        : "SUPPORTIVE";
    const normalizedName = name.trim().toLowerCase();

    // 1. Exact medicine_id match within same role
    if (medicineId) {
      const byId = planItemsRef.current.find(
        (item) =>
          item.medicine_id === medicineId &&
          item.drug_role?.toUpperCase() === role
      );
      if (byId) return byId.chemotherapy_plan_item_id;

      // 2. Exact medicine_id match across any role
      const byIdAnyRole = planItemsRef.current.find(
        (item) => item.medicine_id === medicineId
      );
      if (byIdAnyRole) return byIdAnyRole.chemotherapy_plan_item_id;
    }

    // 3. Name match within same role
    const candidates = planItemsRef.current.filter(
      (item) =>
        !item.drug_role || item.drug_role.toUpperCase() === role
    );

    let matched =
      candidates.find(
        (item) =>
          (
            item.medicine_master?.medicine_name ||
            item.medicine_master?.generic_name ||
            ""
          )
            .trim()
            .toLowerCase() === normalizedName
      );

    // 4. Name match across any role
    if (!matched) {
      matched = planItemsRef.current.find(
        (item) =>
          (
            item.medicine_master?.medicine_name ||
            item.medicine_master?.generic_name ||
            ""
          )
            .trim()
            .toLowerCase() === normalizedName
      );
    }

    // 5. Partial name match
    if (!matched && normalizedName) {
      matched = planItemsRef.current.find(
        (item) => {
          const item_name = (
            item.medicine_master?.medicine_name ||
            item.medicine_master?.generic_name ||
            ""
          ).trim().toLowerCase();
          return item_name.includes(normalizedName) || normalizedName.includes(item_name);
        }
      );
    }

    return matched?.chemotherapy_plan_item_id ?? "";
  };

  const saveEditedDrug = async () => {
    if (!editDraft || !editingRow || savingEdit) return;

    const trimmedDose = editDraft.dose.trim();

    if (trimmedDose && Number.isNaN(Number(trimmedDose))) {
      setEditError("Dose must be a valid number.");
      return;
    }

    try {
      setSavingEdit(true);
      setEditError("");

      let planItemId = "";

      if (planIdRef.current) {
        planItemId =
          editDraft.planItemId ||
          resolvePlanItemId(editingRow.kind, editDraft.name, editDraft.medicineId);

        if (!planItemId && editDraft.medicineId) {
          try {
            const createRes = await API.post(
              `/chemotherapy/plans/${planIdRef.current}/items`,
              {
                medicine_id: editDraft.medicineId,
                drug_role:
                  editingRow.kind === "drug"
                    ? "PRIMARY"
                    : editingRow.kind === "premedication"
                    ? "PREMEDICATION"
                    : "SUPPORTIVE",
                drug_sequence: planItemsRef.current.length + 1,
                dosage: trimmedDose === "" ? null : Number(trimmedDose),
                dosage_unit: editDraft.unit.trim() || null,
                ...(editingRow.kind === "drug"
                  ? primaryDoseFields(editDraft, dosingInputs)
                  : {}),
              }
            );
            const planData = createRes.data?.data;
            const newItems: ChemotherapyPlanItem[] = planData?.chemotherapy_plan_items ?? [];
            const created = newItems.find(
              (i) => i.medicine_id === editDraft.medicineId
            );
            if (created) {
              planItemId = created.chemotherapy_plan_item_id;
              editDraft.planItemId = planItemId;
              planItemsRef.current = newItems;
            }
          } catch (createErr: any) {
            console.error("Failed to create plan item:", createErr);
          }
        }

        if (!planItemId) {
          console.error("resolvePlanItemId failed:", {
            kind: editingRow.kind,
            name: editDraft.name,
            medicineId: editDraft.medicineId,
            planItemCount: planItemsRef.current.length,
            planItems: planItemsRef.current.map((i) => ({
              id: i.chemotherapy_plan_item_id,
              medicineId: i.medicine_id,
              name: i.medicine_master?.medicine_name,
              role: i.drug_role,
            })),
          });
          throw new Error(
            "Could not match this medication to the patient's chemotherapy plan. The plan may not have been saved yet — complete the Treatment Plan step first."
          );
        }

        await API.put(
          `/chemotherapy/plans/${planIdRef.current}/items/${planItemId}`,
          {
            dosage: trimmedDose === "" ? null : Number(trimmedDose),
            dosage_unit: editDraft.unit.trim() || null,
            ...(editingRow.kind === "drug"
              ? primaryDoseFields(editDraft, dosingInputs)
              : {}),
          }
        );

        editDraft.planItemId = planItemId;
      } else {
        throw new Error(
          "No chemotherapy plan found for this patient. Complete the Treatment Plan step first."
        );
      }

      const updatedDrug: Drug = { ...editDraft };

      if (editingRow.kind === "drug") {
        setDrugs((current) =>
          current.map((item) =>
            item.id === editingRow.id ? updatedDrug : item
          )
        );
      } else if (editingRow.kind === "premedication") {
        setPremedicationDrugs((current) =>
          current.map((item) =>
            item.id === editingRow.id ? updatedDrug : item
          )
        );
      } else {
        setSupportiveDrugs((current) =>
          current.map((item) =>
            item.id === editingRow.id ? updatedDrug : item
          )
        );
      }

      setEditingRow(null);
      setEditDraft(null);
    } catch (error: any) {
      console.error("Failed to save medication changes:", error);
      setEditError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to save the medication changes. Please try again."
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeletePremedication = (id: number) => {
    userTouched.current.premedication = true;

    setPremedicationDrugs((current) =>
      current.filter((drug) => drug.id !== id)
    );
  };

  const handleDeleteSupportive = (id: number) => {
    userTouched.current.supportive = true;

    setSupportiveDrugs((current) => current.filter((drug) => drug.id !== id));
  };

  /* Icons (scoped inside the component) */

  const BackIcon = () => (
    <svg
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path
        d="M10 19l-7-7m0 0l7-7m-7 7h18"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const BellIcon = () => (
    <svg
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const CheckIcon = () => (
    <svg
      className="h-5 w-5"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );

  const RefreshIcon = () => (
    <svg
      className="h-5 w-5 text-gray-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );

  const CalendarIcon = () => (
    <svg
      className="h-5 w-5 text-gray-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );

  const EditIcon = () => (
    <svg
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const DeleteIcon = () => (
    <svg
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  /* Dose Cal cell: formula select (+ target AUC for Calvert). */
  const renderDoseCalcCell = (
    drug: Drug,
    onChange: (patch: Partial<Drug>) => void
  ) => {
    const method = resolveDoseCalc(drug);
    return (
      <div className="flex min-w-[200px] flex-col gap-1.5">
        <select
          aria-label={`Dose calculation for ${drug.name}`}
          value={method}
          onChange={(event) => onChange({ doseCalc: event.target.value })}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        >
          {DOSE_CALC_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {method === "AUC" && (
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
            Target AUC
            <input
              type="number"
              min="0"
              step="0.5"
              value={drug.targetAuc ?? String(resolveTargetAuc(drug) ?? "")}
              onChange={(event) => onChange({ targetAuc: event.target.value })}
              className="w-20 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </label>
        )}
      </div>
    );
  };

  const renderPatientDoseCell = (result: PatientDoseResult) =>
    result.value !== null ? (
      <div>
        <span className="text-base font-semibold text-gray-900">
          {result.value} {result.unit}
        </span>
        {result.note && (
          <p className="mt-0.5 text-xs text-gray-500">{result.note}</p>
        )}
      </div>
    ) : (
      <span className="text-xs font-medium text-amber-600">
        {result.message}
      </span>
    );

  const usesCalvert = drugs.some((drug) => resolveDoseCalc(drug) === "AUC");

  const formatInput = (value: number | null | undefined, unit: string) =>
    value != null ? `${value} ${unit}` : "—";

  const content = (
    <div className="w-full space-y-8">
      {/* ================= ORDER CONTAINER ================= */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* ================= FORM HEADER ================= */}
        <div className="grid grid-cols-1 gap-8 p-8 pb-6 md:grid-cols-3">
          {/* Protocol */}
          <div className="space-y-2">
            <label
              htmlFor="protocol"
              className="block text-sm font-semibold uppercase tracking-wide text-gray-500"
            >
              Protocol
            </label>

            <input
              id="protocol"
              type="text"
              value={protocolName}
              readOnly
              className="mt-1 block w-full rounded-md border border-gray-300 px-4 py-3 text-base text-gray-900 shadow-sm outline-none"
            />
          </div>

          {/* Cycle / Day */}
          <div className="relative space-y-2">
            <label
              htmlFor="cycle-day"
              className="block text-sm font-semibold uppercase tracking-wide text-gray-500"
            >
              Cycle / Day
            </label>

            {/* Dropdown trigger */}
            <button
              type="button"
              onClick={() => setCycleDayOpen((prev) => !prev)}
              className="relative mt-1 flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-4 py-3 text-left text-base text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              <span className={cycleDay ? "text-gray-900" : "text-gray-400"}>
                {cycleDay || "Select Cycle / Day"}
              </span>

              <svg
                className={`h-4 w-4 text-gray-400 transition-transform ${
                  cycleDayOpen ? "rotate-180" : ""
                }`}
                viewBox="0 0 20 20"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {/* Dropdown panel - only shows when open */}
            {cycleDayOpen && (
              <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-300 bg-white p-3 shadow-lg">
                <div className="grid grid-cols-2 gap-4">
                  {/* Cycles */}
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Cycles
                    </div>
                    <div className="max-h-40 space-y-1 overflow-y-auto">
                      {availableCycles.map((cycle) => {
                        const isChecked = getCycleNumber(cycleDay) === cycle;
                        return (
                          <label
                            key={cycle}
                            className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                userTouched.current.cycleDay = true;
                                setCycleDayOpen(false);
                                selectCycle(cycle);
                              }}
                              className="h-4 w-4 shrink-0 cursor-pointer rounded border border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>Cycle {cycle}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Days */}
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Days
                    </div>
                    <div className="max-h-40 space-y-1 overflow-y-auto">
                      {availableDays.map((day) => {
                        const isChecked = getCycleDayNumber(cycleDay) === day;
                        return (
                          <label
                            key={day}
                            className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                userTouched.current.cycleDay = true;
                                setCycleDayOpen(false);
                                selectDay(day);
                              }}
                              className="h-4 w-4 shrink-0 cursor-pointer rounded border border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>Day {day}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <label
              htmlFor="start-date"
              className="block text-sm font-semibold uppercase tracking-wide text-gray-500"
            >
              Start Date
            </label>

            <Popover>
              <PopoverTrigger asChild>
                <div className="relative mt-1 cursor-pointer rounded-md shadow-sm">
                  <input
                    id="start-date"
                    type="text"
                    value={startDate}
                    onChange={(e) => {
                      userTouched.current.startDate = true;
                      setStartDate(e.target.value);
                    }}
                    className="block w-full rounded-md border border-gray-300 py-3 pl-4 pr-10 text-base text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />

                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <CalendarIcon />
                  </div>
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={parsePickedDate(startDate)}
                  onSelect={(date) => {
                    if (date instanceof Date) {
                      userTouched.current.startDate = true;
                      setStartDate(formatPickedDate(date));
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* ================= TABS ================= */}
        <div className="border-b border-gray-200 px-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <nav
              aria-label="Tabs"
              className="-mb-px flex gap-6 overflow-x-auto"
            >
              {tabs.map((tab) => {
                const isActive = activeTab === tab;

                return (
                  <React.Fragment key={tab}>
                    <button
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`whitespace-nowrap border-b-2 px-1 py-4 text-base font-medium transition-colors ${
                        isActive
                          ? "border-blue-600 text-blue-600"
                          : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                      }`}
                    >
                      {tab}
                    </button>

                  </React.Fragment>
                );
              })}
            </nav>

            {/* Next */}
            <div className="flex flex-col items-end gap-2 pb-3">
              {planError && (
                <div className="text-sm font-medium text-red-600">{planError}</div>
              )}
              <button
                type="button"
                onClick={handleNext}
                disabled={savingPlan}
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingPlan ? "Saving..." : "Next"}
              </button>
            </div>
          </div>
        </div>

        {/* ================= ORDER TABLE ================= */}
        {activeTab === "Chemotherapy Orders" ? (
          <div className="p-8">
            {editingRow?.kind === "drug" && editError && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                {editError}
              </div>
            )}

            {/* Inputs the Dose Cal formulas use (spec Section 4). */}
            <div className="mb-4 flex flex-wrap items-end gap-x-6 gap-y-3 rounded-lg border border-gray-200 bg-gray-50 px-5 py-3 text-sm">
              {[
                ["Height", formatInput(dosingInputs.heightCm, "cm")],
                ["Weight", formatInput(dosingInputs.weightKg, "kg")],
                [
                  "BSA",
                  dosingSummary.bsa
                    ? `${dosingSummary.bsa.bsa} m²${
                        dosingSummary.bsa.isCapped
                          ? ` (capped from ${dosingSummary.bsa.uncappedBsa})`
                          : ""
                      }`
                    : "—",
                ],
                ["IBW", formatInput(dosingSummary.ibw, "kg")],
                ["AdjBW", formatInput(dosingSummary.adjBw, "kg")],
                ["Age", formatInput(dosingInputs.ageYears, "y")],
                ["Sex", dosingInputs.sex ?? "—"],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {label}
                  </p>
                  <p className="mt-0.5 font-medium capitalize text-gray-900">
                    {value}
                  </p>
                </div>
              ))}

              {usesCalvert && (
                <>
                  <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Serum creatinine (mg/dL)
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={serumCreatinine}
                      onChange={(event) =>
                        setSerumCreatinine(event.target.value)
                      }
                      placeholder="0.9"
                      className="w-28 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-normal normal-case text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </label>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      CrCl (Cockcroft-Gault)
                    </p>
                    <p className="mt-0.5 font-medium text-gray-900">
                      {formatInput(dosingSummary.crCl, "mL/min")}
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-4 pl-6 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Drug Name
                    </th>

                    <th className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Form
                    </th>

                    <th className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Dose Cal
                    </th>

                    <th className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Dose
                    </th>

                    <th className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Unit
                    </th>

                    <th className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Patient Dose
                    </th>

                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 bg-white">
                  {planLoading && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-8 text-center text-sm text-gray-500"
                      >
                        Loading chemotherapy orders
                      </td>
                    </tr>
                  )}

                  {!planLoading && !planError && drugs.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-8 text-center text-sm text-gray-500"
                      >
                        No chemotherapy orders found for this patient.
                      </td>
                    </tr>
                  )}

                  {planError && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-8 text-center text-sm text-red-500"
                      >
                        {planError}
                      </td>
                    </tr>
                  )}

                  {drugs.map((drug) => {
                    const isEditingRow =
                      editingRow?.kind === "drug" &&
                      editingRow.id === drug.id;

                    if (isEditingRow && editDraft) {
                      return (
                        <tr
                          key={drug.id}
                          className="bg-blue-50/40 transition-colors"
                        >
                          <td className="whitespace-nowrap px-3 py-3 pl-6 pr-3 text-base font-medium text-gray-900">
                            {editDraft.name}
                          </td>

                          <td className="whitespace-nowrap px-3 py-3 text-base text-gray-500">
                            {editDraft.form}
                          </td>

                          <td className="px-3 py-3">
                            {renderDoseCalcCell(editDraft, (patch) =>
                              setEditDraft((previous) =>
                                previous ? { ...previous, ...patch } : previous
                              )
                            )}
                          </td>

                          <td className="px-3 py-3">
                            <input
                              type="text"
                              value={editDraft.dose}
                              onChange={(event) =>
                                updateEditDraft(
                                  "dose",
                                  event.target.value
                                )
                              }
                              className="w-full min-w-[100px] rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                          </td>

                          <td className="px-3 py-3">
                            <input
                              type="text"
                              value={editDraft.unit}
                              onChange={(event) =>
                                updateEditDraft(
                                  "unit",
                                  event.target.value
                                )
                              }
                              className="w-full min-w-[100px] rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                          </td>

                          <td className="px-3 py-3">
                            {renderPatientDoseCell(
                              computePatientDose(editDraft, dosingInputs)
                            )}
                          </td>

                          <td className="whitespace-nowrap px-6 py-3 text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={saveEditedDrug}
                                disabled={savingEdit}
                                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {savingEdit ? "Saving" : "Save"}
                              </button>

                              <button
                                type="button"
                                onClick={cancelEdit}
                                disabled={savingEdit}
                                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                    <tr
                      key={drug.id}
                      className="transition-colors hover:bg-gray-50"
                    >
                      <td className="whitespace-nowrap py-5 pl-6 pr-3 text-base font-medium text-gray-900">
                        {drug.name}
                      </td>

                      <td className="whitespace-nowrap px-3 py-5 text-base text-gray-500">
                        {drug.form}
                      </td>

                      <td className="px-3 py-5">
                        {renderDoseCalcCell(drug, (patch) =>
                          updatePrimaryDrug(drug.id, patch)
                        )}
                      </td>

                      <td className="whitespace-nowrap px-3 py-5 text-base text-gray-900">
                        {drug.dose}
                      </td>

                      <td className="whitespace-nowrap px-3 py-5 text-base text-blue-500">
                        {drug.unit}
                      </td>

                      <td className="px-3 py-5">
                        {renderPatientDoseCell(
                          computePatientDose(drug, dosingInputs)
                        )}
                      </td>

                      <td className="whitespace-nowrap px-6 py-5 text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-3 text-gray-500">
                          <button
                            type="button"
                            aria-label={`Edit ${drug.name}`}
                            onClick={() =>
                              handleEdit(drug.id)
                            }
                            className="transition-colors hover:text-gray-900 focus:outline-none"
                          >
                            <EditIcon />
                          </button>

                          <button
                            type="button"
                            aria-label={`Delete ${drug.name}`}
                            onClick={() =>
                              handleDelete(drug.id)
                            }
                            className="transition-colors hover:text-red-600 focus:outline-none"
                          >
                            <DeleteIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
</table>
             </div>

          </div>
        ) : activeTab === "Premedication" ? (
          <div className="p-8">
            {editingRow?.kind === "premedication" && editError && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                {editError}
              </div>
            )}
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-4 pl-6 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Drug Name
                    </th>

                    <th className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Form
                    </th>

                    <th className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Dose
                    </th>

                    <th className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Unit
                    </th>

                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 bg-white">
                  {planLoading && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-8 text-center text-sm text-gray-500"
                      >
                        Loading premedication
                      </td>
                    </tr>
                  )}

                  {!planLoading &&
                    !planError &&
                    premedicationDrugs.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-8 text-center text-sm text-gray-500"
                        >
                          No premedication drugs found for this protocol.
                        </td>
                      </tr>
                    )}

                  {planError && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-8 text-center text-sm text-red-500"
                      >
                        {planError}
                      </td>
                    </tr>
                  )}

                  {premedicationDrugs.map((drug) => {
                    const isEditingRow =
                      editingRow?.kind === "premedication" &&
                      editingRow.id === drug.id;

                    if (isEditingRow && editDraft) {
                      return (
                        <tr
                          key={drug.id}
                          className="bg-blue-50/40 transition-colors"
                        >
                          <td className="whitespace-nowrap px-3 py-3 pl-6 pr-3 text-base font-medium text-gray-900">
                            {editDraft.name}
                          </td>

                          <td className="whitespace-nowrap px-3 py-3 text-base text-gray-500">
                            {editDraft.form}
                          </td>

                          <td className="px-3 py-3">
                            <input
                              type="text"
                              value={editDraft.dose}
                              onChange={(event) =>
                                updateEditDraft(
                                  "dose",
                                  event.target.value
                                )
                              }
                              className="w-full min-w-[100px] rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                          </td>

                          <td className="px-3 py-3">
                            <input
                              type="text"
                              value={editDraft.unit}
                              onChange={(event) =>
                                updateEditDraft(
                                  "unit",
                                  event.target.value
                                )
                              }
                              className="w-full min-w-[100px] rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                          </td>

                          <td className="whitespace-nowrap px-6 py-3 text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={saveEditedDrug}
                                disabled={savingEdit}
                                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {savingEdit ? "Saving" : "Save"}
                              </button>

                              <button
                                type="button"
                                onClick={cancelEdit}
                                disabled={savingEdit}
                                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                    <tr
                      key={drug.id}
                      className="transition-colors hover:bg-gray-50"
                    >
                      <td className="whitespace-nowrap py-5 pl-6 pr-3 text-base font-medium text-gray-900">
                        {drug.name}
                      </td>

                      <td className="whitespace-nowrap px-3 py-5 text-base text-gray-500">
                        {drug.form}
                      </td>

                      <td className="whitespace-nowrap px-3 py-5 text-base text-gray-900">
                        {drug.dose}
                      </td>

                      <td className="whitespace-nowrap px-3 py-5 text-base text-blue-500">
                        {drug.unit}
                      </td>

                      <td className="whitespace-nowrap px-6 py-5 text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-3 text-gray-500">
                          <button
                            type="button"
                            aria-label={`Edit ${drug.name}`}
                            onClick={() =>
                              handleEditPremedication(drug.id)
                            }
                            className="transition-colors hover:text-gray-900 focus:outline-none"
                          >
                            <EditIcon />
                          </button>

                          <button
                            type="button"
                            aria-label={`Delete ${drug.name}`}
                            onClick={() =>
                              handleDeletePremedication(drug.id)
                            }
                            className="transition-colors hover:text-red-600 focus:outline-none"
                          >
                            <DeleteIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === "Supportive" ? (
          <div className="p-8">
            {editingRow?.kind === "supportive" && editError && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                {editError}
              </div>
            )}
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-4 pl-6 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Drug Name
                    </th>

                    <th className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Form
                    </th>

                    <th className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Dose
                    </th>

                    <th className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Unit
                    </th>

                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 bg-white">
                  {planLoading && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-8 text-center text-sm text-gray-500"
                      >
                        Loading supportive drugs
                      </td>
                    </tr>
                  )}

                  {!planLoading &&
                    !planError &&
                    supportiveDrugs.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-8 text-center text-sm text-gray-500"
                        >
                          No supportive drugs found for this protocol.
                        </td>
                      </tr>
                    )}

                  {planError && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-8 text-center text-sm text-red-500"
                      >
                        {planError}
                      </td>
                    </tr>
                  )}

                  {supportiveDrugs.map((drug) => {
                    const isEditingRow =
                      editingRow?.kind === "supportive" &&
                      editingRow.id === drug.id;

                    if (isEditingRow && editDraft) {
                      return (
                        <tr
                          key={drug.id}
                          className="bg-blue-50/40 transition-colors"
                        >
                          <td className="whitespace-nowrap px-3 py-3 pl-6 pr-3 text-base font-medium text-gray-900">
                            {editDraft.name}
                          </td>

                          <td className="whitespace-nowrap px-3 py-3 text-base text-gray-500">
                            {editDraft.form}
                          </td>

                          <td className="px-3 py-3">
                            <input
                              type="text"
                              value={editDraft.dose}
                              onChange={(event) =>
                                updateEditDraft("dose", event.target.value)
                              }
                              className="w-full min-w-[100px] rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                          </td>

                          <td className="px-3 py-3">
                            <input
                              type="text"
                              value={editDraft.unit}
                              onChange={(event) =>
                                updateEditDraft("unit", event.target.value)
                              }
                              className="w-full min-w-[100px] rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                          </td>

                          <td className="whitespace-nowrap px-6 py-3 text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={saveEditedDrug}
                                disabled={savingEdit}
                                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {savingEdit ? "Saving" : "Save"}
                              </button>

                              <button
                                type="button"
                                onClick={cancelEdit}
                                disabled={savingEdit}
                                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                    <tr
                      key={drug.id}
                      className="transition-colors hover:bg-gray-50"
                    >
                      <td className="whitespace-nowrap py-5 pl-6 pr-3 text-base font-medium text-gray-900">
                        {drug.name}
                      </td>

                      <td className="whitespace-nowrap px-3 py-5 text-base text-gray-500">
                        {drug.form}
                      </td>

                      <td className="whitespace-nowrap px-3 py-5 text-base text-gray-900">
                        {drug.dose}
                      </td>

                      <td className="whitespace-nowrap px-3 py-5 text-base text-blue-500">
                        {drug.unit}
                      </td>

                      <td className="whitespace-nowrap px-6 py-5 text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-3 text-gray-500">
                          <button
                            type="button"
                            aria-label={`Edit ${drug.name}`}
                            onClick={() => handleEditSupportive(drug.id)}
                            className="transition-colors hover:text-gray-900 focus:outline-none"
                          >
                            <EditIcon />
                          </button>

                          <button
                            type="button"
                            aria-label={`Delete ${drug.name}`}
                            onClick={() => handleDeleteSupportive(drug.id)}
                            className="transition-colors hover:text-red-600 focus:outline-none"
                          >
                            <DeleteIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === "Admin Instructions" ? (
          <div className="p-8">
            <p className="mb-4 text-sm text-gray-500">
              Administration instructions for the selected protocol:
            </p>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-4 pl-6 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Drug Name
                    </th>

                    <th className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Route
                    </th>

                    <th className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Infusion
                    </th>

                    <th className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Frequency
                    </th>

                    <th className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Timing
                    </th>

                    <th className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Admin Detail
                    </th>

                    <th className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Remarks
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 bg-white">
                  {planLoading && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-8 text-center text-sm text-gray-500"
                      >
                        Loading administration instructions
                      </td>
                    </tr>
                  )}

                  {!planLoading &&
                    !planError &&
                    adminInstructions.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-6 py-8 text-center text-sm text-gray-500"
                        >
                          No administration instructions found for this
                          protocol.
                        </td>
                      </tr>
                    )}

                  {planError && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-8 text-center text-sm text-red-500"
                      >
                        {planError}
                      </td>
                    </tr>
                  )}

                  {adminInstructions.map((instruction) => (
                    <tr
                      key={instruction.id}
                      className="align-top transition-colors hover:bg-gray-50"
                    >
                      <td className="whitespace-nowrap py-5 pl-6 pr-3 text-sm font-medium text-gray-900">
                        {instruction.medicineName || "—"}
                      </td>

                      <td className="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
                        {instruction.route || "—"}
                      </td>

                      <td className="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
                        {instruction.infusion || "—"}
                      </td>

                      <td className="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
                        {instruction.frequency || "—"}
                      </td>

                      <td className="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
                        {instruction.timing || "—"}
                      </td>

                      <td className="px-3 py-5 text-sm text-gray-700">
                        {instruction.administrationDetail || "—"}
                      </td>

                      <td className="px-3 py-5 text-sm text-gray-500">
                        {instruction.remarks || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === "Hydration" ? (
          <div className="p-8">
            <p className="mb-4 text-sm text-gray-500">
              Hydration guidance for the selected protocol (document Section 3
              - values by chemotherapy agent):
            </p>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-4 pl-6 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Stage
                    </th>

                    <th className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Agent
                    </th>

                    <th className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Diluent
                    </th>

                    <th className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Volume
                    </th>

                    <th className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Guidance
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 bg-white">
                  {planLoading && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-8 text-center text-sm text-gray-500"
                      >
                        Loading hydration guidance
                      </td>
                    </tr>
                  )}

                  {!planLoading &&
                    !planError &&
                    hydrationRows.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-8 text-center text-sm text-gray-500"
                        >
                          No mandatory hydration for this protocol.
                        </td>
                      </tr>
                    )}

                  {planError && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-8 text-center text-sm text-red-500"
                      >
                        {planError}
                      </td>
                    </tr>
                  )}

                  {hydrationRows.map((row) => (
                    <tr
                      key={row.protocol_dilution_id}
                      className="align-top transition-colors hover:bg-gray-50"
                    >
                      <td className="whitespace-nowrap py-5 pl-6 pr-3 text-sm">
                        <span
                          className={
                            (row.hydration_stage ?? "").toUpperCase() === "PRE"
                              ? "rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700"
                              : "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700"
                          }
                        >
                          {row.hydration_stage}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-3 py-5 text-sm font-medium text-gray-900">
                        {row.medicine_master?.medicine_name ||
                          row.drug_brand_name ||
                          "—"}
                      </td>

                      <td className="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
                        {row.diluent || "—"}
                      </td>

                      <td className="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
                        {row.dilution_volume != null
                          ? `${row.dilution_volume}${
                              row.dilution_volume_unit
                                ? ` ${row.dilution_volume_unit}`
                                : ""
                            }`
                          : "—"}
                      </td>

                      <td className="px-3 py-5 text-sm text-gray-700">
                        {row.comment || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Other Tabs */
          <div className="flex min-h-[300px] items-center justify-center p-8">
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-700">
                {activeTab}
              </p>

              <p className="mt-2 text-sm text-gray-500">
                No items available.
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-4 rounded-lg border border-gray-200 p-6">
          <div className="text-base font-semibold text-gray-900">
            Discussion
          </div>
          <VoiceToText
            value={discussion}
            onChange={setDiscussion}
            placeholder="Type the discussion..."
          />
        </div>

        <div className="mt-6 flex flex-col gap-4 rounded-lg border border-gray-200 p-6">
          <div className="text-base font-semibold text-gray-900">
            Post Chemo Instructions
          </div>
          <VoiceToText
            value={postChemoInstructions}
            onChange={setPostChemoInstructions}
            placeholder="Type the post chemo instructions..."
          />
        </div>

        <div className="mt-6 flex flex-col gap-4 rounded-lg border border-gray-200 p-6">
          <div className="text-base font-semibold text-gray-900">
            Additional Notes
          </div>
          <VoiceToText
            value={additionalNotes}
            onChange={setAdditionalNotes}
            placeholder="Type any additional notes..."
          />
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="min-h-screen bg-[#fafbfc] font-sans text-gray-800 antialiased">
      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Go back"
            className="rounded-full p-1 text-gray-600 transition-colors hover:text-gray-900 focus:outline-none"
            onClick={() => window.history.back()}
          >
            <BackIcon />
          </button>

          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Patients
          </h1>
        </div>

        <div className="flex items-center gap-6">
          {/* Notification */}
          <button
            type="button"
            aria-label="Notifications"
            className="relative text-gray-500 transition-colors hover:text-gray-700 focus:outline-none"
          >
            <BellIcon />

            <span className="absolute right-0 top-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
          </button>

          {/* User */}
          <UserProfileDropdown
            userName={getUser()?.username || "Doctor"}
            userSubtext={getUser()?.role || "Doctor"}
            userAvatar={userAvatarUrl || undefined}
            avatarLoading={avatarLoading}
            onLogout={() => { localStorage.clear(); window.location.href = '/login'; }}
            profilePath="/doctor/profile"
            notificationsPath="/doctor/notifications"
          />
        </div>
      </header>

      {/* ================= MAIN ================= */}
      <main className="flex min-h-[calc(100vh-73px)] flex-grow justify-center p-8">
        <div className="w-full space-y-8">
          {/* ================= STEPPER ================= */}
          <nav
            aria-label="Progress"
            className="relative"
          >
            <ol className="relative z-0 flex w-full items-center">
              {/* Step 1 */}
              <li className="relative flex-1 text-center">
                <div className="flex flex-col items-center">
                  <span className="relative z-10 mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-gray-400 text-white shadow-sm">
                    <CheckIcon />
                  </span>

                  <span className="text-xs font-bold uppercase tracking-wider text-gray-900">
                    Diagnosis
                  </span>
                </div>

                <div className="absolute left-1/2 top-4 -z-10 h-0.5 w-full bg-gray-200" />
              </li>

              {/* Step 2 */}
              <li className="relative flex-1 text-center">
                <div className="flex flex-col items-center">
                  <span className="relative z-10 mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-gray-400 text-white shadow-sm">
                    <CheckIcon />
                  </span>

                  <span className="text-xs font-bold uppercase tracking-wider text-gray-900">
                    Treatment Plan
                  </span>
                </div>

                <div className="absolute right-1/2 top-4 -z-10 h-0.5 w-full bg-gray-200" />
                <div className="absolute left-1/2 top-4 -z-10 h-0.5 w-full bg-gray-200" />
              </li>

              {/* Step 3 */}
              <li className="relative flex-1 text-center">
                <div className="flex flex-col items-center">
                  <span className="relative z-10 mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white shadow-md ring-4 ring-white">
                    <CheckIcon />
                  </span>

                  <span className="text-xs font-bold uppercase tracking-wider text-gray-900">
                    Chemotherapy Order
                  </span>

                  <div className="mx-auto mt-3 h-1.5 w-full max-w-[200px] rounded-t-md bg-green-500" />
                </div>

                <div className="absolute right-1/2 top-4 -z-10 h-0.5 w-full bg-gray-200" />
                <div className="absolute left-1/2 top-4 -z-10 h-0.5 w-full bg-gray-200" />
              </li>

              {/* Step 4 */}
              <li className="relative flex-1 text-center">
                <div className="flex flex-col items-center opacity-50">
                  <span className="relative z-10 mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-gray-400 text-white shadow-sm" />

                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Discharge Plan
                  </span>
                </div>

                <div className="absolute right-1/2 top-4 -z-10 h-0.5 w-full bg-gray-200" />
              </li>
            </ol>
          </nav>

          {content}
        </div>
      </main>
    </div>
  );
};

export default ChemotherapyOrder;
