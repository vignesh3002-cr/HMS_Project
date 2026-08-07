import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  UserRound,
  CheckCircle2,
  CalendarClock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FormDropdown } from "@/components/ui/form-dropdown";
import TimepickerWheel from "@/components/ui/timepicker-wheel";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { StatusBadge } from "@/components/hms/StatusBadge";
import {
  doctorTransferApi,
  RescheduleQueueEntry,
} from "@/api/doctorTransfer.api";
import { branchApi, Branch } from "@/api/branch.api";
import { employeeApi, EmployeeRecord } from "@/api/employee.api";
import { getUser } from "@/utils/token";

const TRANSFER_ADMIN_ROLES = ["HEAD_ADMIN", "SUPER_ADMIN", "BRANCH_ADMIN"];

const STATUS_FILTERS = [
  { label: "All statuses", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Assigned", value: "ASSIGNED" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Cancelled", value: "CANCELLED" },
];

const QUEUE_TONE: Record<string, "amber" | "blue" | "green" | "red"> = {
  PENDING: "amber",
  ASSIGNED: "blue",
  CONFIRMED: "green",
  CANCELLED: "red",
};

const PRIORITY_TONE: Record<string, "slate" | "amber" | "red"> = {
  NORMAL: "slate",
  HIGH: "amber",
  URGENT: "red",
};

const PAGE_SIZE = 10;

const labelCls = "text-[10.5px] font-bold text-blue-600 uppercase tracking-[0.04em] mb-1.5 block";
const inputCls =
  "w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#191C1E] focus:outline-none focus:ring-2 focus:ring-[#00488D]/30";

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${String(d.getUTCDate()).padStart(2, "0")} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function formatTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

function toDateInputValue(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}

function todayISODate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

