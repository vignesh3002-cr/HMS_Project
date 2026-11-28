import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import {
  HeartPulse,
  Activity,
  CalendarPlus,
  CheckCircle2,
  CalendarDays,
  Clock,
  ChevronDown,
  ChevronUp,
  Zap,
  Loader2,
  ExternalLink,
  FlaskConical,
  UserX,
  ArrowRight,
  FileText,
  Layers,
} from "lucide-react";
import { labOrderApi } from "@/api/labOrder.api";
import { followUpAlertApi, type FollowUpAlert } from "@/api/followUpAlert.api";
import { appointmentApi } from "@/api/appointment.api";
import {
  chemotherapyApi,
  type RegimenProtocol,
  type ChemoPlan,
} from "@/api/chemotherapy.api";
import {
  summarizeCycles,
  getUpcomingCycles,
  upcomingDateOf,
  fmtDate,
  type OrderWidgetRow,
} from "@/pages/orderMasterCycles";
import { useBranchFilter } from "@/context/BranchFilterContext";
import { usePermission } from "@/context/PermissionContext";
import { useToast } from "@/hooks/use-toast";
import { RefreshButton } from "@/components/hms/RefreshButton";

export type ClinicalCategory =
  | "care-alerts"
  | "reviews"
  | "recent-protocols"
  | "upcoming-cycles";

export interface ClinicalCheckItem {
  id: string;
  category: "care-alerts";
  title: string;
  description: string;
  severity: "critical" | "warning" | "optimal";
  count?: number;
  actionLabel?: string;
  actionRoute?: string;
  onClickAction?: () => void;
}

export interface ProtocolReviewItem {
  id: string;
  name: string;
  date: string;
  days: string;
  isOverdue: boolean;
}

export interface RecentProtocolItem {
  id: string;
  name: string;
  updated_by: string;
  updated_at: string;
}

export interface UpcomingCycleItem {
  plan_id: string;
  patient_name: string;
  protocol: string;
  cycle_label: string;
  date: string;
}

export interface PatientClinicalAlertsWidgetProps {
  criticalPatientCount?: number;
  unassignedApptsCount?: number;
  onFilterCritical?: () => void;
  className?: string;
}

