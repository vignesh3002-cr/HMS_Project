import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { User, IdCard, Phone, Mail, MapPin, Cake, Droplet, VenusAndMars, Briefcase, X, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import CalendarPicker from "@/components/hms/Calender";
import ScheduleSlotModal, {
  type ScheduleSlotModalHandle,
  type ScheduleSlotAddPayload,
  type ScheduleSlotEditPayload,
} from "@/components/hms/ScheduleSlotModal";
import { employeeApi, type EmployeeDetailResponse, type DoctorScheduleRecord } from "@/api/employee.api";
import { appointmentApi, type AvailableSlotsResult } from "@/api/appointment.api";
import { doctorLeaveApi } from "@/api/doctorLeave.api";
import { departmentApi, type Department } from "@/api/department.api";
import {
  doctorTransferApi,
  type TransferAppointmentSummary,
  type TransferAction,
} from "@/api/doctorTransfer.api";
import { getUser } from "@/utils/token";
import { DepartmentPill } from "@/components/hms/DepartmentBadge";
import { StatusBadge } from "@/components/hms/StatusBadge";

function formatDoctorFullName(e: EmployeeDetailResponse["employee"] | null): string {
  if (!e) return "Doctor";
  return `Dr. ${[e.first_name, e.middle_name, e.last_name].filter(Boolean).join(" ")}`;
}

// doctor_schedule.start_time/end_time come back as UTC-anchored time values
// (see toTimeInputValue in Edit Appointment.tsx for the same pattern) -- read
// with UTC getters so the displayed hour doesn't shift with the browser's
// local timezone.
function formatScheduleTime(time: string | null): string {
  if (!time) return "";
  const d = new Date(time);
  if (isNaN(d.getTime())) return "";
  const hours = d.getUTCHours();
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  const period = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${minutes} ${period}`;
}

function toTimeInputValue(time: string | null | undefined): string {
  if (!time) return "";
  const d = new Date(time);
  if (isNaN(d.getTime())) return "";
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function deriveShiftName(startTime: string): string {
  const hour = Number(startTime.split(":")[0]);
  return hour < 12 ? "Morning" : "Evening";
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

const WEEK_DAYS = [
  ["Monday"],
  ["Tuesday"],
  ["Wednesday"],
  ["Thursday"],
  ["Friday"],
  ["Saturday"],
  ["Sunday"],
];

// Monday-Sunday dates (dd/mm/yy) for the week containing `reference`.
const getWeekDates = (reference) => {
  const day = reference.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(reference);
  monday.setDate(monday.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear() % 100).padStart(2, "0");
    return `${dd}/${mm}/${yy}`;
  });
};

const shiftDate = (dateStr, days) => {
  const [dd, mm, yy] = dateStr.split("/").map(Number);
  const date = new Date(2000 + yy, mm - 1, dd);
  date.setDate(date.getDate() + days);
  const newDd = String(date.getDate()).padStart(2, "0");
  const newMm = String(date.getMonth() + 1).padStart(2, "0");
  const newYy = String(date.getFullYear() % 100).padStart(2, "0");
  return `${newDd}/${newMm}/${newYy}`;
};

const parseDate = (dateStr) => {
  const [dd, mm, yy] = dateStr.split("/").map(Number);
  return new Date(2000 + yy, mm - 1, dd);
};

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const dateKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

const buildCalendarDays = (year, month) => {
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];

  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true });
  }
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const last = cells[cells.length - 1].date;
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false });
  }

  return cells;
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const getMonthYearLabel = (year, month) => `${MONTH_NAMES[month]} ${year}`;

export default function DoctorProfile() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  // Entering via /doctor/day-view/:id opens on the Day tab, /doctor/view/:id
  // opens on Week -- both routes render this same merged page now, so the
  // entry URL just decides the initial tab instead of navigating to a
  // separate page.
  const [activeTab, setActiveTab] = useState(() =>
    location.pathname.includes("/doctor/day-view") ? "day" : "week",
  );
  const [toggledDates, setToggledDates] = useState<Set<string>>(new Set());
  const slotModalRef = useRef<ScheduleSlotModalHandle>(null);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [isFromCalendarOpen, setIsFromCalendarOpen] = useState(false);
  const [isToCalendarOpen, setIsToCalendarOpen] = useState(false);
  const [savingSlot, setSavingSlot] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [pendingTransfer, setPendingTransfer] = useState<{
    transferId: string;
    appointments: TransferAppointmentSummary[];
    message: string;
  } | null>(null);
  const [transferAction, setTransferAction] = useState<TransferAction | null>(null);
  const [replacementDoctorId, setReplacementDoctorId] = useState("");
  const [isConfirmingTransfer, setIsConfirmingTransfer] = useState(false);
  const [weekDates, setWeekDates] = useState(() => getWeekDates(new Date()));
  const [calendarViewYear, setCalendarViewYear] = useState(() => new Date().getFullYear());
  const [calendarViewMonth, setCalendarViewMonth] = useState(() => new Date().getMonth());

  const [doctorDetail, setDoctorDetail] = useState<EmployeeDetailResponse | null>(null);

  useEffect(() => {
    departmentApi
      .getAll()
      .then((res) => setDepartments(res.data?.data ?? []))
      .catch((err) => console.error("[Doctor Profile] Failed to load departments:", err));
  }, []);

  useEffect(() => {
    if (!id) return;
    employeeApi
      .getOne(id)
      .then((res) => {
        setDoctorDetail(res.data?.data ?? null);
      })
      .catch((err) => {
        console.error("[Doctor Profile] Error:", err);
        setDoctorDetail(null);
      });
  }, [id]);

  // Real available slots for the selected day (today), fetched from the
  // appointments API for the doctor being viewed here.
  const [todaySlots, setTodaySlots] = useState<AvailableSlotsResult | null>(null);
  const [isSlotsLoading, setIsSlotsLoading] = useState(false);

  const doctorEmployee = doctorDetail?.employee ?? null;
  const doctorName = formatDoctorFullName(doctorEmployee);
  const doctorSpecialization = doctorDetail?.doctorProfile?.specialization || doctorEmployee?.specialization || "—";
  const doctorQualification = doctorDetail?.doctorProfile?.qualification || doctorEmployee?.qualification || "—";
  const doctorBranchNames = (doctorDetail?.branches?.length
    ? doctorDetail.branches.map((b) => b.branch_name)
    : doctorEmployee?.branch?.branch_name
      ? [doctorEmployee.branch.branch_name]
      : []
  );
  const doctorIsAvailable = doctorEmployee?.emp_status === true || doctorDetail?.user?.user_status === 0;
  // Only a real photo URL from the backend is used -- no stock/fallback
  // image, so the avatar block simply doesn't render when the doctor has
  // no employee_photo_URL on file.
  const doctorPhoto = doctorEmployee?.employee_photo_URL || "";
  const doctorLicenseNo = doctorDetail?.doctorProfile?.license_no || doctorEmployee?.license_no || "—";
  const doctorPhone = doctorEmployee?.mobile_no || "—";
  const doctorEmail = doctorEmployee?.email || "—";
  const doctorLocation = doctorEmployee?.current_address || doctorEmployee?.parmanent_address || "—";
  const doctorBloodGroup = doctorEmployee?.blood_group || "—";
  const doctorExperience = doctorEmployee?.employee_no_experence != null ? `${doctorEmployee.employee_no_experence}+ yrs` : "—";
  const doctorDOB = (doctorEmployee as any)?.dob
    ? format(new Date((doctorEmployee as any).dob), "dd MMM yyyy")
    : "—";
  const doctorGender = (doctorEmployee as any)?.gender || "—";

  useEffect(() => {
    const branchId = doctorDetail?.branches?.[0]?.branch_id;
    if (!id || !branchId) return;

    setIsSlotsLoading(true);
    appointmentApi
      .getAvailableSlots(id, branchId, format(new Date(), "yyyy-MM-dd"))
      .then((res) => {
        setTodaySlots(res.data?.data ?? null);
      })
      .catch((err) => {
        console.error("[Doctor Profile] Failed to load available slots:", err);
        setTodaySlots(null);
      })
      .finally(() => {
        setIsSlotsLoading(false);
      });
  }, [id, doctorDetail]);

  const calendarDays = buildCalendarDays(calendarViewYear, calendarViewMonth);

  // Real weekly availability, grouped by day_of_week from the doctor's
  // active doctor_schedule rows (part of the same employeeApi.getOne(id)
  // response used above) -- no fake/placeholder slots. Since doctor_schedule
  // is a recurring weekly template (day_of_week, not a specific date), the
  // same grid applies to every week; only the displayed dates change when
  // navigating weeks.
  const doctorSchedules: DoctorScheduleRecord[] = doctorDetail?.doctorSchedules ?? [];

  const scheduleByDay = useMemo(() => {
    const map: Record<
      string,
      { time: string; branch: string; branchId: string; startTime: string; endTime: string; scheduleId: string | number }[]
    > = {};
    WEEK_DAYS.forEach(([day]) => {
      map[day.toUpperCase()] = [];
    });
    doctorSchedules.forEach((s) => {
      const key = (s.day_of_week || "").toUpperCase();
      if (!(key in map)) return;
      map[key].push({
        time: `${formatScheduleTime(s.start_time)} - ${formatScheduleTime(s.end_time)}`,
        branch: s.branch?.branch_name || "",
        branchId: s.branch_id,
        startTime: toTimeInputValue(s.start_time),
        endTime: toTimeInputValue(s.end_time),
        scheduleId: s.schedule_id,
      });
    });
    return map;
  }, [doctorSchedules]);

  const maxScheduleRows = Math.max(
    1,
    ...WEEK_DAYS.map(([day]) => scheduleByDay[day.toUpperCase()]?.length || 0),
  );

  const schedule = Array.from({ length: maxScheduleRows }, (_, rowIndex) =>
    WEEK_DAYS.map(([day]) => {
      const entry = scheduleByDay[day.toUpperCase()]?.[rowIndex];
      return entry
        ? ([
            entry.time,
            "blue",
            entry.branch,
            entry.scheduleId,
            entry.branchId,
            entry.startTime,
            entry.endTime,
          ] as [string, string, string, string | number, string, string, string])
        : (["+", "empty"] as [string, string]);
    }),
  );

  const refetchDoctor = () => {
    if (!id) return;
    employeeApi
      .getOne(id)
      .then((res) => setDoctorDetail(res.data?.data ?? null))
      .catch((err) => console.error("[Doctor Profile] Failed to refresh schedule:", err));
  };

  const replacementDoctors = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of pendingTransfer?.appointments ?? []) {
      for (const d of a.eligible_replacement_doctors ?? []) {
        if (!map.has(d.employee_id)) map.set(d.employee_id, d.name);
      }
    }
    return Array.from(map, ([employee_id, name]) => ({ employee_id, name }));
  }, [pendingTransfer]);

  const handleAddSlot = async ({
    day,
    branchId,
    branchName,
    startTime,
    endTime,
    timeLabel,
    effectiveDate,
    consultationMinutes,
    transferReason,
    departmentId,
  }: ScheduleSlotAddPayload) => {
    if (!id || !day || !branchId || !startTime || !endTime) {
      showAlert("Please select day, start time, end time and branch location.");
      return false;
    }
    if (!effectiveDate) {
      showAlert("Effective date is required.");
      return false;
    }
    if (!transferReason?.trim()) {
      showAlert("Transfer reason is required.");
      return false;
    }
    if (!departmentId) {
      showAlert("Please select a department.");
      return false;
    }

    const consultationMinutesValue =
      Number(consultationMinutes) || (doctorDetail?.doctorProfile?.consultation_minutes ?? 20);

    setSavingSlot(true);
    try {
      const res = await doctorTransferApi.initiateTransfer(id, {
        mode: "ADD_BRANCH",
        new_branch_id: branchId,
        new_department_id: departmentId,
        effective_date: effectiveDate,
        transfer_reason: transferReason.trim(),
        consultation_minutes: consultationMinutesValue,
        working_hours: [
          {
            branch_id: branchId,
            day_of_week: day.toUpperCase() as any,
            shift_name: deriveShiftName(startTime),
            start_time: startTime,
            end_time: endTime,
          },
        ],
      });

      const data = res.data?.data;
      if (!data) {
        showAlert(res.data?.message || "Failed to add slot.");
        return false;
      }

      if (data.status === "PENDING_CONFIRMATION") {
        setPendingTransfer({
          transferId: data.transfer_id,
          appointments: data.appointments ?? [],
          message: data.message ?? "",
        });
        setTransferAction(null);
        setReplacementDoctorId("");
        return true;
      }

      refetchDoctor();
      showAlert(data.message || `Slot added for ${day}: ${timeLabel} (${branchName})`);
      return true;
    } catch (err: any) {
      showAlert(err?.response?.data?.message || err?.message || "Failed to add slot.");
      return false;
    } finally {
      setSavingSlot(false);
    }
  };

  const handleCancelSlot = async ({
    scheduleId,
    info,
  }: {
    scheduleId: string | number | null;
    info: string;
  }) => {
    if (!id || scheduleId === null) {
      showAlert("Unable to cancel this slot.");
      return;
    }
    try {
      await employeeApi.removeScheduleSlot(id, scheduleId);
      refetchDoctor();
      showAlert(`Slot cancelled: ${info}`);
    } catch (err: any) {
      showAlert(err?.response?.data?.message || "Failed to cancel slot.");
    }
  };

  const handleUpdateSlot = async ({
    scheduleId,
    day,
    branchId,
    startTime,
    endTime,
    effectiveDate,
    consultationMinutes,
    transferReason,
    departmentId,
  }: ScheduleSlotEditPayload) => {
    if (!id || scheduleId === null) {
      showAlert("Unable to update this slot.");
      return false;
    }
    if (!day || !branchId || !startTime || !endTime) {
      showAlert("Please select day, start time, end time and branch location.");
      return false;
    }

    const original = doctorSchedules.find((s) => String(s.schedule_id) === String(scheduleId));
    if (!original) {
      showAlert("The original slot was not found.");
      return false;
    }

    const consultationMinutesValue =
      Number(consultationMinutes) || (doctorDetail?.doctorProfile?.consultation_minutes ?? 20);

    const originalBranch = original.branch_id;
    const originalDay = (original.day_of_week ?? "").toUpperCase();
    const originalStart = toTimeInputValue(original.start_time);
    const originalEnd = toTimeInputValue(original.end_time);
    const newDay = day.toUpperCase();

    const branchChanged = originalBranch !== branchId;
    const dayChanged = originalDay !== newDay;
    const timeChanged = originalStart !== startTime || originalEnd !== endTime;
    const minutesChanged = Number(original.consultation_minutes) !== consultationMinutesValue;
    const changed = branchChanged || dayChanged || timeChanged || minutesChanged;

    if (!changed) {
      showAlert("No changes were made to this slot.");
      return false;
    }

    // Same branch + same day + overlapping times (only when times actually
    // changed — a consultation-minutes-only edit shares identical times):
    // do not create the new slot.
    if (!branchChanged && !dayChanged && timeChanged) {
      const oldS = toMinutes(originalStart);
      const oldE = toMinutes(originalEnd);
      const newS = toMinutes(startTime);
      const newE = toMinutes(endTime);
      if (oldS < newE && newS < oldE) {
        showAlert(
          "Cannot change the slot to an overlapping time on the same day and branch. Choose a time that does not overlap the current slot.",
        );
        return false;
      }
    }

    if (!effectiveDate) {
      showAlert("Effective date is required.");
      return false;
    }
    if (!transferReason?.trim()) {
      showAlert("Transfer reason is required.");
      return false;
    }
    if (!departmentId) {
      showAlert("Please select a department.");
      return false;
    }

    setSavingSlot(true);
    try {
      const res = await doctorTransferApi.initiateTransfer(id, {
        // A single-slot branch move must NEVER use TRANSFER mode — that
        // closes the whole old branch and every other slot there. Instead
        // the new slot is added (ADD_BRANCH) and only the edited row is
        // closed via close_schedule_ids. Everything else stays untouched.
        mode: "ADD_BRANCH",
        close_schedule_ids: [Number(scheduleId)],
        new_branch_id: branchId,
        new_department_id: departmentId,
        effective_date: effectiveDate,
        transfer_reason: transferReason.trim(),
        consultation_minutes: consultationMinutesValue,
        working_hours: [
          {
            branch_id: branchId,
            day_of_week: newDay as any,
            shift_name: deriveShiftName(startTime),
            start_time: startTime,
            end_time: endTime,
          },
        ],
      });

      const data = res.data?.data;
      if (!data) {
        showAlert(res.data?.message || "Failed to update slot.");
        return false;
      }

      if (data.status === "PENDING_CONFIRMATION") {
        setPendingTransfer({
          transferId: data.transfer_id,
          appointments: data.appointments ?? [],
          message: data.message ?? "",
        });
        setTransferAction(null);
        setReplacementDoctorId("");
        return true;
      }

      refetchDoctor();
      showAlert(data.message || "Slot updated.");
      return true;
    } catch (err: any) {
      showAlert(err?.response?.data?.message || err?.message || "Failed to update slot.");
      return false;
    } finally {
      setSavingSlot(false);
    }
  };

  const confirmPendingTransfer = async (action: TransferAction) => {
    if (!pendingTransfer || !id) return;
    if (action === "TRANSFER" && !replacementDoctorId) {
      showAlert("Choose a replacement doctor.");
      return;
    }

    setIsConfirmingTransfer(true);
    try {
      const res = await doctorTransferApi.confirmTransfer(id, {
        transfer_id: pendingTransfer.transferId,
        action,
        ...(action === "TRANSFER" ? { replacement_employee_id: replacementDoctorId } : {}),
        ...(action === "CANCEL" ? { confirm: true } : {}),
      });

      const data = res.data?.data;
      if (data) {
        const s = data.summary;
        showAlert(
          `Transfer processed — total: ${s.total}, transferred: ${s.successful}, queued: ${s.queued}, cancelled: ${s.cancelled}, conflicts: ${s.conflicts}.`,
        );
      } else {
        showAlert(res.data?.message || "Transfer action processed.");
      }

      setPendingTransfer(null);
      setTransferAction(null);
      setReplacementDoctorId("");
      refetchDoctor();
    } catch (err: any) {
      showAlert(err?.response?.data?.message || err?.message || "Failed to process transfer action.");
    } finally {
      setIsConfirmingTransfer(false);
    }
  };

  const showAlert = (message) => {
    alert(message);
  };

const submitLeave = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  if (!id) {
    alert("Doctor ID is missing.");
    return;
  }

  const form = new FormData(e.currentTarget);
  const reason = String(form.get("reason") || "").trim();

  if (!fromDate || !toDate || !reason) {
    alert("Please fill in all leave details.");
    return;
  }

  if (toDate < fromDate) {
    alert("The To date cannot be before the From date.");
    return;
  }

  try {
    const loggedInUser = getUser();

    if (!loggedInUser?.user_id) {
      alert("Logged-in user information is missing. Please log in again.");
      return;
    }

    const response = await doctorLeaveApi.apply(id, {
      leave_start_date: format(fromDate, "yyyy-MM-dd"),
      leave_end_date: format(toDate, "yyyy-MM-dd"),
      leave_reason: reason,
      requested_by: loggedInUser.user_id,
    });

    console.log("Leave application response:", response.data);

    if (response.data?.success === false) {
      throw new Error(response.data.message || "Failed to apply leave.");
    }

    const leaveId = response.data?.leave?.leave_id;

    alert(
      leaveId
        ? `Leave applied successfully!\nLeave ID: ${leaveId}`
        : "Leave applied successfully!"
    );

    e.currentTarget.reset();
    setFromDate(null);
    setToDate(null);
  } catch (error: any) {
    console.error("Leave application failed:", error);
    console.error("Backend response:", error?.response?.data);

    alert(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to apply for leave."
    );
  }
};
  const previousWeek = () => {
    setWeekDates((prev) => prev.map((date) => shiftDate(date, -7)));
  };

  const nextWeek = () => {
    setWeekDates((prev) => prev.map((date) => shiftDate(date, 7)));
  };

  const previousMonth = () => {
    setCalendarViewMonth((prev) => {
      if (prev === 0) {
        setCalendarViewYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const nextMonth = () => {
    setCalendarViewMonth((prev) => {
      if (prev === 11) {
        setCalendarViewYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-[#172033] font-[Inter,Arial,sans-serif]">

      

      <main className="w-full p-4">

        {/* DOCTOR PROFILE */}

        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-[#424752] text-sm font-medium shadow-sm hover:bg-[#F2F4F6] hover:border-[#00488D]/30 hover:text-[#00488D] transition-all duration-200 cursor-pointer"
        >
          <span className="text-lg leading-none">←</span>
          <span>Go back</span>
        </button>

        <section className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex gap-[18px] mb-4 max-[700px]:flex-col">

          <div className="w-32 h-32 rounded-full overflow-hidden shrink-0 bg-[#E6E8EA] flex items-center justify-center max-[700px]:w-[105px] max-[700px]:h-[105px]">
            {doctorPhoto ? (
              <img
                src={doctorPhoto}
                alt={doctorName}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-1/2 h-1/2 text-[#8C8D8F]" strokeWidth={1.5} />
            )}
          </div>

          <div className="flex-1">

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-[#191C1E] max-[500px]:text-lg">
                  {doctorName}
                </h1>

                <DepartmentPill department={doctorSpecialization} className="text-[11px] px-[9px] py-1 rounded-full">
                  {doctorSpecialization}
                </DepartmentPill>
              </div>

              <p className="mt-[5px] text-[#424752] text-[13px]">
                {doctorQualification}
              </p>
            </div>

            <div className="mt-[21px] flex flex-col gap-3 text-[13px]">

              <div className="text-[#424752]">
                <span className="mr-1.5">▣</span>
                Hospital : {doctorBranchNames.length ? doctorBranchNames.join(", ") : "—"}
              </div>

              {/* Availability + Book Appointment */}
              <div className="flex items-center justify-between mt-1 max-[500px]:flex-col max-[500px]:items-stretch max-[500px]:gap-3">

                <StatusBadge tone={doctorIsAvailable ? "green" : "slate"}>
                  {doctorIsAvailable ? "Available" : "Unavailable"}
                </StatusBadge>

                <button
                  onClick={() =>
                    navigate("/appointments/book", { state: { doctorId: id } })
                  }
                  className="border-0 bg-[#004785] hover:bg-[#003a6b] text-white px-[17px] py-[11px] rounded-[7px] text-[13px] font-semibold cursor-pointer max-[500px]:w-full transition-colors duration-150"
                >
                  Book Appointment
                </button>

              </div>

            </div>

          </div>
        </section>


        {/* ABOUT */}
        <section className="bg-white border border-[#edf0f4] rounded-[10px] p-[21px] mb-4">

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg text-[#172033]">
              About
            </h2>

            <button
              onClick={() => {
                if (id) {
                  navigate(`/doctor/view/${id}/details`);
                } else {
                  showAlert("Unable to open the detailed doctor profile.");
                }
              }}
              className="border-0 bg-transparent text-[#135dc5] underline text-[13px] cursor-pointer"
            >
              View More
            </button>
          </div>

          <div className="grid grid-cols-4 gap-x-6 gap-y-5 max-[900px]:grid-cols-2 max-[500px]:grid-cols-1">

            {[
              { Icon: IdCard, title: "Medical Licence Number", value: doctorLicenseNo },
              { Icon: Phone, title: "Phone Number", value: doctorPhone },
              { Icon: Mail, title: "Email", value: doctorEmail },
              { Icon: MapPin, title: "Location", value: doctorLocation },
              { Icon: Cake, title: "DOB", value: doctorDOB },
              { Icon: Droplet, title: "Blood group", value: doctorBloodGroup },
              { Icon: VenusAndMars, title: "Gender", value: doctorGender },
              { Icon: Briefcase, title: "Experience", value: doctorExperience },
            ].map(({ Icon, title, value }) => (
              <div
                key={title}
                className="flex items-start gap-3"
              >
                <div className="w-[23px] h-[23px] flex items-center justify-center text-gray-900 shrink-0">
                  <Icon className="w-[17px] h-[17px]" strokeWidth={1.75} />
                </div>

                <div className="flex flex-col gap-[3px]">
                  <strong className="text-xs font-bold text-[#222938]">
                    {title}
                  </strong>

                  <span className="text-[#6d7480] text-xs leading-[18px]">
                    {value}
                  </span>
                </div>
              </div>
            ))}

          </div>
        </section>

        {/* BIO */}
        <section className="bg-white border border-[#edf0f4] rounded-[10px] p-[21px] mb-[15px]">
          <h2 className="text-lg">
            Short Bio
          </h2>

          <p className="mt-3 text-[#5f6672] text-[13px] leading-[22px]">
            {doctorDetail?.doctorProfile?.doctor_bio?.trim() || "—"}
          </p>
        </section>

        {/* TABS */}
        <div className="h-[39px] flex justify-center items-center gap-[42px]">

          {["day", "week"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`h-[39px] px-[17px] border-0 bg-transparent text-xs cursor-pointer ${
                activeTab === tab
                  ? "text-[#004a91] border-b-2 border-[#004a91]"
                  : "text-[#4c515a]"
              }`}
            >
              {tab === "day" ? "Day" : "Week"}
            </button>
          ))}

        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-[minmax(0,1fr)_345px] gap-5 max-[900px]:grid-cols-1">

          {/* LEFT COLUMN */}
          <div className="min-w-0">

            {/* AVAILABILITY */}
            <section className="bg-white border border-[#edf0f4] rounded-[10px] p-5 mb-4">

              <div className="flex items-center justify-between mb-4 max-[700px]:flex-col max-[700px]:items-start max-[700px]:gap-[14px]">

                <h2 className="text-[19px]">
                  Availability
                </h2>

                <div className="flex items-center gap-4 flex-wrap">

                  {activeTab === "week" && (
                    <>
                      <button
                        onClick={previousWeek}
                        className="border-0 bg-transparent text-[#555e6c] text-xs cursor-pointer"
                      >
                        ‹ Previous week
                      </button>

                      <button
                        onClick={nextWeek}
                        className="border-0 bg-transparent text-[#555e6c] text-xs cursor-pointer"
                      >
                        Next week ›
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => slotModalRef.current?.openAddSlot("")}
                    className="bg-[#004a91] text-white px-[14px] py-2 rounded-md text-xs font-semibold border-0 cursor-pointer"
                  >
                    + Add slot
                  </button>

                </div>

              </div>

              {/* SCHEDULE */}
              <div className="border border-[#b9bfcb] rounded-[7px] overflow-x-auto">

                <div className="min-w-[610px]">

                  {/* HEADER */}
                  <div className="grid grid-cols-7 bg-[#f1f3f5] border-b border-[#b9bfcb]">

                    {WEEK_DAYS.map(([day], dayIdx) => (
                      <div
                        key={day}
                        className={`min-h-[43px] p-[7px_3px] border-r border-[#b9bfcb] text-center text-[#003b80] text-[8px] font-bold ${
                          activeTab === "day" ? "flex items-center justify-center" : ""
                        }`}
                      >
                        {day}
                        {activeTab === "week" && (
                          <small className="block mt-[3px] text-[7px]">
                            {weekDates[dayIdx]}
                          </small>
                        )}
                      </div>
                    ))}

                  </div>

                  {/* ROWS */}
                  {schedule.map((row, rowIndex) => (
                    <div
                      key={rowIndex}
                      className="grid grid-cols-7 min-h-[64px] border-b border-[#b9bfcb] last:border-b-0"
                    >
                      {row.map(([text, type, branch, scheduleId, branchId, startTime, endTime], index) => (

                        <div
                          key={index}
                          className="p-1 border-r border-[#b9bfcb] min-w-0"
                        >

                          {type === "off" && (
                            <div className="h-[54px] border border-dashed border-[#b9bfcb] rounded flex items-center justify-center text-[#657080] text-[8px]">
                              Week Off
                            </div>
                          )}

                          {type === "empty" && (
                            <div
                              onClick={() => slotModalRef.current?.openAddSlot(WEEK_DAYS[index][0], rowIndex, index)}
                              className="h-[54px] border border-dashed border-[#b9bfcb] rounded flex items-center justify-center text-[#7d8794] text-lg cursor-pointer hover:border-[#004a91] hover:text-[#004a91]"
                            >
                              +
                            </div>
                          )}

                          {["green", "blue", "orange"].includes(type) && (
                            <div
                              onClick={() =>
                                slotModalRef.current?.openEditSlot({
                                  scheduleId: scheduleId ?? 0,
                                  day: WEEK_DAYS[index][0],
                                  date: "",
                                  branchId: branchId || "",
                                  branchName: branch,
                                  startTime: startTime || "",
                                  endTime: endTime || "",
                                  timeLabel: text,
                                  mode: "weekly",
                                  departmentId: doctorEmployee?.department_id || "",
                                  consultationMinutes:
                                    doctorSchedules.find((s) => String(s.schedule_id) === String(scheduleId))
                                      ?.consultation_minutes,
                                })
                              }
                              className={`relative cursor-pointer h-[54px] rounded-[3px] p-[5px] flex flex-col justify-start gap-1 overflow-hidden border-l-[3px] ${
                                type === "green"
                                  ? "bg-[#f0faf6] text-[#087d53] border-[#087d53]"
                                  : type === "blue"
                                  ? "bg-[#f1f6ff] text-[#1e5fc7] border-[#1e5fc7]"
                                  : "bg-[#fff7ef] text-[#ed741b] border-[#ed741b]"
                              }`}
                            >
                              <button
                                type="button"
                                title="Delete slot"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  slotModalRef.current?.openCancelSlot(
                                    WEEK_DAYS[index][0],
                                    rowIndex,
                                    index,
                                    text,
                                    branch,
                                    scheduleId ?? null,
                                  );
                                }}
                                className="absolute top-[2px] right-[2px] p-[1px] rounded-full text-[#9aa3b0] hover:text-[#ff453a] hover:bg-[#ffebea] transition-colors cursor-pointer"
                              >
                                <X className="size-3" />
                              </button>

                              <strong className="text-[6px] whitespace-nowrap pl-1">
                                {text}
                              </strong>

                              <small className="text-[6px] leading-[8px]">
                                {branch || "Central Hospital"}
                              </small>
                            </div>
                          )}

                        </div>

                      ))}
                    </div>
                  ))}

                </div>

              </div>

            </section>

            {/* LEAVE SUBMISSION */}
            <section className="bg-white border border-[#edf0f4] rounded-[10px] p-[31px] max-[500px]:p-5">

              <div className="flex justify-between items-center mb-6 max-[500px]:flex-col max-[500px]:items-start max-[500px]:gap-3">

                <div className="flex items-center gap-3">

                  <div className="w-10 h-10 rounded-lg bg-[#fff1f0] text-[#ff453a] flex items-center justify-center text-[22px]">
                    ◷
                  </div>

                  <h2 className="text-[19px]">
                    Leave Submission
                  </h2>

                </div>

                <span className="text-[#a0a7b1] bg-[#f7f8fa] rounded-full px-[11px] py-[5px] text-[9px] tracking-[0.7px]">
                  LEAVE MANAGEMENT
                </span>

              </div>

              <form onSubmit={submitLeave}>

                <div className="grid grid-cols-2 gap-4 max-[700px]:grid-cols-1">

                  <div>
                    <label className="block text-[#99a1ac] text-[9px] font-bold mb-[5px]">
                      FROM
                    </label>

                    <Popover open={isFromCalendarOpen} onOpenChange={setIsFromCalendarOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="w-full text-left border border-[#dfe4ea] rounded-[7px] outline-none p-[10px_12px] text-xs text-[#374151] focus:border-[#004a91]"
                        >
                          {fromDate ? format(fromDate, "dd/MM/yyyy") : "Select date"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 border-[#dfe4ea] shadow-lg">
                        <CalendarPicker
                          selected={fromDate}
                          hideThemePicker
                          onSelect={(date) => {
                            setFromDate(date);
                            setIsFromCalendarOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <label className="block text-[#99a1ac] text-[9px] font-bold mb-[5px]">
                      TO
                    </label>

                    <Popover open={isToCalendarOpen} onOpenChange={setIsToCalendarOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="w-full text-left border border-[#dfe4ea] rounded-[7px] outline-none p-[10px_12px] text-xs text-[#374151] focus:border-[#004a91]"
                        >
                          {toDate ? format(toDate, "dd/MM/yyyy") : "Select date"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 border-[#dfe4ea] shadow-lg">
                        <CalendarPicker
                          selected={toDate}
                          hideThemePicker
                          onSelect={(date) => {
                            setToDate(date);
                            setIsToCalendarOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                </div>

                <textarea
                  name="reason"
                  placeholder="Reason for leave..."
                  className="w-full min-h-[66px] mt-3 resize-y border border-[#dfe4ea] rounded-[7px] outline-none p-[10px_12px] text-xs text-[#374151] focus:border-[#004a91]"
                />

                <div className="flex justify-end gap-4 mt-4">

                  <button
                    type="reset"
                    onClick={() => {
                      setFromDate(null);
                      setToDate(null);
                    }}
                    className="h-[38px] px-7 rounded-[9px] text-sm font-semibold cursor-pointer bg-white text-[#ff453a] border-2 border-[#ff453a]"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="h-[38px] px-7 rounded-[9px] text-sm font-semibold cursor-pointer bg-[#004a91] text-white border-2 border-[#004a91]"
                  >
                    Submit
                  </button>

                </div>

              </form>

            </section>

          </div>

          {/* RIGHT COLUMN */}
          <aside className="min-w-0 max-[900px]:grid max-[900px]:grid-cols-2 max-[900px]:gap-5 max-[700px]:block">

            {/* CALENDAR (Week tab only -- the Day tab's simpler layout never had a month calendar) */}
            {activeTab === "week" && (
            <section className="bg-white border border-[#edf0f4] rounded-[10px] p-[25px] mb-6 max-[900px]:mb-0 max-[700px]:mb-5">

              <div className="flex items-center justify-between mb-[22px]">

                <button
                  onClick={previousMonth}
                  className="border-0 bg-transparent text-[#9ca3af] text-2xl cursor-pointer"
                >
                  ‹
                </button>

                <h3 className="text-[15px]">
                  {getMonthYearLabel(calendarViewYear, calendarViewMonth)}
                </h3>

                <button
                  onClick={nextMonth}
                  className="border-0 bg-transparent text-[#9ca3af] text-2xl cursor-pointer"
                >
                  ›
                </button>

              </div>

              <div className="grid grid-cols-7 gap-2 mb-2">

                {["SU", "MO", "TU", "WE", "TH", "FR", "SA"].map((day) => (
                  <span
                    key={day}
                    className="text-center text-[#9ca3af] text-[8px] font-bold"
                  >
                    {day}
                  </span>
                ))}

              </div>

              <div className="grid grid-cols-7 gap-2">

                {calendarDays.map((cell, index) => {
                  const isInActiveWeek =
                    cell.inMonth && weekDates.some((d) => isSameDay(parseDate(d), cell.date));
                  const key = dateKey(cell.date);
                  const isToggled = toggledDates.has(key);
                  const isHighlighted = isToggled ? !isInActiveWeek : isInActiveWeek;

                  return (
                    <button
                      key={index}
                      onClick={() =>
                        setToggledDates((prev) => {
                          const next = new Set(prev);
                          if (next.has(key)) next.delete(key);
                          else next.add(key);
                          return next;
                        })
                      }
                      className={`w-[31px] h-[31px] flex items-center justify-center rounded-full text-[11px] mx-auto border-0 cursor-pointer ${
                        !cell.inMonth
                          ? "text-[#c8ced7] bg-transparent"
                          : isHighlighted
                          ? "bg-[#2167d5] text-white"
                          : "text-[#596273] bg-transparent hover:bg-[#e8f0ff]"
                      }`}
                    >
                      {cell.date.getDate()}
                    </button>
                  );
                })}

              </div>

            </section>
            )}

            {/* REVIEWS */}
            <section className="bg-white border border-[#edf0f4] rounded-lg overflow-hidden">

              {[
              
                {
                  name: "Sarah Jenkins",
                  time: "1 week ago",
                  image: "https://i.pravatar.cc/100?img=47",
                  rating: "★★★★☆",
                  text: `"Excellent treatment manner. Wait time was a bit longer than expected, but the quality of care definitely made up for it. Highly recommended."`,
                  tags: ["Cardiology"],
                },
                {
                  name: "Robert Wilson",
                  time: "3 days ago",
                  image: "https://i.pravatar.cc/100?img=11",
                  rating: "★★★★★",
                  text: `"The staff and Dr are incredible. I've been a patient here for 2 years and the level of clinical precision and personal attention is unmatched in the city."`,
                  tags: ["Long-term Care", "Referral"],
                },
              ].map((review) => (

                <article
                  key={review.name}
                  className="p-6 border-b border-gray-200"
                >

                  <div className="flex items-start gap-[11px]">

                    <img
                      src={review.image}
                      alt={review.name}
                      className="w-[47px] h-[47px] rounded-full object-cover bg-gray-200"
                    />

                    <div>
                      <h3 className="text-sm mb-[3px]">
                        {review.name}
                      </h3>

                      <span className="text-[#4e5663] text-[10px]">
                        {review.time}
                      </span>
                    </div>

                    <div className="ml-auto text-[#f5a623] text-[13px] tracking-wider">
                      {review.rating}
                    </div>

                  </div>

                  <hr className="border-0 border-t border-gray-200 my-4" />

                  <p className="text-[#4c5360] text-[13px] leading-[22px]">
                    {review.text}
                  </p>

                  <div className="flex flex-wrap gap-[7px] mt-3">

                    {review.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-[#eef8ff] text-[#0d9bd3] rounded-full px-2 py-[3px] text-[9px]"
                      >
                        {tag}
                      </span>
                    ))}

                  </div>

                </article>

              ))}

              <button
                onClick={() => showAlert("All reviews opened.")}
                className="w-full h-9 border-0 bg-[#e9ebef] text-[#004a91] text-[11px] cursor-pointer"
              >
                Read All Reviews
              </button>

            </section>

          </aside>

        </div>

      </main>

      {pendingTransfer && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-[10px] p-6 w-[440px] max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[16px] font-semibold text-[#172033]">
                Affected Appointments
              </h3>

              <button
                onClick={() => setPendingTransfer(null)}
                title="Close (the slot change is not applied)"
                className="p-1 rounded-full text-[#9aa3b0] hover:text-[#374151] hover:bg-[#f1f3f5] transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-[#5f6672] text-[13px] mb-2">{pendingTransfer.message}</p>

            <p className="text-[#5f6672] text-[13px] mb-3">
              {pendingTransfer.appointments.length} future appointment(s) need handling before the slot change is applied.
            </p>

            <div className="border border-[#dfe4ea] rounded-[7px] max-h-[180px] overflow-y-auto divide-y divide-[#eef1f4] mb-4">
              {pendingTransfer.appointments.map((a) => (
                <div key={a.appointment_id} className="px-3 py-2">
                  <div className="text-xs font-semibold text-[#172033]">
                    {a.patient_name || a.patient_id}
                  </div>
                  <div className="text-[11px] text-[#5f6672]">
                    {a.appointment_date} · {a.appointment_time} ·{" "}
                    {a.branch_id
                      ? doctorDetail?.branches?.find((b) => b.branch_id === a.branch_id)?.branch_name ?? a.branch_id
                      : "—"}
                  </div>
                </div>
              ))}
              {pendingTransfer.appointments.length === 0 && (
                <div className="px-3 py-3 text-xs text-[#5f6672]">No affected appointments.</div>
              )}
            </div>

            <div className="flex flex-col gap-2 mb-4">
              <button
                onClick={() => {
                  setTransferAction("TRANSFER");
                  setReplacementDoctorId(replacementDoctors[0]?.employee_id ?? "");
                }}
                className={`text-left px-3 py-2 rounded-[7px] border text-xs font-semibold cursor-pointer transition-colors ${
                  transferAction === "TRANSFER"
                    ? "border-[#004a91] bg-[#eef4ff] text-[#004a91]"
                    : "border-[#dfe4ea] bg-white text-[#374151] hover:border-[#b8cce8]"
                }`}
              >
                Transfer to replacement doctor
              </button>

              <button
                onClick={() => setTransferAction("RESCHEDULE")}
                className={`text-left px-3 py-2 rounded-[7px] border text-xs font-semibold cursor-pointer transition-colors ${
                  transferAction === "RESCHEDULE"
                    ? "border-[#b45309] bg-[#fff7ed] text-[#b45309]"
                    : "border-[#dfe4ea] bg-white text-[#374151] hover:border-[#f2c9a0]"
                }`}
              >
                Reschedule queue
              </button>

              <button
                onClick={() => setTransferAction("CANCEL")}
                className={`text-left px-3 py-2 rounded-[7px] border text-xs font-semibold cursor-pointer transition-colors ${
                  transferAction === "CANCEL"
                    ? "border-[#ff453a] bg-[#fff1f0] text-[#ff453a]"
                    : "border-[#dfe4ea] bg-white text-[#374151] hover:border-[#ffc9c5]"
                }`}
              >
                Cancel appointments
              </button>
            </div>

            {transferAction === "TRANSFER" && (
              <div className="mb-4">
                <label className="block text-[#99a1ac] text-[9px] font-bold mb-[5px]">
                  REPLACEMENT DOCTOR
                </label>

                <select
                  value={replacementDoctorId}
                  onChange={(e) => setReplacementDoctorId(e.target.value)}
                  className="w-full border border-[#dfe4ea] rounded-[7px] outline-none p-[10px_12px] text-xs text-[#374151] focus:border-[#004a91]"
                >
                  <option value="">Select replacement doctor</option>
                  {replacementDoctors.map((d) => (
                    <option key={d.employee_id} value={d.employee_id}>
                      {d.name}
                    </option>
                  ))}
                </select>

                {replacementDoctors.length === 0 && (
                  <p className="text-[11px] text-[#c2410c] mt-1">
                    No eligible replacement doctors were found for these appointments.
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPendingTransfer(null)}
                disabled={isConfirmingTransfer}
                className="h-9 px-4 rounded-[7px] text-[13px] font-semibold cursor-pointer bg-white text-[#555e6c] border border-[#dfe4ea] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                Back
              </button>

              <button
                onClick={() => transferAction && confirmPendingTransfer(transferAction)}
                disabled={!transferAction || isConfirmingTransfer}
                className={`h-9 px-4 rounded-[7px] text-[13px] font-semibold cursor-pointer inline-flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${
                  transferAction === "CANCEL" ? "bg-[#ff453a] text-white border-0" : "bg-[#004a91] text-white border-0"
                }`}
              >
                {isConfirmingTransfer ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Processing...
                  </>
                ) : transferAction === "TRANSFER" ? (
                  "Transfer appointments"
                ) : transferAction === "RESCHEDULE" ? (
                  "Add to reschedule queue"
                ) : (
                  "Confirm cancel"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <ScheduleSlotModal
        ref={slotModalRef}
        branches={doctorDetail?.branches?.filter((b) => b.status === 1) ?? []}
        departments={departments}
        defaultConsultationMinutes={doctorDetail?.doctorProfile?.consultation_minutes ?? 20}
        defaultDepartmentId={doctorEmployee?.department_id ?? ""}
        onAddSlot={handleAddSlot}
        onUpdateSlot={handleUpdateSlot}
        onCancelSlot={handleCancelSlot}
        isSubmitting={savingSlot}
      />
    </div>
  );
}