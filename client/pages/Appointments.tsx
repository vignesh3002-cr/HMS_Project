import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Download,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Loader2,
  ArrowRightLeft,
  LogOut,
} from "lucide-react";
import HmsTable, { type HmsColumn } from "@/components/hms/HmsTable";
import { getDepartmentColors } from "@/components/hms/DepartmentBadge";
import { format, isToday, isTomorrow, isYesterday, addDays, subDays } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import CalendarPicker from "@/components/hms/Calender";
import { useFilterPanel, useAppointmentFilters } from "@/components/Filter";
import { ToolbarFilter } from "@/components/ui/toolbar-filter";
import { filterDataByValues } from "@/components/Filter/utils";
import { appointmentApi, type AppointmentRecord } from "@/api/appointment.api";
import { encounterApi } from "@/api/encounter.api";
import {
  ipdApi,
  type AdmissionRecord,
  type WardRecord,
  type BedRecord,
  type TransferAdmissionPayload,
  type DischargeAdmissionPayload,
} from "@/api/ipd.api";
import { useToast } from "@/hooks/use-toast";
import { RefreshButton } from "@/components/hms/RefreshButton";
import { StatusBadge } from "@/components/hms/StatusBadge";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { useBranchFilter, ALL_BRANCHES_VALUE, NO_BRANCH_VALUE } from "@/context/BranchFilterContext";
import { usePermission } from "@/context/PermissionContext";
import { getUser } from "@/utils/token";

import { useCriticalPatients } from "@/hooks/useCriticalPatients";
import { CriticalWrapper, CriticalCorner, CriticalDot } from "@/components/hms/CriticalPatientIndicator";
import { AppointmentActionMenu } from "@/components/hms/AppointmentActionMenu";
import { AdmissionActionMenu } from "@/components/hms/AdmissionActionMenu";

import DayView from "./Day view";
import WeekView from "./Week view";
import ExportReport from "@/components/ui/ExportReport";
import { downloadExportCsv, exportErrorMessage } from "@/api/export.api";
import { downloadExportPdf } from "@/lib/exportPdf";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";


interface Appointment {
  id: string;
  tokenId: string;
  patient: string;
  patientId: string;
  patientInitial: string;
  avatarColor: string;
  avatarBg: string;
  branch: string;
  
  doctor: string;
  doctorId: string;
  doctorInitial: string;
  visitType?: string;
  date: string;
  time: string;
  sortDate: number;
  status: string;
  appointmentDateISO?: string;
}


// Mirrors APPOINTMENT_STATUS in appointment.constants.ts exactly -- keep
// these keys in sync with the backend enum (previously had "BOOKED" where
// the backend actually uses "SCHEDULED", and a "CONFIRMED" status that
// doesn't exist there, so every newly-booked appointment fell through to
// the raw-value fallback below instead of getting a real label).
const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Scheduled",
  CHECKED_IN: "Checked In",
  IN_CONSULTATION: "In Consultation",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
  RESCHEDULED: "Rescheduled",
  RESCHEDULE_REQUIRED: "Reschedule Required",
  TRANSFER_REVIEW_REQUIRED: "Transfer Review Required",
};