export default function RescheduleQueue() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [roleOk, setRoleOk] = useState(false);
  const [loading, setLoading] = useState(true);

  const [entries, setEntries] = useState<RescheduleQueueEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  const [statusFilter, setStatusFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [search, setSearch] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [doctors, setDoctors] = useState<EmployeeRecord[]>([]);

  // Action dialogs
  const [assignTarget, setAssignTarget] = useState<RescheduleQueueEntry | null>(null);
  const [assignDoctorId, setAssignDoctorId] = useState("");
  const [assignDate, setAssignDate] = useState("");
  const [assignTime, setAssignTime] = useState("");
  const [assignReason, setAssignReason] = useState("");

  const [confirmTarget, setConfirmTarget] = useState<RescheduleQueueEntry | null>(null);
  const [confirmReason, setConfirmReason] = useState("");

  const [cancelTarget, setCancelTarget] = useState<RescheduleQueueEntry | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const user = getUser();
    const role = (user?.role_type || user?.role || "").toUpperCase();
    setRoleOk(TRANSFER_ADMIN_ROLES.includes(role));
  }, []);

  useEffect(() => {
    if (!roleOk) return;
    const initial = async () => {
      try {
        const [branchRes, docRes] = await Promise.all([
          branchApi.getAll(),
          employeeApi.getAll({ roleType: "DOCTOR", limit: 500 }),
        ]);
        setBranches(branchRes.data?.data || branchRes.data?.branches || []);
        setDoctors(docRes.data?.data?.employees || []);
      } catch (err) {
        console.error("[RescheduleQueue] Init error", err);
      }
    };
    initial();
  }, [roleOk]);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await doctorTransferApi.getRescheduleQueue({
        status: statusFilter || undefined,
        branchId: branchFilter || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setEntries(res.data.data.entries || []);
      setTotal(res.data.data.total ?? 0);
      setTotalPages(res.data.data.totalPages ?? 1);
    } catch (err: any) {
      toast({
        title: "Failed to load reschedule queue",
        description: err?.response?.data?.message || err?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, branchFilter, page, toast]);

  useEffect(() => {
    if (roleOk) fetchQueue();
  }, [roleOk, fetchQueue]);

  const doctorNameById = useCallback(
    (id?: string | null) => {
      if (!id) return null;
      const doc = doctors.find((d) => d.employee_id === id);
      if (!doc) return id;
      return `Dr. ${[doc.first_name, doc.middle_name, doc.last_name].filter(Boolean).join(" ")}`;
    },
    [doctors],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => {
      const name = [e.patient_bio_data?.patient_first_name, e.patient_bio_data?.patient_last_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const mobile = e.patient_bio_data?.patient_primary_mobile?.toLowerCase() || "";
      const pid = e.patient_id.toLowerCase();
      return name.includes(q) || mobile.includes(q) || pid.includes(q);
    });
  }, [entries, search]);

  const openAssign = (entry: RescheduleQueueEntry) => {
    setAssignDoctorId("");
    setAssignDate(entry.old_appointment_date ? toDateInputValue(entry.old_appointment_date) : todayISODate());
    setAssignTime(entry.old_appointment_time ? formatTime(entry.old_appointment_time) : "");
    setAssignReason("");
    setAssignTarget(entry);
  };

  const doAssign = async () => {
    if (!assignTarget) return;
    if (!assignDoctorId) {
      toast({ title: "Choose a doctor", variant: "destructive" });
      return;
    }
    if (!assignDate) {
      toast({ title: "Pick an appointment date", variant: "destructive" });
      return;
    }
    if (!assignTime) {
      toast({ title: "Pick an appointment time", variant: "destructive" });
      return;
    }
    setProcessing(true);
    try {
      const res = await doctorTransferApi.processRescheduleAction(assignTarget.appointment_id, {
        action: "ASSIGN",
        employee_id: assignDoctorId,
        branch_id: assignTarget.branch_id,
        appointment_date: assignDate,
        appointment_time: assignTime,
        reason: assignReason.trim() || undefined,
      });
      toast({ title: "Slot assigned", description: res.data.message });
      setAssignTarget(null);
      fetchQueue();
    } catch (err: any) {
      toast({
        title: "Failed to assign slot",
        description: err?.response?.data?.message || err?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const doConfirm = async () => {
    if (!confirmTarget) return;
    setProcessing(true);
    try {
      const res = await doctorTransferApi.processRescheduleAction(confirmTarget.appointment_id, {
        action: "CONFIRM",
        reason: confirmReason.trim() || undefined,
      });
      toast({ title: "Reschedule confirmed", description: res.data.message });
      setConfirmTarget(null);
      fetchQueue();
    } catch (err: any) {
      toast({
        title: "Failed to confirm reschedule",
        description: err?.response?.data?.message || err?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const doCancel = async () => {
    if (!cancelTarget) return;
    setProcessing(true);
    try {
      const res = await doctorTransferApi.processRescheduleAction(cancelTarget.appointment_id, {
        action: "CANCEL",
        reason: cancelReason.trim() || undefined,
      });
      toast({ title: "Request cancelled", description: res.data.message });
      setCancelTarget(null);
      fetchQueue();
    } catch (err: any) {
      toast({
        title: "Failed to cancel request",
        description: err?.response?.data?.message || err?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (!roleOk) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center">
        <h2 className="text-lg font-bold text-[#191C1E]">Access restricted</h2>
        <p className="text-sm text-[#64748B] mt-1">
          Only Super Admin, Head Admin and Branch Admin can manage the reschedule queue.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-[#E6E8EA] transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4 text-[#475569]" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-[#191C1E]">Reschedule queue</h1>
          <p className="text-xs text-[#64748B]">
            Appointments flagged Reschedule Required when a doctor left or was transferred
          </p>
        </div>
        <button
          onClick={fetchQueue}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-[#475569] hover:bg-[#F2F4F6]"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 mb-4 flex flex-wrap items-end gap-3">
        <div className="w-44">
          <label className={labelCls}>Status</label>
          <FormDropdown
            name="queue_status"
            className={inputCls}
            options={STATUS_FILTERS}
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
            placeholder="All statuses"
          />
        </div>
        <div className="w-56">
          <label className={labelCls}>Branch</label>
          <FormDropdown
            name="queue_branch"
            className={inputCls}
            options={branches.map((b) => ({
              label: `${b.branch_id}${b.branch_name ? ` - ${b.branch_name}` : ""}`,
              value: b.branch_id,
            }))}
            value={branchFilter}
            onValueChange={(v) => {
              setBranchFilter(v);
              setPage(1);
            }}
            placeholder="All branches"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className={labelCls}>Search patient</label>
          <input
            type="text"
            className={inputCls}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, mobile or patient ID"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#EEF1F4] flex items-center justify-between">
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
            Queue ({total} total)
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#00488D]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <CalendarClock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-[#64748B]">No queue entries match the current filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F1F5F9]">
            {filtered.map((entry) => {
              const patient = entry.patient_bio_data;
              const name = [patient?.patient_first_name, patient?.patient_last_name]
                .filter(Boolean)
                .join(" ");
              return (
                <div key={entry.queue_id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-[#E6E8EA] flex items-center justify-center shrink-0">
                    <UserRound className="w-4 h-4 text-[#475569]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#191C1E] truncate">
                        {name || entry.patient_id}
                      </span>
                      <span className="text-[11px] text-[#94A3B8] font-mono">{entry.patient_id}</span>
                    </div>
                    <div className="text-xs text-[#64748B] mt-0.5">
                      {formatDate(entry.old_appointment_date)} · {formatTime(entry.old_appointment_time)}
                      {entry.branch?.branch_name ? ` · ${entry.branch.branch_name}` : ` · ${entry.branch_id}`}
                    </div>
                    {entry.transfer_id && (
                      <div className="text-[11px] text-[#94A3B8] mt-0.5">Transfer {entry.transfer_id}</div>
                    )}
                    {entry.status === "ASSIGNED" && (
                      <div className="text-[11px] text-[#00488D] mt-0.5">
                        Assigned: {doctorNameById(entry.assigned_employee_id)} ·{" "}
                        {formatDate(entry.assigned_date)} {formatTime(entry.assigned_time)}
                      </div>
                    )}
                  </div>
                  <div className="hidden sm:flex flex-col items-end gap-1">
                    <StatusBadge tone={PRIORITY_TONE[entry.priority] || "slate"} status={entry.priority.toLowerCase()} />
                  </div>
                  <StatusBadge tone={QUEUE_TONE[entry.status] || "slate"} status={entry.status.toLowerCase()} />
                  <div className="flex items-center gap-1.5 shrink-0">
                    {entry.status === "PENDING" && (
                      <button
                        onClick={() => openAssign(entry)}
                        className="px-3 py-1.5 rounded-lg bg-[#00488D] text-white text-xs font-semibold hover:bg-[#003A70]"
                      >
                        Assign slot
                      </button>
                    )}
                    {entry.status === "ASSIGNED" && (
                      <button
                        onClick={() => {
                          setConfirmReason("");
                          setConfirmTarget(entry);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700"
                      >
                        Confirm
                      </button>
                    )}
                    {(entry.status === "PENDING" || entry.status === "ASSIGNED") && (
                      <button
                        onClick={() => {
                          setCancelReason("");
                          setCancelTarget(entry);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50"
                      >
                        Cancel
                      </button>
                    )}
                    {entry.status === "CONFIRMED" && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
                        <CheckCircle2 className="w-4 h-4" /> Rescheduled
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#EEF1F4]">
            <span className="text-xs text-[#64748B]">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-[#475569] disabled:opacity-40 hover:bg-[#F2F4F6]"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-[#475569] disabled:opacity-40 hover:bg-[#F2F4F6]"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Assign slot dialog */}
      <ConfirmationDialog
        open={!!assignTarget}
        type="info"
        title="Assign a new slot"
        description="Pick a doctor and a slot. The doctor must be assigned to the appointment's branch and have working hours covering the chosen time."
        confirmText="Assign slot"
        loading={processing}
        onConfirm={doAssign}
        onCancel={() => setAssignTarget(null)}
      >
        <div className="w-full space-y-3 text-left">
          <div>
            <label className={labelCls}>Doctor</label>
            <FormDropdown
              name="assign_doctor"
              className={inputCls}
              options={doctors
                .filter((d) => d.emp_status !== false)
                .map((d) => ({
                  label: `Dr. ${[d.first_name, d.middle_name, d.last_name].filter(Boolean).join(" ")}`,
                  value: d.employee_id,
                }))}
              value={assignDoctorId}
              onValueChange={setAssignDoctorId}
              placeholder="Select doctor"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Date</label>
              <input
                type="date"
                min={todayISODate()}
                className={inputCls}
                value={assignDate}
                onChange={(e) => setAssignDate(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Time</label>
              <TimepickerWheel value={assignTime} onChange={setAssignTime} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Reason (optional)</label>
            <textarea
              rows={2}
              className={inputCls}
              value={assignReason}
              onChange={(e) => setAssignReason(e.target.value)}
            />
          </div>
        </div>
      </ConfirmationDialog>

      {/* Confirm reschedule dialog */}
      <ConfirmationDialog
        open={!!confirmTarget}
        type="warning"
        title="Confirm reschedule"
        description={
          confirmTarget
            ? `This moves the appointment to ${doctorNameById(confirmTarget.assigned_employee_id) || "the assigned doctor"} on ${formatDate(confirmTarget.assigned_date)} at ${formatTime(confirmTarget.assigned_time)}. The patient's appointment record is updated and marked Rescheduled.`
            : ""
        }
        confirmText="Confirm reschedule"
        loading={processing}
        onConfirm={doConfirm}
        onCancel={() => setConfirmTarget(null)}
      >
        <div className="w-full text-left">
          <label className={labelCls}>Reason (optional)</label>
          <textarea
            rows={2}
            className={inputCls}
            value={confirmReason}
            onChange={(e) => setConfirmReason(e.target.value)}
          />
        </div>
      </ConfirmationDialog>

      {/* Cancel dialog */}
      <ConfirmationDialog
        open={!!cancelTarget}
        type="danger"
        title="Cancel reschedule request?"
        description="The appointment will be marked Cancelled and removed from the queue. This cannot be undone."
        confirmText="Cancel appointment"
        loading={processing}
        onConfirm={doCancel}
        onCancel={() => setCancelTarget(null)}
      >
        <div className="w-full text-left">
          <label className={labelCls}>Reason (optional)</label>
          <textarea
            rows={2}
            className={inputCls}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
        </div>
      </ConfirmationDialog>
    </div>
  );
}
