import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  X,
  UserRound,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FormDropdown } from "@/components/ui/form-dropdown";
import TimepickerWheel from "@/components/ui/timepicker-wheel";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { StatusBadge } from "@/components/hms/StatusBadge";
import {
  employeeApi,
  EmployeeDetailResponse,
  EmployeeRecord,
  DoctorScheduleRecord,
} from "@/api/employee.api";
import { branchApi, Branch } from "@/api/branch.api";
import { departmentApi, Department } from "@/api/department.api";
import {
  doctorTransferApi,
  InitiateTransferPayload,
  InitiateTransferResult,
  ConfirmTransferPayload,
  ConfirmTransferResult,
} from "@/api/doctorTransfer.api";
import { getUser } from "@/utils/token";

const TRANSFER_ADMIN_ROLES = ["HEAD_ADMIN", "SUPER_ADMIN", "BRANCH_ADMIN"];

const DAYS_OF_WEEK: { value: string; label: string }[] = [
  { value: "MONDAY", label: "Monday" },
  { value: "TUESDAY", label: "Tuesday" },
  { value: "WEDNESDAY", label: "Wednesday" },
  { value: "THURSDAY", label: "Thursday" },
  { value: "FRIDAY", label: "Friday" },
  { value: "SATURDAY", label: "Saturday" },
  { value: "SUNDAY", label: "Sunday" },
];

const NOTIFY_CHANNELS = ["SMS", "EMAIL", "WHATSAPP"];

interface ScheduleEntry {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  branch_id: string;
}