function getInitials(name: string): string {
  const words = name.replace(/^Dr\.?\s*/i, "").trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

function formatPatientName(p: AppointmentRecord["patient_bio_data"]): string {
  if (!p) return "Unknown Patient";
  return [p.patient_first_name, p.patient_middle_name, p.patient_last_name]
    .filter(Boolean)
    .join(" ");
}

function formatDoctorName(e: AppointmentRecord["employees"]): string {
  if (!e) return "Unassigned";
  return `Dr. ${[e.first_name, e.middle_name, e.last_name].filter(Boolean).join(" ")}`;
}

function formatAppointmentDate(date: string): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${month}/${day}/${d.getUTCFullYear()}`;
}

function formatAppointmentTime(time: string): string {
  const t = new Date(time);
  if (isNaN(t.getTime())) return "—";
  const minutes = String(t.getUTCMinutes()).padStart(2, "0");
  const period = t.getUTCHours() >= 12 ? "PM" : "AM";
  const hours12 = t.getUTCHours() % 12 || 12;
  return `${String(hours12).padStart(2, "0")}:${minutes} ${period}`;
}

function isAppointmentTimePast(appointmentTime: string): boolean {
  const now = new Date();
  const appt = new Date(appointmentTime);
  if (isNaN(appt.getTime())) return false;
  return appt < now;
}

function formatAppointmentTimeConditional(record: Appointment): string {
  const dateStr = record.date;
  const todayStr = format(new Date(), "MM/dd/yyyy");
  if (dateStr !== todayStr) return record.time;
  if (isAppointmentTimePast(record.time)) return "—";
  return record.time;
}

function mapAppointmentRecord(record: AppointmentRecord, index: number): Appointment {
  const patientName = formatPatientName(record.patient_bio_data);
  const hasDoctor = Boolean(record.employees && record.employee_id && record.employee_id !== "—");
  const doctorName = hasDoctor ? formatDoctorName(record.employees) : "—";
  const deptName = record.department_master?.department_name ?? record.department ?? null;
  const { bg: deptBg, text: deptColor } = getDepartmentColors(deptName);

  const dateMs = new Date(record.appointment_date).getTime();
  const timeMs = new Date(record.appointment_time).getTime();
  const timeOfDayMs = !isNaN(timeMs)
    ? (timeMs % 86400000 + 86400000) % 86400000
    : 0;
  const sortDate = (isNaN(dateMs) ? 0 : dateMs) + timeOfDayMs;

  return {
    id: record.appointment_id,
    tokenId: record.token_number != null ? String(record.token_number) : "—",
    patient: patientName,
    patientId: record.patient_id,
    patientInitial: getInitials(patientName),
    avatarColor: deptColor,
    avatarBg: deptBg,
    branch: record.branch?.branch_name ?? "—",
    doctor: doctorName,
    doctorId: (hasDoctor && record.employee_id) ? record.employee_id : "—",
    doctorInitial: getInitials(doctorName),
    visitType: record.Patient_visit_type || record.patient_visit_type || "",
    date: formatAppointmentDate(record.appointment_date),
    time: formatAppointmentTime(record.appointment_time),
    sortDate,
    status: STATUS_LABELS[record.status ?? ""] ?? (record.status || "Unknown"),
    appointmentDateISO: record.appointment_date,
  };
}

const AppointmentSchedule: React.FC<{ defaultTab?: "opd" | "ipd" }> = ({ defaultTab = "opd" }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { can } = usePermission();
  const { selectedBranchId, isAllBranches } = useBranchFilter();

  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isAppointmentsLoading, setIsAppointmentsLoading] = useState(true);

  const appointmentPatientIds = useMemo(() => {
    return [...new Set(appointments.map((a) => a.patientId).filter(Boolean))];
  }, [appointments]);



  const { getCriticalInfo } = useCriticalPatients(
    appointmentPatientIds.map((id) => ({ patientId: id }))
  );

  // Date selection
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const fetchAppointments = useCallback(async () => {
    setIsAppointmentsLoading(true);
    try {
      const res = await appointmentApi.getAll({
        branchId: isAllBranches ? undefined : selectedBranchId,
        date: format(selectedDate, "yyyy-MM-dd"),
        limit: 100,
      });
      const records = res.data?.data?.appointments || [];
      setAppointments(records.map(mapAppointmentRecord));
      if (records.length === 0) {
        toast({
          title: "No appointment records found",
          description: "The appointments API returned no records.",
        });
      }
    } catch (err: any) {
      console.error("[Appointments Page] Error:", err);
      toast({
        title: "Failed to load appointments",
        description: err.response?.data?.message || "Couldn't reach the appointments API.",
        variant: "destructive",
      });
    } finally {
      setIsAppointmentsLoading(false);
    }
  }, [toast, selectedBranchId, isAllBranches, selectedDate]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancelAppointment = (target: Appointment) => {
    setCancelReason("");
    setCancelTarget(target);
  };

  const handleConfirmCancelAppointment = async () => {
    if (!cancelTarget) return;

    if (!cancelReason.trim()) {
      toast({ title: "A cancellation reason is required", variant: "destructive" });
      return;
    }

    setIsCancelling(true);
    try {
      const res = await appointmentApi.cancel(
        cancelTarget.id,
        cancelReason.trim(),
        getUser()?.employee_id ?? "",
      );
      const cancelled = res.data?.data;
      setAppointments((prev) =>
        prev.map((appt) =>
          appt.id === cancelTarget.id
            ? cancelled && cancelled.patient_bio_data
              ? mapAppointmentRecord(cancelled, 0)
              : { ...appt, status: "Cancelled" }
            : appt,
        ),
      );
      fetchAppointments();
      toast({
        title: "Appointment cancelled",
        description: `Appointment ${cancelTarget.id} has been cancelled.`,
      });
      setCancelTarget(null);
      setCancelReason("");
    } catch (err: any) {
      console.error("[Appointments Page] Cancel error:", err);
      toast({
        title: "Failed to cancel appointment",
        description: err.response?.data?.message || "Couldn't reach the appointments API.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCheckIn = async (appointment: Appointment) => {
    try {
      await appointmentApi.updateStatus(appointment.id, "CHECKED_IN");
      await encounterApi.create({ appointment_id: appointment.id });
      await fetchAppointments();
      toast({
        title: "Patient checked in",
        description: `Appointment ${appointment.id} checked in and encounter created.`,
      });
    } catch (err: any) {
      console.error("[Appointments Page] Check-in error:", err);
      toast({
        title: "Check-in failed",
        description: err.response?.data?.message || "Failed to check in patient.",
        variant: "destructive",
      });
    }
  };

  const handleCheckOut = async (appointment: Appointment) => {
    try {
      const encounters = await encounterApi.getAll({ appointmentId: appointment.id });
      const encounter = encounters.data?.data?.encounters?.[0];
      if (encounter) {
        await encounterApi.close(encounter.encounter_no, "DOCTOR");
      }
      await fetchAppointments();
      toast({
        title: "Patient checked out",
        description: `Appointment ${appointment.id} checked out.`,
      });
    } catch (err: any) {
      console.error("[Appointments Page] Check-out error:", err);
      toast({
        title: "Check-out failed",
        description: err.response?.data?.message || "Failed to check out patient.",
        variant: "destructive",
      });
    }
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Sort state — defaults to Appointment Date (ascending)
  const [sortField, setSortField] = useState("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // View type dropdown (List View / Day View / Week View)
  const [viewType, setViewType] = useState<"list" | "day" | "week">("list");
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const viewMenuRef = useRef<HTMLDivElement>(null);

  // OPD | Inpatient (IPD) segmented hub -- /ipd lands here on the IPD tab.
  const [activeTab, setActiveTab] = useState<"opd" | "ipd">(defaultTab);

  // ---------------------------------------------------------------
  // IPD (admissions) — same page chrome, table columns/actions swap.
  // ---------------------------------------------------------------
  const [admissions, setAdmissions] = useState<AdmissionRecord[]>([]);
  const [admissionsLoading, setAdmissionsLoading] = useState(true);
  const [ipdSearch, setIpdSearch] = useState("");
  const [ipdSelectedDate, setIpdSelectedDate] = useState(new Date());
  const [isIpdCalendarOpen, setIsIpdCalendarOpen] = useState(false);
  const [ipdPage, setIpdPage] = useState(1);
  const [ipdRowsPerPage, setIpdRowsPerPage] = useState(10);
  const [ipdTotal, setIpdTotal] = useState(0);
  const [ipdTotalPages, setIpdTotalPages] = useState(1);

  // IPD sort state — same header-toggling mechanism as the OPD table.
  const [ipdSortField, setIpdSortField] = useState("admission_date");
  const [ipdSortDirection, setIpdSortDirection] = useState<"asc" | "desc">("desc");

  // IPD workflow state (transfer / discharge / details)
  const [activeAdmission, setActiveAdmission] = useState<AdmissionRecord | null>(null);
  const [wards, setWards] = useState<WardRecord[]>([]);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferData, setTransferData] = useState<TransferAdmissionPayload>({
    targetWardId: "",
    targetBedId: "",
    reason: "",
  });
  const [availableBedsForTransfer, setAvailableBedsForTransfer] = useState<BedRecord[]>([]);
  const [submittingTransfer, setSubmittingTransfer] = useState(false);
  const [dischargeOpen, setDischargeOpen] = useState(false);
  const [dischargeData, setDischargeData] = useState<DischargeAdmissionPayload>({
    discharge_type: "RECOVERED",
    discharge_summary: "",
    discharge_date: new Date().toISOString().slice(0, 16),
  });
  const [submittingDischarge, setSubmittingDischarge] = useState(false);

  // Critical-patient indicators for the IPD patient column, mirroring how the
  // OPD table marks critical patients (admissions state must exist first).
  const admissionPatientIds = useMemo(() => {
    return [...new Set(admissions.map((a) => a.patient_id).filter(Boolean))];
  }, [admissions]);

  const { getCriticalInfo: getAdmissionCriticalInfo } = useCriticalPatients(
    admissionPatientIds.map((id) => ({ patientId: id })),
  );

  const effectiveBranchId = useMemo(() => {
    if (!selectedBranchId || selectedBranchId === ALL_BRANCHES_VALUE || selectedBranchId === NO_BRANCH_VALUE) {
      return undefined;
    }
    return selectedBranchId;
  }, [selectedBranchId]);

  // IPD Filters -- same ToolbarFilter mechanism as OPD, own draft/applied
  // state so opening one tab's panel never touches the other's.
  const {
    values: ipdFilterValues,
    appliedValues: ipdAppliedFilterValues,
    isOpen: isIpdFilterOpen,
    setIsOpen: setIsIpdFilterOpen,
    handleChange: handleIpdFilterChange,
    handleApply: handleApplyIpdFilter,
    handleClear: handleClearIpdFilter,
  } = useFilterPanel();

  // Status lists every admission status (not just ones on the current page)
  // so it stays complete no matter what's currently loaded.
  const ipdFilterFields = [
    {
      id: "status",
      label: "Status",
      type: "multiselect" as const,
      options: [
        { label: "Planned", value: "PLANNED" },
        { label: "Admitted", value: "ADMITTED" },
        { label: "Discharged", value: "DISCHARGED" },
        { label: "Transferred", value: "TRANSFERRED" },
        { label: "Cancelled", value: "CANCELLED" },
      ],
    },
  ];

  const ipdAppliedStatus: string[] = useMemo(
    () => (Array.isArray(ipdAppliedFilterValues.status) ? ipdAppliedFilterValues.status : []),
    [ipdAppliedFilterValues.status],
  );

  // Load Wards (for the transfer dialog)
  const fetchWards = useCallback(async () => {
    try {
      const res = await ipdApi.getWards(effectiveBranchId);
      if (res.data?.success && Array.isArray(res.data.data)) {
        setWards(res.data.data);
      }
    } catch {
      // fallback silent
    }
  }, [effectiveBranchId]);

  // Load Admissions
  const fetchAdmissions = useCallback(async () => {
    setAdmissionsLoading(true);
    try {
      const res = await ipdApi.getAll({
        branchId: effectiveBranchId,
        status: ipdAppliedStatus.length ? ipdAppliedStatus.join(",") : undefined,
        date: format(ipdSelectedDate, "yyyy-MM-dd"),
        search: ipdSearch.trim() || undefined,
        page: ipdPage,
        limit: ipdRowsPerPage,
        sortField: ipdSortField,
        sortDirection: ipdSortDirection,
      });

      if (res.data?.success) {
        setAdmissions(res.data.data.admissions || []);
        setIpdTotal(res.data.data.total || 0);
        setIpdTotalPages(res.data.data.totalPages || 1);
      }
    } catch (err: any) {
      toast({
        title: "Failed to load admissions",
        description: err?.message || "Please check your network connection.",
        variant: "destructive",
      });
    } finally {
      setAdmissionsLoading(false);
    }
  }, [effectiveBranchId, ipdAppliedStatus, ipdSelectedDate, ipdSearch, ipdPage, ipdRowsPerPage, ipdSortField, ipdSortDirection, toast]);

  useEffect(() => {
    if (activeTab !== "ipd") return;
    fetchWards();
  }, [activeTab, fetchWards]);

  useEffect(() => {
    if (activeTab !== "ipd") return;
    fetchAdmissions();
  }, [activeTab, fetchAdmissions]);

  // Same asc/desc toggle as the OPD table, routed through the backend sort.
  const handleIpdSort = (field: string) => {
    if (ipdSortField === field) {
      setIpdSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setIpdSortField(field);
      setIpdSortDirection("asc");
    }
    setIpdPage(1);
  };

  // Open Transfer dialog
  const handleOpenTransfer = (admission: AdmissionRecord) => {
    setActiveAdmission(admission);
    setTransferData({ targetWardId: "", targetBedId: "", reason: "" });
    setAvailableBedsForTransfer([]);
    setTransferOpen(true);
  };

  // When target ward changes in transfer modal, load available beds
  const handleTransferWardChange = async (targetWardId: string) => {
    setTransferData((prev) => ({ ...prev, targetWardId, targetBedId: "" }));
    if (!targetWardId) {
      setAvailableBedsForTransfer([]);
      return;
    }
    try {
      const res = await ipdApi.getBeds(targetWardId, activeAdmission?.branch_id);
      if (res.data?.success) {
        setAvailableBedsForTransfer((res.data.data || []).filter((b) => b.status === "AVAILABLE"));
      }
    } catch {
      setAvailableBedsForTransfer([]);
    }
  };

  // Submit Bed Transfer
  const handleSubmitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAdmission) return;
    if (!transferData.targetWardId || !transferData.targetBedId) {
      toast({ title: "Target ward and bed are required", variant: "destructive" });
      return;
    }

    setSubmittingTransfer(true);
    try {
      const res = await ipdApi.transfer(activeAdmission.admission_id, transferData);
      if (res.data?.success) {
        toast({
          title: "Bed Transferred",
          description: `Patient successfully transferred to new bed.`,
        });
        setTransferOpen(false);
        fetchAdmissions();
      }
    } catch (err: any) {
      toast({
        title: "Transfer failed",
        description: err?.response?.data?.message || err?.message || "Transfer error.",
        variant: "destructive",
      });
    } finally {
      setSubmittingTransfer(false);
    }
  };

  // Open Discharge dialog
  const handleOpenDischarge = (admission: AdmissionRecord) => {
    setActiveAdmission(admission);
    setDischargeData({
      discharge_type: "RECOVERED",
      discharge_summary: "",
      discharge_date: new Date().toISOString().slice(0, 16),
    });
    setDischargeOpen(true);
  };

  // Submit Discharge
  const handleSubmitDischarge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAdmission) return;

    setSubmittingDischarge(true);
    try {
      const res = await ipdApi.discharge(activeAdmission.admission_id, dischargeData);
      if (res.data?.success) {
        toast({
          title: "Patient Discharged",
          description: `Admission ${activeAdmission.ip_number} has been discharged and bed released.`,
        });
        setDischargeOpen(false);
        fetchAdmissions();
      }
    } catch (err: any) {
      toast({
        title: "Discharge failed",
        description: err?.response?.data?.message || err?.message || "Discharge error.",
        variant: "destructive",
      });
    } finally {
      setSubmittingDischarge(false);
    }
  };

  // Open the admission details view -- same full-page pattern as the OPD
  // appointment view, rather than an inline popup.
  const handleOpenDetails = (admission: AdmissionRecord) => {
    navigate(`/admissions/view/${encodeURIComponent(admission.ip_number)}`);
  };

  // Admit a planned admission request -- binds + occupies the requested bed,
  // then immediately opens the IPD encounter, mirroring OPD's Check In
  // (status update + encounterApi.create) in one click instead of two.
  const handleAdmitPlanned = async (admission: AdmissionRecord) => {
    try {
      const res = await ipdApi.update(admission.admission_id, { status: "ADMITTED" });
      if (!res.data?.success) return;

      const admitted = res.data.data;
      try {
        await encounterApi.createIpd({ admission_id: admitted.admission_id });
      } catch (encounterErr: any) {
        // "Encounter already exists" can happen on a retried click -- treat
        // it the same as OPD's check-in does, i.e. not a failure.
        const message: string = encounterErr?.response?.data?.message || "";
        if (!/already exists/i.test(message)) {
          throw encounterErr;
        }
      }

      toast({
        title: "Patient admitted",
        description: `Admitted to ${admitted.ward_master?.ward_name || "ward"} • Bed ${admitted.bed_master?.bed_number || "—"} and encounter started.`,
      });
      fetchAdmissions();
    } catch (err: any) {
      toast({
        title: "Admit failed",
        description: err?.response?.data?.message || err?.message || "Failed to admit patient.",
        variant: "destructive",
      });
    }
  };

  // Edit a planned admission request via the shared AddAppointment form
  const handleEditPlanned = (admission: AdmissionRecord) => {
    navigate("/appointments/add", { state: { admissionEdit: admission } });
  };

  // IPD columns — same components and text sizes as the OPD table, only the
// value source changes. Status uses the shared StatusBadge (with IPD tones),
// the view opens the same full-page pattern as OPD, and sorting runs through
// the same HmsTable header mechanism (server-side).
const ipdColumns: HmsColumn<AdmissionRecord>[] = [
    {
      key: "ip_number",
      label: "IP NUMBER",
      className: "!whitespace-normal",
      render: (row) => (
        <button
          onClick={() => handleOpenDetails(row)}
          className="hms-id-text font-bold !text-blue-600 !text-[13px] hover:underline text-left"
        >
          {row.ip_number}
        </button>
      ),
    },
    {
      key: "patient",
      label: "PATIENT",
      className: "!whitespace-normal relative",
      render: (row) => {
        const p = row.patient_bio_data;
        const name = p
          ? [p.patient_first_name, p.patient_middle_name, p.patient_last_name].filter(Boolean).join(" ")
          : "Unknown Patient";
        const { bg: deptBg, text: deptColor } = getDepartmentColors(
          row.department_master?.department_name ?? null,
        );
        const crit = getAdmissionCriticalInfo(row.patient_id);
        return (
          <>
            <CriticalCorner reasons={crit.reasons} />
            <CriticalWrapper className="flex items-center gap-2" reasons={crit.reasons}>
              <div
                data-critical-avatar
                className="w-7 h-7 rounded-xl flex items-center justify-center hms-avatar-text shrink-0"
                style={{ backgroundColor: deptBg, color: deptColor }}
              >
                {getInitials(name)}
              </div>
              <div>
                <div className="hms-name-text capitalize">{name}</div>
                <div className="hms-id-text flex items-center">
                  {row.patient_id}
                  <CriticalDot reasons={crit.reasons} />
                </div>
              </div>
            </CriticalWrapper>
          </>
        );
      },
    },
    {
      key: "branch",
      label: "BRANCH",
      className: "!whitespace-normal",
      render: (row) => (
        <span className="hms-content-text text-[#191C1E]">
          {row.branch?.branch_name || "—"}
        </span>
      ),
    },
    {
      key: "ward_bed",
      label: "WARD & BED",
      className: "!whitespace-normal",
      render: (row) => (
        <div className="hms-content-text text-[#191C1E] leading-4">
          <div>{row.ward_master?.ward_name || "Unassigned Ward"}</div>
          <div className="text-[11px] font-medium text-[#8C8D8F] mt-1">
            {row.bed_master?.bed_number ? `Bed ${row.bed_master.bed_number}` : "Bed —"}
          </div>
        </div>
      ),
    },
    {
      key: "admission_date",
      label: "ADMITTED ON",
      className: "!whitespace-normal",
      render: (row) => {
        const dt = row.admission_date ? new Date(row.admission_date) : null;
        const valid = dt && !isNaN(dt.getTime());
        return (
          <div className="hms-content-text text-[#191C1E] leading-4">
            <div className="flex items-center gap-1.5">
              {valid ? format(dt, "MM/dd/yyyy") : "—"}
              {row.admission_type && (
                <span className="inline-block w-fit text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                  {row.admission_type}
                </span>
              )}
            </div>
            <div className="text-[11px] font-medium text-[#8C8D8F] mt-1">
              {valid ? format(dt, "hh:mm a") : ""}
            </div>
          </div>
        );
      },
    },
    {
      key: "doctor",
      label: "DOCTOR",
      className: "!whitespace-normal",
      render: (row) => {
        const d = row.employees;
        if (!d) {
          return <span className="text-gray-400 font-semibold pl-2">—</span>;
        }
        const name = `Dr. ${[d.first_name, d.middle_name, d.last_name].filter(Boolean).join(" ")}`;
        const { bg: deptBg, text: deptColor } = getDepartmentColors(
          row.department_master?.department_name ?? null,
        );
        return (
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center hms-avatar-text shrink-0"
              style={{ backgroundColor: deptBg, color: deptColor }}
            >
              {getInitials(name)}
            </div>
            <div>
              <div className="hms-name-text capitalize">{name}</div>
              <div className="hms-id-text">{d.employee_id}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: "status",
      label: "STATUS",
      className: "!whitespace-normal",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      label: "ACTIONS",
      sortable: false,
      className: "w-px !whitespace-normal !pl-3",
      headerClassName: "w-px !pl-3",
      render: (row) => (
        <AdmissionActionMenu
          status={row.status}
          onView={() => handleOpenDetails(row)}
          onEdit={() => handleEditPlanned(row)}
          onAdmit={() => handleAdmitPlanned(row)}
          onTransfer={() => handleOpenTransfer(row)}
          onDischarge={() => handleOpenDischarge(row)}
          patientId={row.patient_id}
          encounterNo={row.encounter_no}
          onVitalsSaved={fetchAdmissions}
        />
      ),
    },
  ];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (viewMenuRef.current && !viewMenuRef.current.contains(e.target as Node)) {
        setIsViewMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const viewTypeOptions: { key: "list" | "day" | "week"; label: string }[] = [
    { key: "list", label: "List View" },
    { key: "day", label: "Day View" },
    { key: "week", label: "Week View" },
  ];

  // Filters
  const {
    values: filterValues,
    appliedValues,
    isOpen: isFilterOpen,
    setIsOpen: setIsFilterOpen,
    handleChange: handleFilterChange,
    handleApply: handleApplyFilter,
    handleClear: handleClearFilter,
  } = useFilterPanel();

  const { appointmentFilterFields } = useAppointmentFilters({ appointmentRows: appointments });

  // Search & filter
  const searchableFields: (keyof Appointment)[] = [
    "id",
    "patient",
    "patientId",
    "branch",
    "date",
    "doctor",
    "doctorId",
    "visitType",
    "status",
  ];

  const filteredData = useMemo(() => {
    let result: Appointment[] = [...appointments];

    if (searchQuery) {
      result = result.filter((item) =>
        searchableFields.some((field) =>
          String(item[field] ?? "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()),
        ),
      );
    }

    result = filterDataByValues(
      result as unknown as Record<string, string | number>[],
      appliedValues,
    ) as unknown as Appointment[];

    return result;
  }, [searchQuery, appliedValues, appointments]);

  // ---- SORTING ----
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;
    const direction = sortDirection === "asc" ? 1 : -1;
    return [...filteredData].sort((a, b) => {
      if (sortField === "date") {
        return (a.sortDate - b.sortDate) * direction;
      }
      const aValue = String(a[sortField as keyof Appointment] ?? "").toLowerCase();
      const bValue = String(b[sortField as keyof Appointment] ?? "").toLowerCase();
      return aValue < bValue ? -direction : aValue > bValue ? direction : 0;
    });
  }, [filteredData, sortField, sortDirection]);

  // ---- PAGINATION ----
  const totalRecords = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / rowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentRows = sortedData.slice(startIndex, endIndex);
  const visibleStart = totalRecords === 0 ? 0 : startIndex + 1;
  const visibleEnd = Math.min(endIndex, totalRecords);

  // IPD pagination (server-side)
  const ipdVisibleStart = ipdTotal === 0 ? 0 : (ipdPage - 1) * ipdRowsPerPage + 1;
  const ipdVisibleEnd = Math.min(ipdPage * ipdRowsPerPage, ipdTotal);

  if (viewType === "day") {
    return <DayView onViewChange={setViewType} />;
  }

  if (viewType === "week") {
    return <WeekView />;
  }

  // Segmented OPD | Inpatient tab bar, shared by both tab panes.
  const tabBar = (
    <div className="inline-flex items-center gap-1 bg-[#E9EEF5] rounded-lg p-1 w-fit">
      <button
        type="button"
        onClick={() => setActiveTab("opd")}
        className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeTab === "opd" ? "bg-white text-[#00488D] shadow-sm" : "text-[#5B6570] hover:text-[#00488D]"}`}
      >
        OPD Appointments
      </button>
      <button
        type="button"
        onClick={() => setActiveTab("ipd")}
        className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeTab === "ipd" ? "bg-white text-[#00488D] shadow-sm" : "text-[#5B6570] hover:text-[#00488D]"}`}
      >
        Inpatient (IPD)
      </button>
    </div>
  );

  // ---- EXPORT ----
  const handleExport = async (exportFormat: string) => {
    if (exportFormat === "pdf") {
      downloadExportPdf({
        title: "Appointment Schedule",
        subtitle: `${sortedData.length} appointment${sortedData.length === 1 ? "" : "s"} — exported on ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
        filename: `appointments-${format(new Date(), "yyyy-MM-dd")}.pdf`,
        columns: [
          { header: "Appointment No", cell: (r: Appointment) => r.id },
          { header: "Token", cell: (r: Appointment) => r.tokenId },
          { header: "Patient", cell: (r: Appointment) => r.patient },
          { header: "Patient ID", cell: (r: Appointment) => r.patientId },
          { header: "Branch", cell: (r: Appointment) => r.branch },
          { header: "Doctor", cell: (r: Appointment) => r.doctor },
          { header: "Doctor ID", cell: (r: Appointment) => r.doctorId },
          { header: "Visit Type", cell: (r: Appointment) => r.visitType || "—" },
          { header: "Date", cell: (r: Appointment) => r.date },
          { header: "Time", cell: (r: Appointment) => r.time },
          { header: "Status", cell: (r: Appointment) => r.status },
        ],
        rows: sortedData,
      });
      toast({ title: "Export complete", description: "The PDF file has been downloaded." });
      return;
    }
    if (exportFormat !== "csv") return;
    try {
      await downloadExportCsv("appointments", {
        branchId: isAllBranches ? undefined : selectedBranchId,
      });
      toast({ title: "Export complete", description: "The CSV file has been downloaded." });
    } catch (err: any) {
      toast({
        title: "Export failed",
        description: exportErrorMessage(err),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex w-full font-[Manrope,sans-serif] bg-[#F7F9FB] min-h-screen">
      <div className="flex flex-col flex-1 min-w-0">
        <main className="flex flex-col gap-6">

          {/* ==================== HEADER ==================== */}

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">

            <div>
              <h1 className="hms-heading">
                {activeTab === "opd" ? "Appointment Schedule" : "Inpatient (IPD)"}
              </h1>

              <p className="hms-subheading mt-1">
                {activeTab === "opd"
                  ? `Total Appointments: ${appointments.length}`
                  : "Outpatient scheduling & inpatient management"}
              </p>

            </div>


            <div className="flex items-center gap-3">
              {activeTab === "opd" && can("report.export") && <ExportReport onExport={handleExport} />}

              {can("appointment.create") && (
                <button
                  onClick={() => navigate("/appointments/add")}
                  className="flex items-center gap-2 px-4 py-2 bg-[#004785] rounded-lg text-white text-xs font-semibold shadow-sm hover:bg-[#003a6b] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {activeTab === "opd" ? "Add Appointment" : "New Admission"}
                </button>
              )}
            </div>


          </div>

          {tabBar}

          {/* ==================== MAIN CARD ==================== */}

          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col transition-all duration-300 hover:shadow-md">


            {/* ==================== TOOLBAR ==================== */}

            <div className="px-5 py-4 border-b border-[#E5E7EB] flex flex-wrap items-center justify-between gap-4">

              {activeTab === "opd" ? (
                <>
                  <div className="flex flex-wrap items-center gap-3">

                    <div className="relative" ref={viewMenuRef}>

                      <button
                        type="button"
                        onClick={() => setIsViewMenuOpen((o) => !o)}
                        className="flex items-center gap-2 px-3 py-1.5 border border-[#E5E7EB] rounded-md text-xs font-semibold text-[#374151] hover:border-[#00488D] transition-colors"
                      >

                        {viewTypeOptions.find((opt) => opt.key === viewType)?.label}

                        <ChevronDown className={`w-3 h-3 text-[#6B7280] transition-transform duration-200 ${isViewMenuOpen ? "rotate-180" : ""}`} />

                      </button>

                      <div
                        className={`absolute left-0 top-full mt-1 w-32 bg-white border border-[#E5E7EB] rounded-md shadow-lg overflow-hidden z-40 transition-all duration-150 ${
                          isViewMenuOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
                        }`}
                      >
                        {viewTypeOptions.map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => {
                              setIsViewMenuOpen(false);
                              if (opt.key === "day") {
                                navigate("/appointments/day-view");
                              } else if (opt.key === "week") {
                                navigate("/appointments/week-view");
                              } else {
                                setViewType(opt.key);
                              }
                            }}
                            className={`flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-left transition-colors ${
                              viewType === opt.key ? "bg-[#D6E3FF] text-[#00488D]" : "text-[#374151] hover:bg-[#F2F4F6]"
                            }`}
                          >
                            {opt.label}
                            {viewType === opt.key && <Check className="w-3 h-3" />}
                          </button>
                        ))}
                      </div>

                    </div>

                  </div>


                  <div className="flex items-start gap-3 flex-wrap justify-start">

                    {/* Search */}

                    <div className="relative">

                      <input
                        type="text"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="pl-8 pr-3 py-1.5 bg-[#F2F4F6] text-xs text-[#6B7280] placeholder:text-[#6B7280] outline-none w-[150px] sm:w-[200px] rounded-md transition-all duration-200 focus:rounded-none focus:w-[200px] sm:focus:w-[250px]"
                      />

                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#424752]" />

                    </div>


                    {/* Date nav */}

                    <div className="flex items-center">

                      <button
                        onClick={() => setSelectedDate((prev) => subDays(prev, 1))}
                        className="flex items-center justify-center w-[25px] h-[27px] border border-[#E5E7EB] rounded-l-lg transition-colors duration-150 hover:bg-[#F2F4F6]"
                      >
                        <ChevronLeft className="w-3 h-3 text-[#424752]" />
                      </button>


                      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                        <PopoverTrigger asChild>
                          <button className="flex items-center justify-center h-[27px] w-[90px] px-2 border-t border-b border-[#E5E7EB] bg-white text-xs font-medium transition-colors duration-150 hover:bg-[#F2F4F6]">
                            {isToday(selectedDate)
                              ? "Today"
                              : isYesterday(selectedDate)
                                ? "Yesterday"
                                : isTomorrow(selectedDate)
                                  ? "Tomorrow"
                                  : format(selectedDate, "dd/MM/yyyy")}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 border-[#E5E7EB] shadow-lg">
                          <CalendarPicker
                            selected={selectedDate}
                            hideThemePicker
                            onSelect={(date) => {
                              if (date instanceof Date) {
                                setSelectedDate(date);
                                setIsCalendarOpen(false);
                              }
                            }}
                          />
                        </PopoverContent>
                      </Popover>


                      <button
                        onClick={() => setSelectedDate((prev) => addDays(prev, 1))}
                        className="flex items-center justify-center w-[25px] h-[27px] border border-[#E5E7EB] rounded-r-lg transition-colors duration-150 hover:bg-[#F2F4F6]"
                      >
                        <ChevronRight className="w-3 h-3 text-[#424752]" />
                      </button>

                    </div>


                    {/* Filters */}

                    <ToolbarFilter
                      title="Filters"
                      fields={appointmentFilterFields}
                      values={filterValues}
                      onChange={handleFilterChange}
                      onApply={() => {
                        handleApplyFilter();
                        setCurrentPage(1);
                      }}
                      onClear={() => {
                        handleClearFilter();
                        setCurrentPage(1);
                      }}
                      open={isFilterOpen}
                      onOpenChange={setIsFilterOpen}
                    />
                    <RefreshButton onClick={fetchAppointments} isLoading={isAppointmentsLoading} />
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Search */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search IP, patient, UHID..."
                      value={ipdSearch}
                      onChange={(e) => {
                        setIpdSearch(e.target.value);
                        setIpdPage(1);
                      }}
                      className="pl-8 pr-3 py-1.5 bg-[#F2F4F6] text-xs text-[#6B7280] placeholder:text-[#6B7280] outline-none w-[150px] sm:w-[220px] rounded-md transition-all duration-200 focus:rounded-none focus:w-[200px] sm:focus:w-[260px]"
                    />
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#424752]" />
                  </div>

                  {/* Date nav */}
                  <div className="flex items-center">
                    <button
                      onClick={() => {
                        setIpdSelectedDate((prev) => subDays(prev, 1));
                        setIpdPage(1);
                      }}
                      className="flex items-center justify-center w-[25px] h-[27px] border border-[#E5E7EB] rounded-l-lg transition-colors duration-150 hover:bg-[#F2F4F6]"
                    >
                      <ChevronLeft className="w-3 h-3 text-[#424752]" />
                    </button>

                    <Popover open={isIpdCalendarOpen} onOpenChange={setIsIpdCalendarOpen}>
                      <PopoverTrigger asChild>
                        <button className="flex items-center justify-center h-[27px] w-[90px] px-2 border-t border-b border-[#E5E7EB] bg-white text-xs font-medium transition-colors duration-150 hover:bg-[#F2F4F6]">
                          {isToday(ipdSelectedDate)
                            ? "Today"
                            : isYesterday(ipdSelectedDate)
                              ? "Yesterday"
                              : isTomorrow(ipdSelectedDate)
                                ? "Tomorrow"
                                : format(ipdSelectedDate, "dd/MM/yyyy")}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 border-[#E5E7EB] shadow-lg">
                        <CalendarPicker
                          selected={ipdSelectedDate}
                          hideThemePicker
                          onSelect={(date) => {
                            if (date instanceof Date) {
                              setIpdSelectedDate(date);
                              setIpdPage(1);
                              setIsIpdCalendarOpen(false);
                            }
                          }}
                        />
                      </PopoverContent>
                    </Popover>

                    <button
                      onClick={() => {
                        setIpdSelectedDate((prev) => addDays(prev, 1));
                        setIpdPage(1);
                      }}
                      className="flex items-center justify-center w-[25px] h-[27px] border border-[#E5E7EB] rounded-r-lg transition-colors duration-150 hover:bg-[#F2F4F6]"
                    >
                      <ChevronRight className="w-3 h-3 text-[#424752]" />
                    </button>
                  </div>

                  {/* Filters */}
                  <ToolbarFilter
                    title="Filters"
                    fields={ipdFilterFields}
                    values={ipdFilterValues}
                    onChange={handleIpdFilterChange}
                    onApply={() => {
                      handleApplyIpdFilter();
                      setIpdPage(1);
                    }}
                    onClear={() => {
                      handleClearIpdFilter();
                      setIpdPage(1);
                    }}
                    open={isIpdFilterOpen}
                    onOpenChange={setIsIpdFilterOpen}
                  />

                  <RefreshButton onClick={fetchAdmissions} isLoading={admissionsLoading} />
                </div>
              )}

            </div>

            {activeTab === "opd" ? (
              isAppointmentsLoading ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-[#6B7280] text-sm">
                  <Loader2 size={24} className="animate-spin text-[#00488D]" />
                  Loading appointments...
                </div>
              ) : (
                <HmsTable
                  scrollable={false}
                                columns={[
                  { key: "id", label: "AppointmentNo", className: "!whitespace-normal", render: (r: Appointment) => (
                    <span className="hms-id-text font-bold !text-blue-600 !text-[13px]">{r.id}</span>
                  )},
                  { key: "tokenId", label: "TokenId", className: "!whitespace-normal", render: (r: Appointment) => (
                    <span className="hms-id-text font-bold !text-blue-600 !text-[13px]">{r.tokenId}</span>
                  )},
                  { key: "patient", label: "Patient", className: "!whitespace-normal relative", render: (r: Appointment) => {
                    const crit = getCriticalInfo(r.patientId);
                    return (
                    <>
                      <CriticalCorner reasons={crit.reasons} />
                      <CriticalWrapper className="flex items-center gap-2" reasons={crit.reasons}>
                        <div data-critical-avatar className="w-7 h-7 rounded-xl flex items-center justify-center hms-avatar-text shrink-0" style={{ backgroundColor: r.avatarBg, color: r.avatarColor }}>{r.patientInitial}</div>
                        <div><div className="hms-name-text capitalize">{r.patient}</div><div className="hms-id-text flex items-center">{r.patientId}<CriticalDot reasons={crit.reasons} /></div></div>
                      </CriticalWrapper>
                    </>
                    );
                  }},
                  { key: "branch", label: "Branch", className: "!whitespace-normal", render: (r: Appointment) => <span className="hms-content-text text-[#191C1E]">{r.branch}</span> },
                  { key: "doctor", label: "Doctor", className: "!whitespace-normal", render: (r: Appointment) => (
                    !r.doctor || r.doctor === "—" || r.doctor === "Unassigned" ? (
                      <span className="text-gray-400 font-semibold pl-2">—</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl flex items-center justify-center hms-avatar-text shrink-0" style={{ backgroundColor: r.avatarBg, color: r.avatarColor }}>{r.doctorInitial}</div>
                        <div><div className="hms-name-text capitalize">{r.doctor}</div><div className="hms-id-text">{r.doctorId}</div></div>
                      </div>
                    )
                  )},
                  { key: "visitType", label: "Visit Type", className: "!whitespace-normal", render: (r: Appointment) => (
                    r.visitType ? (
                      <span
                        className={`inline-block w-fit text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                          r.visitType.toLowerCase().includes("chemo")
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : r.visitType.toLowerCase().includes("lab")
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        {r.visitType}
                      </span>
                    ) : (
                      <span className="text-gray-400 font-medium text-xs">—</span>
                    )
                  )},
                  { key: "date", label: "Appointment Date", className: "!whitespace-normal", render: (r: Appointment) => (
                    <div className="hms-content-text text-[#191C1E] leading-4"><div>{r.date}</div><div className="text-[11px] font-medium text-[#8C8D8F] mt-1">{formatAppointmentTimeConditional(r)}</div></div>
                  )},
                  { key: "status", label: "Status", render: (r: Appointment) => (
                    <StatusBadge status={r.status} />
                  )},
                  { key: "actions", label: "Action", sortable: false, className: "w-px !whitespace-normal !pl-3", headerClassName: "w-px !pl-3", render: (r: Appointment) => (
                    <AppointmentActionMenu
                      status={r.status}
                      appointmentDateISO={r.appointmentDateISO}
                      onView={() => navigate(`/appointments/view/${r.id}`)}
                      onEdit={() => navigate(`/appointments/edit/${r.id}`)}
                      onCancel={() => handleCancelAppointment(r)}
                      onCheckIn={() => handleCheckIn(r)}
                      onCheckOut={() => handleCheckOut(r)}
                      onVitalsSaved={fetchAppointments}
                      appointmentId={r.id}
                      patientId={r.patientId}
                    />
                  )},
                ]}
                  data={currentRows}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  currentPage={safeCurrentPage}
                  totalPages={totalPages}
                  totalRecords={totalRecords}
                  rowsPerPage={rowsPerPage}
                  visibleStart={visibleStart}
                  visibleEnd={visibleEnd}
                  onPageChange={setCurrentPage}
                  onRowsPerPageChange={(val) => { setRowsPerPage(val); setCurrentPage(1); }}
                  rowsPerPageOptions={[5, 10, 20]}
                  emptyMessage="No appointments found matching the current filters."
                  rowKey={(r: Appointment, i: number) => r.id + i}
                />
              )
            ) : (
              admissionsLoading ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-[#6B7280] text-sm">
                  <Loader2 size={24} className="animate-spin text-[#00488D]" />
                  Loading admissions...
                </div>
              ) : (
                <HmsTable
                  scrollable={false}
                  columns={ipdColumns}
                  data={admissions}
                  sortField={ipdSortField}
                  sortDirection={ipdSortDirection}
                  onSort={handleIpdSort}
                  currentPage={ipdPage}
                  totalPages={ipdTotalPages}
                  totalRecords={ipdTotal}
                  rowsPerPage={ipdRowsPerPage}
                  visibleStart={ipdVisibleStart}
                  visibleEnd={ipdVisibleEnd}
                  onPageChange={setIpdPage}
                  onRowsPerPageChange={(val) => { setIpdRowsPerPage(val); setIpdPage(1); }}
                  rowsPerPageOptions={[5, 10, 20]}
                  emptyMessage="No inpatient admissions found matching your criteria."
                  rowKey={(row: AdmissionRecord) => row.admission_id}
                />
              )
            )}
          </div>
        </main>
      </div>

      <ConfirmationDialog
        open={!!cancelTarget}
        type="danger"
        title="Cancel Appointment?"
        description={
          cancelTarget
            ? `Appointment ${cancelTarget.id} for ${cancelTarget.patient} will be cancelled. Please enter a reason for cancellation and your employee ID.`
            : ""
        }
        confirmText="Cancel Appointment"
        cancelText="Keep Appointment"
        loading={isCancelling}
        onConfirm={handleConfirmCancelAppointment}
        onCancel={() => setCancelTarget(null)}
      >
        <div className="space-y-3">
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Reason for cancellation (required)"
            rows={3}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </ConfirmationDialog>

      {/* ======================================================== */}
      {/* BED TRANSFER DIALOG                                      */}
      {/* ======================================================== */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900">
              <ArrowRightLeft className="h-5 w-5 text-blue-600" />
              Transfer Bed
            </DialogTitle>
          </DialogHeader>

          {activeAdmission && (
            <form onSubmit={handleSubmitTransfer} className="space-y-4 py-2">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1 text-slate-600">
                <div>
                  Patient:{" "}
                  <span className="font-semibold text-slate-800">
                    {[
                      activeAdmission.patient_bio_data?.patient_first_name,
                      activeAdmission.patient_bio_data?.patient_last_name,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </span>
                </div>
                <div>
                  Current Ward:{" "}
                  <span className="font-semibold text-slate-800">
                    {activeAdmission.ward_master?.ward_name || "None"}
                  </span>{" "}
                  • Current Bed:{" "}
                  <span className="font-semibold text-slate-800">
                    {activeAdmission.bed_master?.bed_number || "None"}
                  </span>
                </div>
              </div>

              {/* Target Ward */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Target Ward *</Label>
                <Select value={transferData.targetWardId} onValueChange={handleTransferWardChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Target Ward" />
                  </SelectTrigger>
                  <SelectContent>
                    {wards.map((w) => (
                      <SelectItem key={w.ward_id} value={w.ward_id}>
                        {w.ward_name} ({w.ward_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Target Bed */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Target Available Bed *</Label>
                <Select
                  value={transferData.targetBedId}
                  onValueChange={(val) => setTransferData((prev) => ({ ...prev, targetBedId: val }))}
                  disabled={!transferData.targetWardId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={transferData.targetWardId ? "Select Bed" : "Select Ward first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBedsForTransfer.length === 0 ? (
                      <SelectItem value="__NO_BED__" disabled>
                        No available beds in this ward
                      </SelectItem>
                    ) : (
                      availableBedsForTransfer.map((b) => (
                        <SelectItem key={b.bed_id} value={b.bed_id}>
                          Bed {b.bed_number} ({b.bed_type})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Transfer Reason */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Reason for Transfer</Label>
                <Input
                  placeholder="e.g. ICU stepdown, patient request, doctor recommendation"
                  value={transferData.reason || ""}
                  onChange={(e) => setTransferData((prev) => ({ ...prev, reason: e.target.value }))}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTransferOpen(false)}
                  disabled={submittingTransfer}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={submittingTransfer}
                >
                  {submittingTransfer ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Transferring...
                    </>
                  ) : (
                    "Confirm Transfer"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* DISCHARGE DIALOG                                         */}
      {/* ======================================================== */}
      <Dialog open={dischargeOpen} onOpenChange={setDischargeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900">
              <LogOut className="h-5 w-5 text-amber-600" />
              Discharge Inpatient
            </DialogTitle>
          </DialogHeader>

          {activeAdmission && (
            <form onSubmit={handleSubmitDischarge} className="space-y-4 py-2">
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs space-y-1 text-amber-800">
                <div>
                  Patient:{" "}
                  <span className="font-semibold">
                    {[
                      activeAdmission.patient_bio_data?.patient_first_name,
                      activeAdmission.patient_bio_data?.patient_last_name,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </span>
                </div>
                <div>
                  Bed Allocated:{" "}
                  <span className="font-semibold">{activeAdmission.bed_master?.bed_number || "None"}</span>{" "}
                  (will be released to <span className="underline">AVAILABLE</span>)
                </div>
              </div>

              {/* Discharge Type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Discharge Type *</Label>
                <Select
                  value={dischargeData.discharge_type}
                  onValueChange={(val) => setDischargeData((prev) => ({ ...prev, discharge_type: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RECOVERED">Recovered / Normal Discharge</SelectItem>
                    <SelectItem value="DAYCARE_RELEASED">Daycare Released</SelectItem>
                    <SelectItem value="AGAINST_MEDICAL_ADVICE">Against Medical Advice (AMA)</SelectItem>
                    <SelectItem value="REFERRED_OUT">Referred Out to Other Facility</SelectItem>
                    <SelectItem value="DECEASED">Deceased</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Discharge Summary */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Discharge Summary / Notes</Label>
                <Textarea
                  rows={3}
                  placeholder="Clinical discharge summary, post-discharge medication or follow-up instructions..."
                  value={dischargeData.discharge_summary || ""}
                  onChange={(e) =>
                    setDischargeData((prev) => ({ ...prev, discharge_summary: e.target.value }))
                  }
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDischargeOpen(false)}
                  disabled={submittingDischarge}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  disabled={submittingDischarge}
                >
                  {submittingDischarge ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Discharging...
                    </>
                  ) : (
                    "Confirm Discharge"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>

  );
};

export default AppointmentSchedule;