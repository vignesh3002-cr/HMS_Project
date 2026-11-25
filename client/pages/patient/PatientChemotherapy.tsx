import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  patientPortalApi,
  PatientChemotherapyPlan,
  PatientChemoCycle,
  PatientChemoDischargeMedication,
  PatientChemoAdministration,
} from "@/api/patientPortal.api";
import {
  Activity,
  Calendar,
  CalendarCheck,
  Clock,
  User,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Pill,
  ChevronRight,
  ChevronDown,
  Info,
  PhoneCall,
  Printer,
  Sparkles,
  ArrowRight,
  HeartPulse,
  Layers,
  Thermometer,
  RefreshCw,
  ExternalLink,
  Flame,
  Syringe,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function formatChemoDate(
  value?: string | null,
  options?: { includeWeekday?: boolean }
): string {
  if (!value) return "—";
  const str = String(value).trim();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const d = new Date(Date.UTC(year, month, day));
    return d.toLocaleDateString("en-US", {
      timeZone: "UTC",
      ...(options?.includeWeekday ? { weekday: "short" } : {}),
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    timeZone: "Asia/Kolkata",
    ...(options?.includeWeekday ? { weekday: "short" } : {}),
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function PatientChemotherapy() {
  const [plans, setPlans] = useState<PatientChemotherapyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [expandedCycleIds, setExpandedCycleIds] = useState<Set<string>>(new Set());
  const [dischargeFilter, setDischargeFilter] = useState<"ALL" | "GIVEN" | "PENDING">("ALL");

  const fetchChemoPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await patientPortalApi.getChemotherapyPlans();
      setPlans(data || []);
      if (data && data.length > 0) {
        // Default to the first active/planned plan, or first plan
        const activeOrPlanned = data.find(
          (p) => p.treatment_status === "ACTIVE" || p.treatment_status === "PLANNED"
        );
        const defaultPlan = activeOrPlanned || data[0];
        setSelectedPlanId(defaultPlan.chemotherapy_plan_id);

        // Auto-expand next upcoming cycle
        if (defaultPlan.next_upcoming_cycle) {
          setExpandedCycleIds(new Set([defaultPlan.next_upcoming_cycle.chemotherapy_cycle_id]));
        } else if (defaultPlan.cycles && defaultPlan.cycles.length > 0) {
          setExpandedCycleIds(new Set([defaultPlan.cycles[0].chemotherapy_cycle_id]));
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to load chemotherapy care plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChemoPlans();
  }, [fetchChemoPlans]);

  const activePlan = useMemo(() => {
    if (!selectedPlanId || plans.length === 0) return plans[0] || null;
    return plans.find((p) => p.chemotherapy_plan_id === selectedPlanId) || plans[0] || null;
  }, [plans, selectedPlanId]);

  const dischargeMeds = useMemo(() => {
    return activePlan?.discharge_medications || [];
  }, [activePlan]);

  const administeredCount = useMemo(() => {
    return dischargeMeds.filter(
      (m) => m.is_administered || m.administration_status === "GIVEN" || m.administration_status === "Completed"
    ).length;
  }, [dischargeMeds]);

  const takeHomeCount = useMemo(() => {
    return dischargeMeds.length - administeredCount;
  }, [dischargeMeds, administeredCount]);

  const filteredDischargeMeds = useMemo(() => {
    if (dischargeFilter === "GIVEN") {
      return dischargeMeds.filter(
        (m) => m.is_administered || m.administration_status === "GIVEN" || m.administration_status === "Completed"
      );
    }
    if (dischargeFilter === "PENDING") {
      return dischargeMeds.filter(
        (m) => !m.is_administered && m.administration_status !== "GIVEN" && m.administration_status !== "Completed"
      );
    }
    return dischargeMeds;
  }, [dischargeMeds, dischargeFilter]);

  const toggleCycleExpand = (cycleId: string) => {
    setExpandedCycleIds((prev) => {
      const next = new Set(prev);
      if (next.has(cycleId)) {
        next.delete(cycleId);
      } else {
        next.add(cycleId);
      }
      return next;
    });
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-[#00488D]" />
        <p className="text-xs font-semibold text-slate-500">Loading your chemotherapy plans and cycle schedule...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">Unable to load chemotherapy plan</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">{error}</p>
        <button
          type="button"
          onClick={fetchChemoPlans}
          className="mt-4 px-4 py-2 rounded-lg bg-[#00488D] text-white text-xs font-semibold hover:bg-blue-800 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // If no chemo plan is given, the patient cannot view this page and is redirected to dashboard
  if (!activePlan || plans.length === 0) {
    return <Navigate to="/patient/dashboard" replace />;
  }

  const cycles = activePlan.cycles || [];
  const nextCycle = activePlan.next_upcoming_cycle;
  const progressPercent = activePlan.progress_percentage || 0;

  return (
    <div className="space-y-6 pb-12 print:space-y-4 print:pb-0 font-[Manrope,sans-serif]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-100 text-[#00488D]">
              <Activity className="h-5 w-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Chemotherapy Care Plan
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Your personalized oncology treatment regimen, cycle timeline, and medication instructions.
          </p>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <Printer size={14} />
            <span>Print Schedule</span>
          </button>
        </div>
      </div>

      {/* Multiple Plans Switcher (if patient has more than 1 plan) */}
      {plans.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 print:hidden">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
            Regimens:
          </span>
          {plans.map((p) => {
            const isSelected = p.chemotherapy_plan_id === activePlan.chemotherapy_plan_id;
            return (
              <button
                key={p.chemotherapy_plan_id}
                type="button"
                onClick={() => {
                  setSelectedPlanId(p.chemotherapy_plan_id);
                  if (p.next_upcoming_cycle) {
                    setExpandedCycleIds(new Set([p.next_upcoming_cycle.chemotherapy_cycle_id]));
                  }
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-2 border",
                  isSelected
                    ? "bg-[#00488D] text-white border-[#00488D] shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                )}
              >
                <span>{p.regimen_name}</span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded font-mono",
                    isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                  )}
                >
                  {p.treatment_status}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* HERO CARD: Protocol & Regimen Overview */}
      <div className="bg-gradient-to-br from-[#003B73] via-[#00488D] to-[#005CB9] rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-xs flex items-center gap-1">
                <ShieldCheck size={13} />
                <span>{activePlan.treatment_status || "ACTIVE"}</span>
              </span>
              {activePlan.treatment_intent && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  {activePlan.treatment_intent} Intent
                </span>
              )}
              {activePlan.regimen_code && (
                <span className="text-xs text-blue-200 font-mono">
                  Code: {activePlan.regimen_code}
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-tight">
              {activePlan.regimen_name}
            </h2>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-blue-100">
              {activePlan.cancer_type && (
                <div>
                  <span className="text-blue-300">Diagnosis:</span>{" "}
                  <strong className="text-white font-semibold">
                    {activePlan.cancer_type}
                    {activePlan.cancer_subtype ? ` — ${activePlan.cancer_subtype}` : ""}
                  </strong>
                </div>
              )}
              {activePlan.cancer_stage && (
                <div>
                  <span className="text-blue-300">Stage:</span>{" "}
                  <strong className="text-white font-semibold">{activePlan.cancer_stage}</strong>
                </div>
              )}
            </div>

            {/* Doctor & Facility */}
            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 pt-1 text-xs text-blue-100 border-t border-white/10">
              {activePlan.doctor?.name && (
                <div className="flex items-center gap-1.5">
                  <User size={13} className="text-blue-300 shrink-0" />
                  <span>Oncologist: <strong className="text-white font-semibold">{activePlan.doctor.name}</strong></span>
                  {activePlan.doctor.specialization && (
                    <span className="text-blue-300">({activePlan.doctor.specialization})</span>
                  )}
                </div>
              )}
              {activePlan.cycle_interval_days && (
                <div className="flex items-center gap-1.5">
                  <Clock size={13} className="text-blue-300 shrink-0" />
                  <span>Frequency: <strong className="text-white font-semibold">Every {activePlan.cycle_interval_days} Days</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Progress Box */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/15 min-w-[240px] shrink-0 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-blue-200 font-medium">Cycle Progress</span>
              <span className="font-bold text-white font-mono text-sm">
                {activePlan.completed_cycles} / {activePlan.planned_cycles} Cycles
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-white/20 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.min(100, Math.max(progressPercent, 5))}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-blue-200 pt-1">
              <span>{progressPercent}% Completed</span>
              <span>
                {Math.max(0, activePlan.planned_cycles - activePlan.completed_cycles)} Remaining
              </span>
            </div>

            {activePlan.treatment_start_date && (
              <div className="pt-2 border-t border-white/10 text-[11px] text-blue-100 flex items-center justify-between">
                <span>Start Date:</span>
                <span className="font-semibold text-white">
                  {formatChemoDate(activePlan.treatment_start_date)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SPOTLIGHT CARD: UPCOMING / NEXT SCHEDULED CYCLE */}
      {nextCycle && (
        <div className="bg-white rounded-2xl border-2 border-blue-600/30 p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-bl-lg flex items-center gap-1">
            <Sparkles size={11} />
            <span>Next Planned Cycle</span>
          </div>

          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-blue-100 text-[#00488D] flex items-center justify-center font-bold text-sm">
                    {nextCycle.cycle_number}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Cycle {nextCycle.cycle_number} of {activePlan.planned_cycles}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Day {nextCycle.cycle_day || 1} Administration
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold">
                  <Calendar size={14} className="text-[#00488D]" />
                  <span>
                    Planned Date:{" "}
                    <strong>
                      {formatChemoDate(nextCycle.planned_date, { includeWeekday: true })}
                    </strong>
                  </span>
                </div>
                <span
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-lg font-semibold",
                    nextCycle.cycle_status === "IN_PROGRESS"
                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                      : nextCycle.cycle_status === "SCHEDULED"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : "bg-blue-100 text-blue-800 border border-blue-200"
                  )}
                >
                  {nextCycle.cycle_status || "PLANNED"}
                </span>
              </div>
            </div>

            {/* Delay Warning if present */}
            {nextCycle.treatment_delay && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Cycle Rescheduled:</strong>{" "}
                  {nextCycle.delay_reason || "Delayed by treating physician."}
                  {nextCycle.rescheduled_date && (
                    <span className="block mt-0.5 text-amber-800">
                      New Scheduled Date:{" "}
                      <strong>
                        {formatChemoDate(nextCycle.rescheduled_date)}
                      </strong>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* PRE-CHEMO LAB INVESTIGATIONS REQUIRED */}
            {nextCycle.orders.some((o) => o.investigations && o.investigations.length > 0) && (
              <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={15} className="text-[#00488D]" />
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Pre-Chemo Investigations Required
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Must be verified before infusion
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                  {nextCycle.orders.flatMap((o) => o.investigations || []).map((inv, idx) => (
                    <div
                      key={inv.investigation_id || idx}
                      className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-800 truncate">
                          {inv.investigation_name}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {inv.investigation_type || inv.investigation_category || "Diagnostic Check"}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-[#00488D] border border-blue-100 shrink-0">
                        Required
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ADMINISTERED MEDICATIONS FOR THIS CYCLE */}
            {nextCycle.administrations && nextCycle.administrations.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Administered Medications (Cycle {nextCycle.cycle_number})
                    </h4>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-300">
                    {nextCycle.administrations.filter((a) => a.administration_status === "GIVEN" || a.administration_status === "Completed").length} of {nextCycle.administrations.length} Given
                  </span>
                </div>

                <div className="border border-emerald-200 rounded-xl overflow-hidden divide-y divide-emerald-100/70 bg-emerald-50/20">
                  {nextCycle.administrations.map((admin, idx) => {
                    const isGiven = admin.administration_status === "GIVEN" || admin.administration_status === "Completed";
                    return (
                      <div
                        key={admin.administration_id || idx}
                        className="p-3.5 bg-white hover:bg-emerald-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-md uppercase flex items-center gap-1",
                                isGiven
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : admin.administration_status === "SKIPPED"
                                  ? "bg-slate-100 text-slate-600 border border-slate-200"
                                  : admin.administration_status === "CANCELLED"
                                  ? "bg-red-100 text-red-700 border border-red-200"
                                  : "bg-amber-100 text-amber-800 border border-amber-200"
                              )}
                            >
                              {isGiven && <CheckCircle2 size={11} />}
                              {admin.administration_status || "GIVEN"}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                              {admin.drug_role || "Chemo Agent"}
                            </span>
                            <span className="text-xs font-bold text-slate-900">
                              {admin.drug_name || admin.medicine_name || "Prescribed Agent"}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                            {admin.administration_date && (
                              <span>
                                Date: <strong className="text-slate-700 font-semibold">{formatChemoDate(admin.administration_date)}</strong>
                              </span>
                            )}
                            {admin.administered_by_name && (
                              <span>
                                By: <strong className="text-slate-700 font-semibold">{admin.administered_by_name}</strong>
                              </span>
                            )}
                            {admin.generic_name && admin.generic_name !== admin.drug_name && (
                              <span className="text-slate-400">({admin.generic_name})</span>
                            )}
                          </div>

                          {admin.nursing_notes && (
                            <div className="text-[11px] text-emerald-800 italic bg-emerald-50/60 px-2 py-0.5 rounded border border-emerald-100/60 inline-block">
                              Note: {admin.nursing_notes}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs shrink-0 sm:text-right">
                          <div>
                            <span className="text-slate-400 text-[10px] block font-medium">Given Dose</span>
                            <span className="font-bold text-emerald-800 font-mono text-sm">
                              {admin.administered_dose
                                ? `${admin.administered_dose} ${admin.administered_dose_unit || "mg"}`
                                : "Completed"}
                            </span>
                          </div>
                          {admin.administration_route && (
                            <div className="border-l border-slate-200 pl-4">
                              <span className="text-slate-400 text-[10px] block font-medium">Route</span>
                              <span className="font-semibold text-slate-700">
                                {admin.administration_route}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PLANNED MEDICATIONS & INFUSIONS */}
            {nextCycle.orders.some((o) => o.items && o.items.length > 0) && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Pill size={15} className="text-emerald-600" />
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Planned Medications & Infusions
                  </h4>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {nextCycle.orders.flatMap((o) => o.items || []).map((item, idx) => (
                    <div
                      key={item.chemotherapy_plan_item_id || idx}
                      className="p-3.5 bg-white hover:bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-[10px] font-bold px-1.5 py-0.2 rounded uppercase",
                              item.drug_role === "PRIMARY"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-slate-100 text-slate-600"
                            )}
                          >
                            {item.drug_role || "Chemo Drug"}
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {item.drug_name || "Prescribed Medicine"}
                          </span>
                        </div>
                        {item.administration_detail && (
                          <div className="text-[11px] text-slate-600">
                            {item.administration_detail}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs shrink-0 sm:text-right">
                        <div>
                          <span className="text-slate-400 text-[10px] block">Planned Dose</span>
                          <span className="font-bold text-slate-800 font-mono">
                            {item.calculated_dose
                              ? `${item.calculated_dose} ${item.calculated_dose_unit || "mg"}`
                              : item.protocol_dose
                              ? `${item.protocol_dose} ${item.protocol_dose_unit || "mg"}`
                              : "Standard"}
                          </span>
                        </div>
                        {item.administration_route && (
                          <div className="border-l border-slate-200 pl-4">
                            <span className="text-slate-400 text-[10px] block">Route</span>
                            <span className="font-semibold text-slate-700">
                              {item.administration_route}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Doctor Instructions if any */}
            {nextCycle.orders.some((o) => o.chemo_instructions || o.additional_notes) && (
              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-blue-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-blue-950">
                  <Info size={14} className="text-[#00488D]" />
                  <span>Oncologist Notes & Instructions for this Cycle:</span>
                </div>
                {nextCycle.orders.map((o, idx) => (
                  <div key={idx} className="text-slate-700 leading-relaxed pl-5">
                    {o.chemo_instructions && <div>{o.chemo_instructions}</div>}
                    {o.additional_notes && <div className="text-slate-500 italic mt-0.5">{o.additional_notes}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CURRENT DISCHARGE & TAKE-HOME MEDICATIONS (FOLLOW UNTIL NEXT CYCLE) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                <Pill className="h-5 w-5" />
              </span>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Current Discharge & Take-Home Medications
              </h3>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Follow Until Next Cycle
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Supportive medications prescribed by your oncology team to take at home for symptom relief, infection prevention, and recovery
              {nextCycle?.planned_date && (
                <> until your next cycle on <strong className="text-slate-700 font-semibold">{formatChemoDate(nextCycle.planned_date)}</strong></>
              )}.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Filter Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setDischargeFilter("ALL")}
                className={cn(
                  "px-3 py-1 rounded-lg transition-all",
                  dischargeFilter === "ALL"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                All ({dischargeMeds.length})
              </button>
              <button
                type="button"
                onClick={() => setDischargeFilter("GIVEN")}
                className={cn(
                  "px-3 py-1 rounded-lg transition-all flex items-center gap-1",
                  dischargeFilter === "GIVEN"
                    ? "bg-emerald-600 text-white shadow-2xs font-bold"
                    : "text-emerald-700 hover:text-emerald-900"
                )}
              >
                <CheckCircle2 size={12} />
                <span>Administered ({administeredCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setDischargeFilter("PENDING")}
                className={cn(
                  "px-3 py-1 rounded-lg transition-all flex items-center gap-1",
                  dischargeFilter === "PENDING"
                    ? "bg-blue-600 text-white shadow-2xs font-bold"
                    : "text-blue-700 hover:text-blue-900"
                )}
              >
                <Pill size={12} />
                <span>Take-Home ({takeHomeCount})</span>
              </button>
            </div>
          </div>
        </div>

        {filteredDischargeMeds.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredDischargeMeds.map((med, idx) => {
                const isDosePattern =
                  med.frequency && /^(\d+)-(\d+)-(\d+)$/.test(med.frequency.trim());
                const patternParts = isDosePattern ? med.frequency!.trim().split("-") : null;
                const isGiven =
                  med.is_administered ||
                  med.administration_status === "GIVEN" ||
                  med.administration_status === "Completed";
                const isSkipped = med.administration_status === "SKIPPED";
                const isCancelled = med.administration_status === "CANCELLED";

                return (
                  <div
                    key={med.id || idx}
                    className={cn(
                      "p-4 rounded-xl border transition-all space-y-3 flex flex-col justify-between",
                      isGiven
                        ? "border-emerald-300 bg-gradient-to-b from-emerald-50/40 via-white to-white shadow-xs"
                        : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-xs"
                    )}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Administration Status Badge */}
                            {isGiven ? (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                                <CheckCircle2 size={11} className="text-emerald-700" />
                                <span>Administered at Center</span>
                              </span>
                            ) : isSkipped ? (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                                <AlertTriangle size={11} className="text-amber-700" />
                                <span>Skipped by Doctor</span>
                              </span>
                            ) : isCancelled ? (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
                                <AlertTriangle size={11} className="text-red-700" />
                                <span>Cancelled</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-[#00488D] border border-blue-200 flex items-center gap-1">
                                <Pill size={11} className="text-[#00488D]" />
                                <span>Take-Home as Prescribed</span>
                              </span>
                            )}

                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                              {med.dosage_form || "Tablet"}
                            </span>
                            {med.administration_route && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                {med.administration_route}
                              </span>
                            )}
                          </div>

                          <h4 className="text-sm font-bold text-slate-900 pt-0.5 leading-snug">
                            {med.medicine_name}
                          </h4>
                          {med.generic_name && med.generic_name !== med.medicine_name && (
                            <p className="text-[11px] text-slate-500 font-medium">
                              Generic: {med.generic_name}
                            </p>
                          )}
                        </div>

                        {/* Dose badge */}
                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-slate-400 block font-medium">Dosage</span>
                          <span
                            className={cn(
                              "text-xs font-bold font-mono px-2 py-0.5 rounded border inline-block",
                              isGiven
                                ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                                : "bg-blue-50/70 text-[#00488D] border-blue-100"
                            )}
                          >
                            {med.dose ? `${med.dose} ${med.dose_unit || "mg"}` : "As Prescribed"}
                          </span>
                        </div>
                      </div>

                      {/* Administered Status Banner if given */}
                      {isGiven && (
                        <div className="p-2.5 rounded-lg bg-emerald-50/90 border border-emerald-200 text-xs text-emerald-950 space-y-1">
                          <div className="flex items-center justify-between font-bold text-emerald-900">
                            <span className="flex items-center gap-1 text-emerald-800">
                              <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                              Administration Confirmed:
                            </span>
                            <span className="font-mono">
                              {med.administered_dose
                                ? `${med.administered_dose} ${med.administered_dose_unit || med.dose_unit || "mg"}`
                                : "Given as Ordered"}
                              {med.administered_route ? ` via ${med.administered_route}` : ""}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[11px] text-emerald-800 pt-0.5">
                            {med.administered_date && (
                              <span>
                                Date: <strong>{formatChemoDate(med.administered_date)}</strong>
                              </span>
                            )}
                            {med.administered_by_name && (
                              <span>
                                By: <strong>{med.administered_by_name}</strong>
                              </span>
                            )}
                          </div>

                          {med.nursing_notes && (
                            <div className="text-[11px] text-emerald-800 pt-1 border-t border-emerald-200/60 italic">
                              Clinical Note: "{med.nursing_notes}"
                            </div>
                          )}
                        </div>
                      )}

                      {/* Frequency / Schedule & Timing */}
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
                        {patternParts ? (
                          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase mr-1">
                              Daily:
                            </span>
                            <span
                              className={cn(
                                "px-1.5 py-0.2 rounded font-mono font-bold text-[11px]",
                                patternParts[0] !== "0"
                                  ? "bg-amber-100 text-amber-900"
                                  : "text-slate-400"
                              )}
                            >
                              {patternParts[0]} Mor
                            </span>
                            <span className="text-slate-300">-</span>
                            <span
                              className={cn(
                                "px-1.5 py-0.2 rounded font-mono font-bold text-[11px]",
                                patternParts[1] !== "0"
                                  ? "bg-orange-100 text-orange-900"
                                  : "text-slate-400"
                              )}
                            >
                              {patternParts[1]} Aft
                            </span>
                            <span className="text-slate-300">-</span>
                            <span
                              className={cn(
                                "px-1.5 py-0.2 rounded font-mono font-bold text-[11px]",
                                patternParts[2] !== "0"
                                  ? "bg-indigo-100 text-indigo-900"
                                  : "text-slate-400"
                              )}
                            >
                              {patternParts[2]} Ngt
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs">
                            <Clock size={13} className="text-slate-400" />
                            <span>{med.frequency || "As directed"}</span>
                          </div>
                        )}

                        {med.administration_detail && (
                          <span
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-semibold border",
                              med.administration_detail.toLowerCase().includes("before")
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : med.administration_detail.toLowerCase().includes("after")
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-blue-50 text-blue-800 border-blue-200"
                            )}
                          >
                            {med.administration_detail}
                          </span>
                        )}

                        {med.duration && (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1">
                            <Calendar size={12} className="text-purple-600" />
                            <span>Duration: {med.duration}</span>
                          </span>
                        )}
                      </div>

                      {/* Instructions / Purpose */}
                      {med.instructions && (
                        <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-200 text-xs text-slate-700 flex items-start gap-2">
                          <Info size={14} className="text-[#00488D] shrink-0 mt-0.5" />
                          <span className="leading-relaxed">
                            <strong className="font-semibold text-slate-800">
                              Special Instructions:
                            </strong>{" "}
                            {med.instructions}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Adherence and Helpline Box */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50/70 to-emerald-50/50 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-700">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-900 block">
                    Take-Home Medication Guidelines:
                  </span>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Take prescribed anti-nausea, acidity protection, and supportive medicines consistently as advised. Do not stop or alter dosages without consulting your oncologist. If you experience persistent vomiting or cannot keep fluids down, reach out to your care team.
                  </p>
                </div>
              </div>
              {activePlan.branch?.emergency_no && (
                <div className="shrink-0 flex sm:flex-col items-center sm:items-end gap-1">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">
                    Oncology Helpline
                  </span>
                  <a
                    href={`tel:${activePlan.branch.emergency_no}`}
                    className="inline-flex items-center gap-1.5 font-mono font-bold text-xs text-[#00488D] hover:underline bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs"
                  >
                    <PhoneCall size={12} />
                    <span>{activePlan.branch.emergency_no}</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
            <Pill className="h-8 w-8 text-slate-400 mx-auto" />
            <h4 className="text-xs font-bold text-slate-800">
              No Specific Take-Home Medications Recorded
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              No active discharge medications are currently documented under this protocol in the portal. Please refer to your printed discharge summary issued at the daycare counter or check with your attending oncologist.
            </p>
          </div>
        )}
      </div>

      {/* FULL CYCLE TIMELINE (All Cycles: Completed, Active, Upcoming) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              All Planned Cycles Timeline
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Complete chronological view of all {activePlan.planned_cycles} planned treatment cycles.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Total {cycles.length} Cycles
          </span>
        </div>

        <div className="space-y-3 pt-2">
          {cycles.map((cycle) => {
            const isCompleted = cycle.cycle_status === "COMPLETED" || cycle.completion_status === "COMPLETED";
            const isNext = nextCycle?.chemotherapy_cycle_id === cycle.chemotherapy_cycle_id;
            const isExpanded = expandedCycleIds.has(cycle.chemotherapy_cycle_id);

            return (
              <div
                key={cycle.chemotherapy_cycle_id}
                className={cn(
                  "border rounded-xl transition-all overflow-hidden",
                  isNext
                    ? "border-blue-500/60 bg-blue-50/20 shadow-2xs"
                    : isCompleted
                    ? "border-slate-200 bg-slate-50/40"
                    : "border-slate-200 bg-white"
                )}
              >
                {/* Cycle Accordion Header */}
                <button
                  type="button"
                  onClick={() => toggleCycleExpand(cycle.chemotherapy_cycle_id)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                        isCompleted
                          ? "bg-emerald-100 text-emerald-700"
                          : isNext
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-600"
                      )}
                    >
                      {isCompleted ? <CheckCircle2 size={15} /> : cycle.cycle_number}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          Cycle {cycle.cycle_number}
                        </span>
                        {isNext && (
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-blue-100 text-[#00488D]">
                            Current / Upcoming
                          </span>
                        )}
                        <span
                          className={cn(
                            "text-[10px] font-semibold px-2 py-0.2 rounded",
                            isCompleted
                              ? "bg-emerald-100 text-emerald-800"
                              : cycle.cycle_status === "IN_PROGRESS"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-600"
                          )}
                        >
                          {cycle.cycle_status || "PLANNED"}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <span>
                          Planned:{" "}
                          <strong>
                            {formatChemoDate(cycle.planned_date)}
                          </strong>
                        </span>
                        {cycle.actual_date && (
                          <span>
                            Administered:{" "}
                            <strong>
                              {formatChemoDate(cycle.actual_date)}
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="text-[11px] hidden sm:inline text-slate-500">
                      {isExpanded ? "Hide Details" : "View Details"}
                    </span>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                </button>

                {/* Expanded Cycle Content */}
                {isExpanded && (
                  <div className="p-4 pt-1 border-t border-slate-100 space-y-3 bg-white">
                    {/* Delay notice if delayed */}
                    {cycle.treatment_delay && (
                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                        <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                        <span>
                          Cycle delayed: {cycle.delay_reason || "Medical reason."}{" "}
                          {cycle.rescheduled_date && (
                            <strong>
                              Rescheduled to{" "}
                              {formatChemoDate(cycle.rescheduled_date)}
                            </strong>
                          )}
                        </span>
                      </div>
                    )}

                    {/* Administered Medications for this Cycle */}
                    {cycle.administrations && cycle.administrations.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            Administered at Daycare (
                            {
                              cycle.administrations.filter(
                                (a) =>
                                  a.administration_status === "GIVEN" ||
                                  a.administration_status === "Completed"
                              ).length
                            }{" "}
                            Given):
                          </span>
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold border border-emerald-200">
                            Confirmed Infusion Record
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {cycle.administrations.map((admin, aidx) => {
                            const isGiven =
                              admin.administration_status === "GIVEN" ||
                              admin.administration_status === "Completed";
                            return (
                              <div
                                key={admin.administration_id || aidx}
                                className={cn(
                                  "p-2.5 rounded-lg text-xs flex items-center justify-between gap-2 border transition-all",
                                  isGiven
                                    ? "bg-emerald-50/50 border-emerald-200 text-emerald-950"
                                    : "bg-slate-50 border-slate-200 text-slate-700"
                                )}
                              >
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span
                                      className={cn(
                                        "text-[9px] font-bold px-1.5 py-0.2 rounded uppercase flex items-center gap-0.5",
                                        isGiven
                                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                          : "bg-slate-200 text-slate-700"
                                      )}
                                    >
                                      {isGiven && <CheckCircle2 size={9} />}
                                      {admin.administration_status || "GIVEN"}
                                    </span>
                                    <span className="font-bold text-slate-900">
                                      {admin.drug_name || admin.medicine_name}
                                    </span>
                                  </div>
                                  <span className="text-slate-500 text-[10px] block mt-0.5">
                                    {admin.drug_role || "Medication"} • {admin.administration_route || "IV"}
                                    {admin.administration_date
                                      ? ` • ${formatChemoDate(admin.administration_date)}`
                                      : ""}
                                    {admin.administered_by_name
                                      ? ` • ${admin.administered_by_name}`
                                      : ""}
                                  </span>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="font-mono font-bold text-emerald-800">
                                    {admin.administered_dose
                                      ? `${admin.administered_dose} ${admin.administered_dose_unit || "mg"}`
                                      : "Given"}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Drugs list */}
                    {cycle.orders.some((o) => o.items && o.items.length > 0) ? (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                          Chemotherapy Medications:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {cycle.orders.flatMap((o) => o.items || []).map((med, midx) => (
                            <div
                              key={midx}
                              className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between"
                            >
                              <div>
                                <span className="font-bold text-slate-800">{med.drug_name}</span>
                                {med.administration_route && (
                                  <span className="text-slate-500 text-[10px] block">
                                    {med.administration_route} • {med.duration || "Daycare"}
                                  </span>
                                )}
                              </div>
                              <span className="font-mono font-semibold text-slate-700">
                                {med.calculated_dose
                                  ? `${med.calculated_dose} ${med.calculated_dose_unit || "mg"}`
                                  : med.protocol_dose
                                  ? `${med.protocol_dose} ${med.protocol_dose_unit || "mg"}`
                                  : "Prescribed"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic">
                        Standard regimen protocol will be applied on admission date.
                      </div>
                    )}

                    {/* Pre-chemo investigations */}
                    {cycle.orders.some((o) => o.investigations && o.investigations.length > 0) && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                          Pre-Chemo Required Tests:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {cycle.orders.flatMap((o) => o.investigations || []).map((inv, iidx) => (
                            <span
                              key={iidx}
                              className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 text-[11px] font-medium"
                            >
                              {inv.investigation_name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Remarks if any */}
                    {cycle.remarks && (
                      <div className="text-xs text-slate-600 pt-1 border-t border-slate-100">
                        <strong className="text-slate-800">Doctor Note:</strong> {cycle.remarks}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* DAYCARE ADMISSION & PREPARATION GUIDELINES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Preparation Guidelines */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-2xs">
          <div className="flex items-center gap-2 text-[#00488D]">
            <HeartPulse size={18} />
            <h3 className="text-sm font-bold text-slate-900">
              How to Prepare for Chemo Day
            </h3>
          </div>

          <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">•</span>
              <span><strong>Hydration:</strong> Drink 8–10 glasses of water or fluids 24–48 hours prior to your scheduled cycle unless restricted by your doctor.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">•</span>
              <span><strong>Light Meal:</strong> Have a light, bland meal 1–2 hours before your infusion (e.g., toast, soup, crackers). Avoid heavy or greasy foods.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">•</span>
              <span><strong>Pre-Medications:</strong> Take any prescribed anti-nausea or steroid tablets exactly as directed by your oncologist before leaving home.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">•</span>
              <span><strong>Comfortable Clothing:</strong> Wear loose clothing with easy access to your arm or chemo port. Bring a jacket or blanket for comfort.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">•</span>
              <span><strong>Companion:</strong> Arrange for a family member or friend to accompany you and drive you home after your daycare session.</span>
            </li>
          </ul>
        </div>

        {/* Warning Signs & Emergency Contact */}
        <div className="bg-red-50/50 rounded-2xl border border-red-200/80 p-5 space-y-3 shadow-2xs">
          <div className="flex items-center gap-2 text-red-700">
            <Thermometer size={18} />
            <h3 className="text-sm font-bold text-red-950">
              When to Contact Your Care Team Immediately
            </h3>
          </div>

          <p className="text-xs text-red-900 leading-relaxed">
            Please report any of the following symptoms immediately to the 24/7 oncology triage or emergency room:
          </p>

          <ul className="text-xs text-red-800 space-y-1.5 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-red-600 font-bold">•</span>
              <span><strong>Fever of 100.4°F (38.0°C)</strong> or higher, or severe chills and shivering.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600 font-bold">•</span>
              <span>Uncontrolled vomiting lasting more than 24 hours despite taking antiemetics.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600 font-bold">•</span>
              <span>Sudden shortness of breath, chest pain, or rapid irregular heartbeats.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600 font-bold">•</span>
              <span>Unusual bleeding, blood in urine/stool, or sudden extensive bruising.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600 font-bold">•</span>
              <span>Severe redness, pain, or swelling around your IV infusion site or chemo port.</span>
            </li>
          </ul>

          <div className="pt-2 border-t border-red-200 flex items-center justify-between text-xs">
            <span className="font-semibold text-red-900">Oncology Daycare Helpline:</span>
            <strong className="text-red-700 font-mono text-sm">
              {activePlan.branch?.emergency_no || "+91 98765 43210"}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}