export function PatientClinicalAlertsWidget({
  criticalPatientCount = 0,
  unassignedApptsCount = 0,
  onFilterCritical,
  className = "",
}: PatientClinicalAlertsWidgetProps) {
  const navigate = useNavigate();
  const { selectedBranchId, isAllBranches } = useBranchFilter();
  const { can } = usePermission();
  const { toast } = useToast();

  const canReadLabs = can("chemo.plan.read");
  const canReadChemo = can("chemo.plan.read");
  const canReadProtocols = can("chemo.protocol.manage") || can("chemo.plan.read");

  const [activeTab, setActiveTab] = useState<ClinicalCategory>("care-alerts");
  const [isScanning, setIsScanning] = useState(false);
  const [urgentLabOrdersCount, setUrgentLabOrdersCount] = useState<number>(0);
  const [pendingFollowUps, setPendingFollowUps] = useState<FollowUpAlert[]>([]);
  const [bookingAlertId, setBookingAlertId] = useState<string | null>(null);
  const [isPendingListOpen, setIsPendingListOpen] = useState(false);

  // Protocol reviews & recently updated
  const [protocolReviews, setProtocolReviews] = useState<ProtocolReviewItem[]>([]);
  const [recentProtocols, setRecentProtocols] = useState<RecentProtocolItem[]>([]);

  // Upcoming chemotherapy cycles
  const [upcomingCycles, setUpcomingCycles] = useState<UpcomingCycleItem[]>([]);

  // Scan clinical data, protocol reviews, and upcoming cycles
  const runClinicalScan = async () => {
    setIsScanning(true);
    try {
      const tasks: Promise<any>[] = [];

      // 1. Follow-up alerts
      tasks.push(
        followUpAlertApi
          .getAlerts(isAllBranches ? undefined : selectedBranchId)
          .then((res) => {
            const alerts = res.data?.data?.alerts || [];
            setPendingFollowUps(alerts.filter((a) => !a.booked));
          })
          .catch((err) => console.warn("[PatientClinicalAlerts] Follow-up alerts warning:", err))
      );

      // 2. Urgent lab orders
      if (canReadLabs) {
        tasks.push(
          labOrderApi
            .getAll()
            .then((res) => {
              const data: any = res.data?.data;
              const orders = Array.isArray(data) ? data : data?.orders || [];
              const urgent = orders.filter(
                (o: any) =>
                  (o?.priority || "").toUpperCase() === "URGENT" ||
                  (o?.priority || "").toUpperCase() === "STAT"
              );
              setUrgentLabOrdersCount(urgent.length);
            })
            .catch((err) => console.warn("[PatientClinicalAlerts] Lab scan warning:", err))
        );
      }

      // 3. Chemotherapy Protocols (for Protocol Reviews & Recently Updated)
      if (canReadProtocols) {
        tasks.push(
          chemotherapyApi
            .listRegimenProtocols({ include_inactive: false })
            .then((res) => {
              const list: RegimenProtocol[] = res.data?.data || [];
              const now = new Date();

              // Compute upcoming reviews
              const reviews: ProtocolReviewItem[] = list
                .filter((r) => r.review_date && !isNaN(new Date(r.review_date).getTime()))
                .map((r) => {
                  const d = new Date(r.review_date!);
                  const diffDays = differenceInDays(d, now);
                  let daysText = "Today";
                  if (diffDays > 0) {
                    daysText = `in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
                  } else if (diffDays < 0) {
                    daysText = `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} overdue`;
                  }
                  return {
                    id: r.protocol_id,
                    name: r.name,
                    date: format(d, "dd MMM yyyy"),
                    days: daysText,
                    isOverdue: diffDays < 0,
                  };
                })
                .sort((a, b) => (a.isOverdue === b.isOverdue ? 0 : a.isOverdue ? -1 : 1))
                .slice(0, 5);

              setProtocolReviews(reviews);

              // Compute recently updated protocols
              const recent: RecentProtocolItem[] = [...list]
                .sort(
                  (a, b) =>
                    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
                )
                .slice(0, 5)
                .map((r) => ({
                  id: r.protocol_id,
                  name: r.name,
                  updated_by: r.updated_by || "—",
                  updated_at: r.updated_at,
                }));

              setRecentProtocols(recent);
            })
            .catch((err) => console.warn("[PatientClinicalAlerts] Protocol scan warning:", err))
        );
      }

      // 4. Upcoming Chemotherapy Cycles
      if (canReadChemo) {
        tasks.push(
          chemotherapyApi
            .listPlans({ limit: 25 })
            .then((res) => {
              const plans: ChemoPlan[] = res.data?.data || [];
              const mappedRows: (OrderWidgetRow & {
                plan_id: string;
                patient_name: string;
                protocol: string;
                cycle_label: string;
              })[] = plans.map((p: ChemoPlan) => {
                const cycles = summarizeCycles(p);
                const patientName =
                  p.patient_bio_data?.patient_first_name && p.patient_bio_data?.patient_last_name
                    ? `${p.patient_bio_data.patient_first_name} ${p.patient_bio_data.patient_last_name}`
                    : p.patient_name || "—";
                return {
                  plan_id: p.chemotherapy_plan_id,
                  patient_name: patientName,
                  protocol: p.regimen_name ?? p.protocol_name ?? "—",
                  cycle_label: cycles.cycleLabel,
                  start_date: p.treatment_start_date || "",
                  next_cycle_date: p.next_cycle_date || "",
                  raw_status: (p.treatment_status ?? "PLANNED").toUpperCase(),
                  cycle_progress: cycles.progress,
                };
              });

              const upcomingRows = getUpcomingCycles(mappedRows, 5);
              const items: UpcomingCycleItem[] = upcomingRows.map((r) => ({
                plan_id: r.plan_id,
                patient_name: r.patient_name,
                protocol: r.protocol,
                cycle_label: r.cycle_label,
                date: fmtDate(upcomingDateOf(r)),
              }));

              setUpcomingCycles(items);
            })
            .catch((err) => console.warn("[PatientClinicalAlerts] Cycles scan warning:", err))
        );
      }

      await Promise.allSettled(tasks);
    } catch (err) {
      console.warn("[PatientClinicalAlerts] Scan completed with warnings", err);
    } finally {
      setTimeout(() => setIsScanning(false), 500);
    }
  };

  const handleOneClickBook = async (e: React.MouseEvent, alert: FollowUpAlert) => {
    e.stopPropagation();
    if (!alert.doctor) {
      navigate("/appointments/book", {
        state: {
          patient: { patient_id: alert.patient.patient_id, patient_first_name: alert.patient.name },
          selectedDate: alert.follow_up_date,
          followUpDate: alert.follow_up_date,
          keepDate: true,
          isFollowUpBooking: true,
          defaultVisitType: "Follow-up",
        },
      });
      return;
    }

    setBookingAlertId(alert.encounter_no);
    try {
      let chosenTime = "09:00";
      try {
        const slotRes = await appointmentApi.getAvailableSlots(
          alert.doctor.employee_id,
          alert.branch.branch_id,
          alert.follow_up_date
        );
        const slots = slotRes.data?.data?.slots || [];
        const open = slots.find((s) => s.is_available);
        if (open?.time) chosenTime = open.time;
      } catch (slotErr) {
        console.warn("[PatientClinicalAlerts] getAvailableSlots fallback:", slotErr);
      }

      await appointmentApi.create({
        patient_id: alert.patient.patient_id,
        patient_name: alert.patient.name,
        patient_number: alert.patient.mobile || undefined,
        branch_id: alert.branch.branch_id,
        department_id: alert.department?.department_id || "",
        employee_id: alert.doctor.employee_id,
        appointment_date: alert.follow_up_date,
        appointment_time: chosenTime,
        patient_type: "Outpatient (OPD)",
        patient_visit_type: "Follow-up",
        reason_for_visit: "Follow-up consultation",
      });

      toast({
        title: "Appointment Booked!",
        description: `Follow-up booked for ${alert.patient.name} on ${alert.follow_up_date} at ${chosenTime}.`,
      });

      void followUpAlertApi.dismiss(alert.encounter_no);
      runClinicalScan();
    } catch (err: any) {
      toast({
        title: "Instant booking could not complete",
        description: err.response?.data?.message || "Redirecting to appointment scheduler...",
      });
      navigate("/appointments/book", {
        state: {
          patient: { patient_id: alert.patient.patient_id, patient_first_name: alert.patient.name },
          slot: { doctorId: alert.doctor.employee_id, branchId: alert.branch.branch_id, date: alert.follow_up_date },
          selectedDate: alert.follow_up_date,
          followUpDate: alert.follow_up_date,
          keepDate: true,
          isFollowUpBooking: true,
          defaultVisitType: "Follow-up",
        },
      });
    } finally {
      setBookingAlertId(null);
    }
  };

  useEffect(() => {
    runClinicalScan();
  }, [selectedBranchId, isAllBranches, canReadLabs, canReadProtocols, canReadChemo]);

  // Aggregate clinical care check items
  const checkItems = useMemo<ClinicalCheckItem[]>(() => {
    const items: ClinicalCheckItem[] = [];

    // 1. Critical Vitals Breach
    if (criticalPatientCount > 0) {
      items.push({
        id: "crit-vitals",
        category: "care-alerts",
        title: `${criticalPatientCount} Critical Vitals ${criticalPatientCount > 1 ? "Breaches" : "Breach"}`,
        description: "Encounter observations detected SpO2 < 90%, BP > 180/120, or emergency clinical notes.",
        severity: "critical",
        count: criticalPatientCount,
        actionLabel: "Filter Patients",
        actionRoute: "/patients?critical=true",
        onClickAction: onFilterCritical || (() => navigate("/patients?critical=true")),
      });
    }

    // 2. Pending Follow-up Bookings
    if (pendingFollowUps.length > 0) {
      const overdueCount = pendingFollowUps.filter((a) => a.due_status === "OVERDUE").length;
      items.push({
        id: "pending-followups",
        category: "care-alerts",
        title: `${pendingFollowUps.length} Pending Follow-up Booking${pendingFollowUps.length > 1 ? "s" : ""}`,
        description:
          overdueCount > 0
            ? `${overdueCount} overdue follow-up consult${overdueCount > 1 ? "s" : ""} need immediate booking.`
            : `Doctor-prescribed follow-ups awaiting appointment scheduling.`,
        severity: overdueCount > 0 ? "warning" : "optimal",
        count: pendingFollowUps.length,
        actionLabel: "View Queue",
        actionRoute: "/appointments/pending",
        onClickAction: () => navigate("/appointments/pending"),
      });
    }

    // 3. Urgent Lab Orders
    if (urgentLabOrdersCount > 0) {
      items.push({
        id: "urgent-labs",
        category: "care-alerts",
        title: `${urgentLabOrdersCount} Urgent Lab Investigation${urgentLabOrdersCount > 1 ? "s" : ""}`,
        description: "Stat laboratory orders awaiting specimen verification or diagnostic release.",
        severity: "warning",
        count: urgentLabOrdersCount,
        actionLabel: "Lab Orders",
        onClickAction: () => {
          toast({
            title: "Lab Investigation",
            description: "This feature is not available yet.",
            variant: "destructive",
          });
        },
      });
    }

    // 4. Unassigned Consultations
    if (unassignedApptsCount > 0) {
      items.push({
        id: "unassigned-appts",
        category: "care-alerts",
        title: `${unassignedApptsCount} Unassigned Consultation${unassignedApptsCount > 1 ? "s" : ""}`,
        description: "Patient bookings currently missing an assigned primary physician or specialist.",
        severity: "warning",
        count: unassignedApptsCount,
        actionLabel: "Assign Doctor",
        actionRoute: "/appointments",
      });
    }

    // Default healthy clinical state
    if (
      criticalPatientCount === 0 &&
      unassignedApptsCount === 0 &&
      urgentLabOrdersCount === 0 &&
      pendingFollowUps.length === 0
    ) {
      items.push({
        id: "clinical-healthy",
        category: "care-alerts",
        title: "Clinical Patient Safety: Optimal",
        description: "All patient encounters within safe thresholds; zero unassigned appointments or pending follow-ups.",
        severity: "optimal",
        actionLabel: "View Patients",
        actionRoute: "/patients",
      });
    }

    return items;
  }, [
    criticalPatientCount,
    unassignedApptsCount,
    urgentLabOrdersCount,
    pendingFollowUps,
    navigate,
    onFilterCritical,
  ]);

  // Overall clinical status label
  const statusLabel = useMemo(() => {
    if (criticalPatientCount > 0) return "Critical Care Priority";
    const hasWarnings =
      unassignedApptsCount > 0 ||
      urgentLabOrdersCount > 0 ||
      pendingFollowUps.some((f) => f.due_status === "OVERDUE");
    if (hasWarnings) return "Attention Needed";
    return "Optimal Safety";
  }, [criticalPatientCount, unassignedApptsCount, urgentLabOrdersCount, pendingFollowUps]);

  return (
    <div
      className={`bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4 flex flex-col justify-between transition-all duration-300 hover:shadow-md ${className}`}
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-50 text-[#00488D]">
              <HeartPulse className="w-5 h-5 text-[#00488D]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#191C1E] tracking-tight">
                  Patient Care & Clinical Oversight
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-700">
                  {statusLabel}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Critical vitals, protocol reviews & chemotherapy cycles
              </p>
            </div>
          </div>

          {/* Controls: Re-scan button & Quick Registry link */}
          <div className="flex items-center gap-1.5">
            <RefreshButton
              onClick={runClinicalScan}
              isLoading={isScanning}
              title="Re-scan patient clinical signals"
            />
            <button
              type="button"
              onClick={() => {
                if (activeTab === "care-alerts") navigate("/patients");
                else if (activeTab === "upcoming-cycles") navigate("/doctor/chemo-orders");
                else navigate("/protocol");
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-50 text-[#00488D] hover:bg-blue-50 text-xs font-semibold border border-slate-200/80 transition-colors cursor-pointer"
            >
              <span>
                {activeTab === "care-alerts"
                  ? "Patients"
                  : activeTab === "upcoming-cycles"
                  ? "Orders"
                  : "Protocols"}
              </span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 pt-2 pb-1.5 border-b border-slate-50 overflow-x-auto text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("care-alerts")}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "care-alerts"
                ? "bg-[#00488D] text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            Care Alerts ({checkItems.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("reviews")}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "reviews"
                ? "bg-[#00488D] text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            Protocol Reviews {protocolReviews.length > 0 ? `(${protocolReviews.length})` : ""}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("recent-protocols")}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "recent-protocols"
                ? "bg-[#00488D] text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            Recent Protocols
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("upcoming-cycles")}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "upcoming-cycles"
                ? "bg-[#00488D] text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            Upcoming Cycles {upcomingCycles.length > 0 ? `(${upcomingCycles.length})` : ""}
          </button>
        </div>

        {/* Tab Content Region */}
        <div className="max-h-[220px] overflow-y-auto hide-scrollbar mt-3 space-y-2">
          {/* TAB 1: CARE ALERTS */}
          {activeTab === "care-alerts" &&
            checkItems.map((item) => {
              const isCritical = item.severity === "critical";

              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 p-2.5 rounded-xl border border-[#E5E7EB] bg-white hover:bg-slate-50/80 transition-all shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg shrink-0 flex items-center justify-center mt-0.5 bg-slate-100 text-[#00488D]">
                        {item.id === "pending-followups" ? (
                          <CalendarPlus className="w-3.5 h-3.5 text-[#00488D]" />
                        ) : item.id === "urgent-labs" ? (
                          <FlaskConical className="w-3.5 h-3.5 text-[#00488D]" />
                        ) : item.id === "unassigned-appts" ? (
                          <UserX className="w-3.5 h-3.5 text-[#00488D]" />
                        ) : (
                          <HeartPulse className="w-3.5 h-3.5 text-[#00488D]" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-bold leading-tight text-slate-800">
                            {item.title}
                          </h4>
                          {isCritical && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              CRITICAL
                            </span>
                          )}
                          {item.id === "pending-followups" && pendingFollowUps.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setIsPendingListOpen((prev) => !prev)}
                              className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#00488D] hover:underline cursor-pointer ml-1"
                            >
                              <span>{isPendingListOpen ? "Hide list" : "Show list"}</span>
                              {isPendingListOpen ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    {item.actionLabel && (
                      <button
                        type="button"
                        onClick={() => {
                          if (item.onClickAction) item.onClickAction();
                          else if (item.actionRoute) navigate(item.actionRoute);
                        }}
                        className="shrink-0 text-[11px] font-bold px-2 py-1 rounded-lg border border-slate-200 bg-white text-[#00488D] hover:bg-blue-50 transition-all whitespace-nowrap shadow-sm cursor-pointer"
                      >
                        {item.actionLabel}
                      </button>
                    )}
                  </div>

                  {/* Inline 1-Click Book list for pending follow-ups */}
                  {item.id === "pending-followups" && isPendingListOpen && pendingFollowUps.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-200/80 flex flex-col gap-1.5">
                      {pendingFollowUps.slice(0, 3).map((alert) => (
                        <div
                          key={alert.encounter_no}
                          className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white border border-slate-200 shadow-2xs hover:border-blue-200 transition-all text-xs"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 truncate">
                                {alert.patient.name}
                              </span>
                              {alert.due_status === "OVERDUE" ? (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                  Overdue ({alert.days_overdue}d)
                                </span>
                              ) : alert.due_status === "DUE_TODAY" ? (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                  Due Today
                                </span>
                              ) : (
                                <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                  In {alert.days_until}d
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 truncate mt-0.5">
                              Due: {alert.follow_up_date} •{" "}
                              {alert.doctor
                                ? `Dr. ${alert.doctor.name.replace(/^dr\.?\s+/i, "")}`
                                : "Unassigned"}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleOneClickBook(e, alert)}
                            disabled={bookingAlertId === alert.encounter_no}
                            title="Instant 1-click booking with earliest slot"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#00488D] hover:bg-[#003a6b] text-white font-bold text-[10px] transition-all shadow-sm active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
                          >
                            {bookingAlertId === alert.encounter_no ? (
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            ) : (
                              <Zap className="w-2.5 h-2.5 fill-current" />
                            )}
                            <span>1-Click Book</span>
                          </button>
                        </div>
                      ))}

                      <div className="flex items-center justify-between pt-1 text-[11px]">
                        <span className="text-slate-400">
                          Showing {Math.min(3, pendingFollowUps.length)} of {pendingFollowUps.length} pending
                        </span>
                        <button
                          type="button"
                          onClick={() => navigate("/appointments/pending")}
                          className="text-[#00488D] font-bold hover:underline inline-flex items-center gap-0.5"
                        >
                          <span>Open queue</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

          {/* TAB 2: PROTOCOL REVIEWS */}
          {activeTab === "reviews" && (
            <div className="space-y-2">
              {protocolReviews.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No upcoming protocol reviews scheduled.
                </div>
              ) : (
                protocolReviews.map((r) => (
                  <div
                    key={r.id}
                    onClick={() =>
                      navigate(`/protocol?protocol=${encodeURIComponent(r.id)}`, {
                        state: { filterProtocol: r.id, filterProtocolName: r.name },
                      })
                    }
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-[#E5E7EB] bg-white hover:bg-slate-50/80 transition-all shadow-2xs cursor-pointer group"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#191C1E] group-hover:text-[#00488D] truncate">
                        Protocol: {r.name}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{r.date}</div>
                    </div>
                    <span
                      className={`text-[10px] font-bold rounded-full px-2 py-0.5 whitespace-nowrap border ${
                        r.isOverdue
                          ? "text-red-700 bg-red-50 border-red-200"
                          : "text-amber-800 bg-amber-50 border-amber-200"
                      }`}
                    >
                      {r.days}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: RECENT PROTOCOLS */}
          {activeTab === "recent-protocols" && (
            <div className="space-y-2">
              {recentProtocols.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No recently updated protocols found.
                </div>
              ) : (
                recentProtocols.map((r) => (
                  <div
                    key={r.id}
                    onClick={() =>
                      navigate(`/protocol?protocol=${encodeURIComponent(r.id)}`, {
                        state: { filterProtocol: r.id, filterProtocolName: r.name },
                      })
                    }
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-[#E5E7EB] bg-white hover:bg-slate-50/80 transition-all shadow-2xs cursor-pointer group"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#191C1E] group-hover:text-[#00488D] truncate">
                        Protocol: {r.name}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {r.updated_by && r.updated_by !== "—" ? `Updated by ${r.updated_by}` : r.name}
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 shrink-0">
                      {r.updated_at && !isNaN(new Date(r.updated_at).getTime())
                        ? format(new Date(r.updated_at), "MMM d")
                        : "—"}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: UPCOMING CYCLES */}
          {activeTab === "upcoming-cycles" && (
            <div className="space-y-2">
              {upcomingCycles.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No upcoming chemotherapy cycles scheduled.
                </div>
              ) : (
                upcomingCycles.map((r) => (
                  <div
                    key={r.plan_id}
                    onClick={() =>
                      navigate("/", {
                        state: { filterPatient: r.patient_name },
                      })
                    }
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-[#E5E7EB] bg-white hover:bg-slate-50/80 transition-all shadow-2xs cursor-pointer group"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#191C1E] group-hover:text-[#00488D] truncate">
                        {r.patient_name}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {r.protocol} · {r.cycle_label}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {r.date}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer bar */}
      <div className="pt-2.5 mt-3 border-t border-[#F2F4F6] flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {activeTab === "care-alerts"
            ? "Clinical care & triage scanner"
            : activeTab === "upcoming-cycles"
            ? "Chemotherapy cycle tracking"
            : "Protocol lifecycle governance"}
        </span>
        <button
          type="button"
          onClick={() => {
            if (activeTab === "care-alerts") navigate("/patients");
            else if (activeTab === "upcoming-cycles") navigate("/doctor/chemo-orders");
            else navigate("/protocol");
          }}
          className="text-[#00488D] hover:underline font-semibold cursor-pointer"
        >
          {activeTab === "care-alerts"
            ? "Patient Registry"
            : activeTab === "upcoming-cycles"
            ? "Chemo Orders"
            : "Protocol Master"}
        </button>
      </div>
    </div>
  );
}