function toTimeInputValue(time: string | null | undefined): string {
  if (!time) return "";
  const d = new Date(time);
  if (isNaN(d.getTime())) return "";
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function todayISODate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const labelCls = "text-[10.5px] font-bold text-blue-600 uppercase tracking-[0.04em] mb-1.5 block";
const inputCls =
  "w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#191C1E] focus:outline-none focus:ring-2 focus:ring-[#00488D]/30";

export default function TransferDoctor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [roleOk, setRoleOk] = useState(false);
  const [loading, setLoading] = useState(true);

  const [employee, setEmployee] = useState<EmployeeDetailResponse | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [openDoctors, setOpenDoctors] = useState<EmployeeRecord[]>([]);

  const [newBranchId, setNewBranchId] = useState("");
  const [newDepartmentId, setNewDepartmentId] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(todayISODate());
  const [transferReason, setTransferReason] = useState("");
  const [consultationMinutes, setConsultationMinutes] = useState("20");
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [initiate, setInitiate] = useState<InitiateTransferResult | null>(null);

  // Confirm-action state (step 2)
  const [replacementEmployeeId, setReplacementEmployeeId] = useState("");
  const [replacementBranchId, setReplacementBranchId] = useState("");
  const [notifyChannels, setNotifyChannels] = useState<string[]>([]);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [priority, setPriority] = useState("NORMAL");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmResult, setConfirmResult] = useState<ConfirmTransferResult | null>(null);

  const [replacementOpen, setReplacementOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  useEffect(() => {
    const user = getUser();
    const role = (user?.role_type || user?.role || "").toUpperCase();
    setRoleOk(TRANSFER_ADMIN_ROLES.includes(role));
  }, []);

  useEffect(() => {
    if (!roleOk) return;

    const initial = async () => {
      try {
        const [empRes, branchRes, deptRes, docRes] = await Promise.all([
          employeeApi.getOne(id!),
          branchApi.getAll(),
          departmentApi.getAll(),
          employeeApi.getAll({ roleType: "DOCTOR", limit: 1000 }),
        ]);
        const detail = empRes.data?.data;
        setEmployee(detail);
        setBranches(branchRes.data?.data || branchRes.data?.branches || []);
        setDepartments(deptRes.data?.data || []);
        setOpenDoctors(docRes.data?.data?.employees || []);
        if (detail) {
          setNewDepartmentId(detail.employee.department_id || "");
          if (detail.doctorProfile?.consultation_minutes) {
            setConsultationMinutes(String(detail.doctorProfile.consultation_minutes));
          }
          const entries = (detail.doctorSchedules || [])
            .filter((s) => s.is_active !== false)
            .map((s: DoctorScheduleRecord, i: number) => ({
              id: `seed-${i}`,
              day_of_week: s.day_of_week || "MONDAY",
              start_time: toTimeInputValue(s.start_time),
              end_time: toTimeInputValue(s.end_time),
              branch_id: s.branch_id || "",
            }));
          setSchedule(entries);
        }
      } catch (err) {
        console.error("[Transfer] Init error", err);
        toast({
          title: "Failed to load doctor",
          description: "Couldn't fetch doctor details for the transfer.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    initial();
  }, [roleOk, id]);

  const doctorSummary = useMemo(() => {
    if (!employee) return null;
    const emp = employee.employee;
    return {
      name: [emp.first_name, emp.middle_name, emp.last_name].filter(Boolean).join(" "),
      designation: emp.designation || "Doctor",
      specialization: emp.specialization || "General",
      active: emp.emp_status === true,
    };
  }, [employee]);

  const addScheduleRow = () => {
    setSchedule((p) => [
      ...p,
      {
        id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        day_of_week: "MONDAY",
        start_time: "",
        end_time: "",
        branch_id: newBranchId,
      },
    ]);
  };

  const updateScheduleRow = (rowId: string, field: keyof ScheduleEntry, value: string) => {
    setSchedule((p) => p.map((s) => (s.id === rowId ? { ...s, [field]: value } : s)));
  };

  const removeScheduleRow = (rowId: string) => {
    setSchedule((p) => p.filter((s) => s.id !== rowId));
  };

  const handleInitiate = async () => {
    if (!id) return;
    if (!newBranchId) {
      toast({ title: "New branch is required", variant: "destructive" });
      return;
    }
    if (!effectiveDate) {
      toast({ title: "Effective date is required", variant: "destructive" });
      return;
    }
    if (!transferReason.trim()) {
      toast({ title: "Transfer reason is required", variant: "destructive" });
      return;
    }
    if (schedule.length === 0) {
      toast({ title: "Add at least one working hour", variant: "destructive" });
      return;
    }
    for (const row of schedule) {
      if (!row.branch_id) {
        toast({ title: "Pick a branch for each working hour row", variant: "destructive" });
        return;
      }
      if (row.branch_id !== newBranchId) {
        toast({ title: "Working hours must belong to the selected new branch", variant: "destructive" });
        return;
      }
      if (!row.start_time || !row.end_time) {
        toast({ title: "Every row needs both a start and end time", variant: "destructive" });
        return;
      }
      if (row.start_time >= row.end_time) {
        toast({ title: "Start time must be before end time", variant: "destructive" });
        return;
      }
    }

    const payload: InitiateTransferPayload = {
      new_branch_id: newBranchId,
      new_department_id: newDepartmentId || undefined,
      effective_date: effectiveDate,
      transfer_reason: transferReason.trim(),
      working_hours: schedule.map((s) => ({
        branch_id: s.branch_id,
        day_of_week: s.day_of_week as InitiateTransferPayload["working_hours"][number]["day_of_week"],
        shift_name: Number(s.start_time.split(":")[0]) < 12 ? "Morning" : "Evening",
        start_time: s.start_time,
        end_time: s.end_time,
      })),
      consultation_minutes: Number(consultationMinutes) || 20,
    };

    setSubmitting(true);
    try {
      const res = await doctorTransferApi.initiateTransfer(id, payload);
      setInitiate(res.data.data);
      toast({
        title: res.data.data.status === "COMPLETED" ? "Transfer completed" : "Transfer request created",
        description: res.data.message,
      });
    } catch (err: any) {
      toast({
        title: "Failed to initiate transfer",
        description: err?.response?.data?.message || err?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const replacementOptions = useMemo(() => {
    const dept = employee?.employee.department_id;
    return openDoctors
      .filter(
        (d) =>
          d.employee_id !== id &&
          d.emp_status !== false &&
          (dept ? d.department_id === dept : true),
      )
      .map((d) => ({
        label: `Dr. ${[d.first_name, d.middle_name, d.last_name].filter(Boolean).join(" ")}`,
        value: d.employee_id,
      }));
  }, [openDoctors, employee, id]);

  const doConfirm = async (confirmPayload: ConfirmTransferPayload) => {
    if (!id) return;
    setConfirming(true);
    try {
      const res = await doctorTransferApi.confirmTransfer(id, confirmPayload);
      setConfirmResult(res.data.data);
      toast({ title: "Transfer action completed", description: res.data.message });
    } catch (err: any) {
      toast({
        title: "Failed to process transfer action",
        description: err?.response?.data?.message || err?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-[#00488D]" />
      </div>
    );
  }

  if (!roleOk) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center">
        <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-[#191C1E]">Access restricted</h2>
        <p className="text-sm text-[#64748B] mt-1">
          Only Super Admin, Head Admin and Branch Admin can transfer doctors.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-[#E6E8EA] transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4 text-[#475569]" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-[#191C1E]">Transfer Doctor</h1>
          <p className="text-xs text-[#64748B]">
            Reassign, reschedule or cancel future appointments
          </p>
        </div>
        {initiate && (
          <StatusBadge
            tone={initiate.status === "COMPLETED" ? "green" : "amber"}
            status={initiate.status === "COMPLETED" ? "Completed" : "Pending Confirmation"}
          />
        )}
      </div>

      {/* Doctor summary */}
      {doctorSummary && (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 mb-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#D6E3FF] flex items-center justify-center font-bold text-[#00488D]">
            {doctorSummary.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm text-[#191C1E]">
              Dr. {doctorSummary.name}
            </div>
            <div className="text-xs text-[#64748B] mt-0.5">
              {doctorSummary.designation} · {doctorSummary.specialization}
            </div>
          </div>
          <StatusBadge status={doctorSummary.active ? "active" : "inactive"} />
        </div>
      )}

      {confirmResult ? (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <h2 className="font-bold text-[#191C1E]">Transfer processed</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
            <SummaryStat label="Total affected" value={confirmResult.summary.total} />
            <SummaryStat label="Transferred" value={confirmResult.summary.successful} />
            <SummaryStat label="Queued" value={confirmResult.summary.queued} />
            <SummaryStat label="Conflicts" value={confirmResult.summary.conflicts} />
            <SummaryStat label="Cancelled" value={confirmResult.summary.cancelled} />
          </div>
          {confirmResult.conflicts.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-bold text-[#7B3200] uppercase tracking-wide mb-2">
                Conflicts needing review
              </h3>
              <ul className="text-xs text-[#64748B] space-y-1 list-disc list-inside">
                {confirmResult.conflicts.map((c) => (
                  <li key={c.appointment_id}>
                    {c.appointment_id} — {c.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button
            onClick={() => {
              setConfirmResult(null);
              setInitiate(null);
            }}
            className="px-4 py-2 rounded-lg bg-[#00488D] text-white text-xs font-semibold hover:bg-[#003A70]"
          >
            Start another transfer
          </button>
        </div>
      ) : !initiate ? (
        /* ── STEP 1: initiate form ── */
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 space-y-5">
          <h2 className="font-bold text-sm text-[#191C1E]">1. Transfer details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>New branch</label>
              <FormDropdown
                name="new_branch"
                className={inputCls}
                options={branches.map((b) => ({
                  label: `${b.branch_id}${b.branch_name ? ` - ${b.branch_name}` : ""}`,
                  value: b.branch_id,
                }))}
                value={newBranchId}
                onValueChange={(v) => {
                  setNewBranchId(v);
                  setSchedule((p) => p.map((s) => ({ ...s, branch_id: v })));
                }}
                placeholder="Select branch"
              />
            </div>
            <div>
              <label className={labelCls}>Department</label>
              <FormDropdown
                name="new_dept"
                className={inputCls}
                options={departments.map((d) => ({
                  label: d.department_name,
                  value: d.department_id,
                }))}
                value={newDepartmentId}
                onValueChange={setNewDepartmentId}
                placeholder="Select department"
              />
            </div>
            <div>
              <label className={labelCls}>Effective date</label>
              <input
                type="date"
                min={todayISODate()}
                className={inputCls}
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Consultation minutes</label>
              <input
                type="number"
                min={1}
                className={inputCls}
                value={consultationMinutes}
                onChange={(e) => setConsultationMinutes(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Transfer reason</label>
              <textarea
                rows={2}
                className={inputCls}
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                placeholder="Why is this doctor being transferred?"
              />
            </div>
          </div>

          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[12px] font-bold text-[#00488D] uppercase tracking-wide">
                New branch working hours
              </label>
              <button
                type="button"
                onClick={addScheduleRow}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#00488D] bg-[#D6E3FF] hover:bg-[#C3D6FF] px-3 py-1.5 rounded-lg transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Add slot
              </button>
            </div>
            {schedule.length === 0 && (
              <p className="text-[13px] text-gray-400 mb-2">
                No working hours added yet — add at least one slot.
              </p>
            )}
            <div className="space-y-2.5">
              {schedule.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-end gap-3 bg-[#F8FAFC] border border-gray-200 border-l-[4px] border-l-blue-600 rounded-r-[10px] px-4 py-3"
                >
                  <div>
                    <label className={labelCls}>Day</label>
                    <FormDropdown
                      name={`day-${row.id}`}
                      className={inputCls + " !h-9 !w-[150px]"}
                      options={DAYS_OF_WEEK}
                      value={row.day_of_week}
                      onValueChange={(v) => updateScheduleRow(row.id, "day_of_week", v)}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Start</label>
                    <TimepickerWheel
                      value={row.start_time}
                      onChange={(v) => updateScheduleRow(row.id, "start_time", v)}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>End</label>
                    <TimepickerWheel
                      value={row.end_time}
                      onChange={(v) => updateScheduleRow(row.id, "end_time", v)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeScheduleRow(row.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-[6px] border border-red-300 bg-red-50 text-red-600 hover:bg-red-100 ml-1"
                    aria-label="Remove slot"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-[#475569]"
            >
              Cancel
            </button>
            <button
              onClick={handleInitiate}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#00488D] text-white text-xs font-semibold hover:bg-[#003A70] disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Preview affected appointments
            </button>
          </div>
        </div>
      ) : (
        /* ── STEP 2: affected appointments + action ── */
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-sm text-[#191C1E]">
                {initiate.affected_appointment_count} future appointment(s) affected
              </h2>
            </div>
            <p className="text-xs text-[#64748B]">{initiate.message}</p>
          </div>

          {initiate.appointments && initiate.appointments.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#EEF1F4] text-xs font-bold text-gray-600 uppercase tracking-wide">
                Appointments affected
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-[#F1F5F9]">
                {initiate.appointments.map((a) => (
                  <div key={a.appointment_id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-[#E6E8EA] flex items-center justify-center">
                      <UserRound className="w-4 h-4 text-[#475569]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#191C1E] truncate">
                        {a.patient_name || a.patient_id}
                      </div>
                      <div className="text-xs text-[#64748B]">
                        {a.appointment_date} · {a.appointment_time} · Branch {a.branch_id}
                      </div>
                    </div>
                    {a.eligible_replacement_doctors && a.eligible_replacement_doctors.length > 0 && (
                      <span className="text-[10px] font-semibold text-[#00488D] bg-[#D6E3FF] px-2 py-1 rounded-full whitespace-nowrap">
                        {a.eligible_replacement_doctors.length} replacement available
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ActionCard
              title="Transfer to replacement"
              description="Reassign every appointment to another doctor of the same department with a slot for the same day."
              tone="blue"
              onClick={() => setReplacementOpen(true)}
            />
            <ActionCard
              title="Reschedule required"
              description="Flag appointments as Reschedule Required — they'll be reassigned later via the Edit Appointment form."
              tone="amber"
              onClick={() => setRescheduleOpen(true)}
            />
            <ActionCard
              title="Cancel appointments"
              description="Bulk-cancel the affected appointments and optionally notify patients."
              tone="red"
              onClick={() => setCancelOpen(true)}
            />
          </div>
        </div>
      )}

      {/* Replacement doctor dialog */}
      <ConfirmationDialog
        open={replacementOpen}
        type="info"
        title="Transfer to a replacement doctor"
        description="Pick a doctor from the same department. Each appointment is only reassigned where the replacement has a matching slot for the same day."
        confirmText="Transfer appointments"
        loading={confirming}
        onConfirm={() => {
          if (!replacementEmployeeId) {
            toast({ title: "Choose a replacement doctor", variant: "destructive" });
            return;
          }
          setReplacementOpen(false);
          doConfirm({
            transfer_id: initiate!.transfer_id,
            action: "TRANSFER",
            replacement_employee_id: replacementEmployeeId,
            replacement_branch_id: replacementBranchId || undefined,
          });
        }}
        onCancel={() => setReplacementOpen(false)}
      >
        <div className="w-full space-y-3 text-left">
          <div>
            <label className={labelCls}>Replacement doctor</label>
            <FormDropdown
              name="replacement"
              className={inputCls}
              options={replacementOptions}
              value={replacementEmployeeId}
              onValueChange={setReplacementEmployeeId}
              placeholder="Select doctor"
            />
          </div>
          <div>
            <label className={labelCls}>Replace at branch (optional)</label>
            <FormDropdown
              name="replacement_branch"
              className={inputCls}
              options={branches.map((b) => ({
                label: `${b.branch_id}${b.branch_name ? ` - ${b.branch_name}` : ""}`,
                value: b.branch_id,
              }))}
              value={replacementBranchId}
              onValueChange={setReplacementBranchId}
              placeholder="Use appointment's own branch"
            />
          </div>
        </div>
      </ConfirmationDialog>

      {/* Reschedule dialog */}
      <ConfirmationDialog
        open={rescheduleOpen}
        type="warning"
        title="Flag appointments as Reschedule Required"
        description="The affected appointments will be unlinked from the doctor and queued for reassignment. You will pick a doctor later in the Edit Appointment form."
        confirmText="Queue for reschedule"
        loading={confirming}
        onConfirm={() => {
          setRescheduleOpen(false);
          doConfirm({
            transfer_id: initiate!.transfer_id,
            action: "RESCHEDULE",
            priority,
            reason: rescheduleReason.trim() || transferReason,
          });
        }}
        onCancel={() => setRescheduleOpen(false)}
      >
        <div className="w-full space-y-3 text-left">
          <div>
            <label className={labelCls}>Priority</label>
            <FormDropdown
              name="priority"
              className={inputCls}
              options={[
                { label: "Normal", value: "NORMAL" },
                { label: "High", value: "HIGH" },
                { label: "Urgent", value: "URGENT" },
              ]}
              value={priority}
              onValueChange={setPriority}
            />
          </div>
          <div>
            <label className={labelCls}>Reason (optional)</label>
            <textarea
              rows={2}
              className={inputCls}
              value={rescheduleReason}
              onChange={(e) => setRescheduleReason(e.target.value)}
            />
          </div>
        </div>
      </ConfirmationDialog>

      {/* Cancel dialog */}
      <ConfirmationDialog
        open={cancelOpen}
        type="danger"
        title="Cancel all affected appointments?"
        description="This will mark every affected future appointment as cancelled. Patients can be notified via the channels below."
        confirmText="Cancel appointments"
        loading={confirming}
        onConfirm={() => {
          if (!cancelConfirm) {
            toast({ title: "Please confirm to proceed", variant: "destructive" });
            return;
          }
          setCancelOpen(false);
          doConfirm({
            transfer_id: initiate!.transfer_id,
            action: "CANCEL",
            confirm: true,
            notify_channels: notifyChannels,
          });
        }}
        onCancel={() => setCancelOpen(false)}
      >
        <div className="w-full space-y-3 text-left">
          <label className="flex items-center gap-2 text-sm font-medium text-[#191C1E]">
            <input
              type="checkbox"
              checked={cancelConfirm}
              onChange={(e) => setCancelConfirm(e.target.checked)}
              className="accent-[#00488D]"
            />
            I understand this is permanent
          </label>
          <div>
            <label className={labelCls}>Notify patients via (optional)</label>
            <div className="flex flex-wrap gap-2">
              {NOTIFY_CHANNELS.map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() =>
                    setNotifyChannels((p) =>
                      p.includes(ch) ? p.filter((x) => x !== ch) : [...p, ch],
                    )
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    notifyChannels.includes(ch)
                      ? "bg-[#00488D] text-white border-[#00488D]"
                      : "bg-white text-[#475569] border-[#E5E7EB]"
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>
        </div>
      </ConfirmationDialog>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-[#F8FAFC] rounded-lg p-3">
      <div className="text-xl font-black text-[#191C1E]">{String(value)}</div>
      <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}

function ActionCard({
  title,
  description,
  tone,
  onClick,
}: {
  title: string;
  description: string;
  tone: "blue" | "amber" | "red";
  onClick: () => void;
}) {
  const toneClasses = {
    blue: "border-blue-200 hover:border-blue-400 bg-blue-50",
    amber: "border-amber-200 hover:border-amber-400 bg-amber-50",
    red: "border-red-200 hover:border-red-400 bg-red-50",
  };
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-xl border p-4 transition-colors ${toneClasses[tone]}`}
    >
      <div className="font-bold text-sm mb-1 text-[#191C1E]">{title}</div>
      <p className="text-xs text-[#64748B] leading-relaxed">{description}</p>
    </button>
  );
}
