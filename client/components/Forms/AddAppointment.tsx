import { useState, useEffect, useMemo, useRef, ChangeEvent, FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { addDays, format, parseISO } from "date-fns";
import { ArrowLeft, CalendarPlus, Calendar as CalendarIcon, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FormDropdown } from "@/components/ui/form-dropdown";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import CalendarPicker from "@/components/hms/Calender";
import { branchApi, Branch } from "@/api/branch.api";
import { getUser } from "@/utils/token";
import { departmentApi, Department } from "@/api/department.api";
import { employeeApi, type EmployeeRecord, type DoctorScheduleRecord } from "@/api/employee.api";
import { patientApi, type PatientRecord } from "@/api/patient.api";
import {
  appointmentApi,
  type AvailableSlot,
  type AppointmentResponse,
} from "@/api/appointment.api";
import { validateRequiredFields, type RequiredField } from "@/lib/validation";
import { activeBranches } from "@/lib/utils";

interface AppointmentFormData {
  patientId: string;
  patientName: string;
  patientNumber: string;
  patientType: string;
  branchId: string;
  departmentId: string;
  doctorId: string;
  selectDate: string;
  timeSlot: string;
  patientComment: string;
}

const emptyFormData: AppointmentFormData = {
  patientId: "",
  patientName: "",
  patientNumber: "",
  patientType: "",
  branchId: "",
  departmentId: "",
  doctorId: "",
  selectDate: format(new Date(), "yyyy-MM-dd"),
  timeSlot: "",
  patientComment: "",
};

// Looks forward day-by-day (up to and including maxDateStr) from startDateStr
// for the first date this doctor/branch has a real open slot, so picking a
// doctor doesn't leave the form pointed at a day they're fully booked, not
// scheduled on, or outside the bookable current/next-week window.
async function findNearestAvailableDate(
  doctorId: string,
  branchId: string,
  startDateStr: string,
  maxDateStr: string,
): Promise<string | null> {
  const start = new Date(`${startDateStr}T00:00:00Z`);
  const max = new Date(`${maxDateStr}T00:00:00Z`);
  const maxDays = Math.max(0, Math.round((max.getTime() - start.getTime()) / 86400000));

  for (let i = 0; i <= maxDays; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const dateStr = d.toISOString().split("T")[0];

    try {
      const res = await appointmentApi.getAvailableSlots(doctorId, branchId, dateStr);
      const slots = res.data?.data?.slots || [];
      const isCancelled = res.data?.data?.is_cancelled ?? false;
      // Skip cancelled days when searching for nearest available date.
      // On week-off/leave days (not cancelled) the form stays put with free-time entry.
      if (isCancelled) {
        continue;
      }
      // On normal scheduled days with available slots, jump to that date.
      if (slots.some((s) => s.is_available)) {
        return dateStr;
      }
    } catch (err) {
      // Doctor/branch combo can legitimately 400 on days with no schedule --
      // log so a real backend/auth failure is still visible, then keep
      // trying the remaining days.
      console.error(`[Add Appointment] getAvailableSlots(${doctorId}, ${branchId}, ${dateStr}) failed:`, err);
    }
  }

  return null;
}

function formatSlotLabel(time: string): string {
  // Slot buttons pass plain "HH:MM"; the booking-confirmation response passes
  // the raw ISO datetime the backend stores appointment_time as (UTC-based) --
  // parse hours/minutes from whichever shape shows up.
  let hours: number;
  let minutes: number;
  if (time.includes("T")) {
    const date = new Date(time);
    hours = date.getUTCHours();
    minutes = date.getUTCMinutes();
  } else {
    [hours, minutes] = time.split(":").map(Number);
  }
  const ampm = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${h12.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")} ${ampm}`;
}

function timeStringToMinutes(time: string): number {
  // Available-slots API returns "time" as an ISO datetime on the epoch date
  // (e.g. "1970-01-01T09:00:00.000Z"), while the Day View grid click passes
  // plain "HH:MM" -- handle both shapes.
  if (time.includes("T")) {
    const date = new Date(time);
    return date.getUTCHours() * 60 + date.getUTCMinutes();
  }
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

const inputClass =
  "w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200";
const labelClass = "block text-sm font-semibold text-gray-800 mb-1.5";
const requiredStar = <span className="text-red-600 ml-0.5">*</span>;

export default function AddAppointment() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Arriving from Patients grid view's schedule icon carries the chosen
  // patient in nav state so the form opens with the patient locked in and
  // the user only needs to pick a doctor.
  const preselectedPatient = (location.state as { patient?: PatientRecord } | null)?.patient;

  // Arriving from a doctor's profile (Scheduled.tsx, shared by both the
  // /doctor/view and /doctor/day-view routes) "Book Appointment" button
  // carries that doctor's id so the form opens with the doctor locked in
  // and their branch/department auto-filled.
  const preselectedDoctorId = (location.state as { doctorId?: string } | null)?.doctorId;

  // Arriving from the Day/Week View grids' "New slot available" click carries
  // the exact doctor/branch/department/date (and the Day View's hour) that
  // cell represented, so everything except the patient is already decided --
  // no nearest-date search needed, since the clicked cell IS a real open slot.
  const preselectedSlot = (
    location.state as {
      slot?: { doctorId: string; branchId: string; departmentId: string; date: string; time?: string };
    } | null
  )?.slot;

  // Branch Admin / Staff Admin sessions are tied to one branch (their active
  // user_branch_mapping) -- default the Branch dropdown to it so the
  // Department/Doctor dropdowns narrow to that branch automatically.
  const currentUser = getUser();
  const currentUserRole = String(currentUser?.role_type || currentUser?.role || "").toUpperCase();
  const currentBranchId =
    currentUserRole === "BRANCH_ADMIN" || currentUserRole === "ADMIN"
      ? String(currentUser?.branch_id || "")
      : "";

  const [formData, setFormData] = useState<AppointmentFormData>(() => {
    let base = preselectedPatient
      ? {
          ...emptyFormData,
          patientId: preselectedPatient.patient_id,
          patientName: `${preselectedPatient.patient_first_name}${preselectedPatient.patient_middle_name ? ` ${preselectedPatient.patient_middle_name}` : ""}${preselectedPatient.patient_last_name ? ` ${preselectedPatient.patient_last_name}` : ""}`,
          patientNumber: preselectedPatient.patient_primary_mobile || "",
        }
      : emptyFormData;
    // Admin's own branch is the default unless a Day View slot already
    // decided the exact branch (preselectedSlot below still wins).
    if (currentBranchId) base = { ...base, branchId: currentBranchId };
    if (preselectedDoctorId) base = { ...base, doctorId: preselectedDoctorId };
    if (preselectedSlot) {
      base = {
        ...base,
        doctorId: preselectedSlot.doctorId,
        branchId: preselectedSlot.branchId,
        departmentId: preselectedSlot.departmentId,
        selectDate: preselectedSlot.date,
      };
    }
    return base;
  });

  // The clicked grid cell only knows its hour ("10:00"), not the doctor's
  // real consultation-slot boundaries -- once availableSlots loads for this
  // doctor/branch/date, pick the closest real slot at/after that hour so
  // the time is auto-filled too rather than left for the user to pick again.
  const [preferredTime, setPreferredTime] = useState<string | null>(preselectedSlot?.time ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [bookingResult, setBookingResult] = useState<AppointmentResponse | null>(null);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        calendarWrapperRef.current &&
        !calendarWrapperRef.current.contains(event.target as Node)
      ) {
        setIsCalendarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Patient dropdown options
  const [patients, setPatients] = useState<PatientRecord[]>(
    preselectedPatient ? [preselectedPatient] : [],
  );

  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<EmployeeRecord[]>([]);

  // Available time slots
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [findingNearestDate, setFindingNearestDate] = useState(false);

  // True when the selected doctor has no schedule on the selected date at the
  // selected branch (backend returns an empty slots array in that case) or the
  // slots request itself failed - shown as "Doctor is not assigned for this day".
  const [doctorUnavailable, setDoctorUnavailable] = useState(false);
  const [slotsCancelled, setSlotsCancelled] = useState(false);

  // The selected doctor's active weekly schedules (from employeeApi.getOne) -
  // used to derive which weekdays they actually work at the selected branch,
  // so the calendar only enables those dates.
  const [doctorSchedules, setDoctorSchedules] = useState<DoctorScheduleRecord[]>([]);

  // Doctors actually assigned to the currently selected branch -- used to
  // narrow the Department and Doctor dropdowns down to what's actually
  // available at that branch, once a branch is picked.
  const [branchDoctors, setBranchDoctors] = useState<EmployeeRecord[]>([]);
  const [branchDoctorsLoading, setBranchDoctorsLoading] = useState(false);

  // Tracks the three master-data fetches below (branches, departments,
  // doctors) so the form can stay in a loading state until all of them have
  // resolved -- arriving via a Day View slot click pre-fills branchId/
  // departmentId/doctorId before these lists exist, and rendering the
  // dropdowns against empty lists in the meantime would show them as blank
  // instead of the preselected value.
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loadingDoctors, setLoadingDoctors] = useState(true);

  useEffect(() => {
    branchApi
      .getAll()
      .then((res) => {
        if (res.data?.data) setBranches(res.data.data);
        else if (Array.isArray(res.data)) setBranches(res.data as unknown as Branch[]);
      })
      .catch(() => {})
      .finally(() => setLoadingBranches(false));
  }, []);

  useEffect(() => {
    departmentApi
      .getAll()
      .then((res) => {
        if (res.data?.data) setDepartments(res.data.data);
        else if (Array.isArray(res.data)) setDepartments(res.data as unknown as Department[]);
      })
      .catch(() => {})
      .finally(() => setLoadingDepartments(false));
  }, []);

  useEffect(() => {
    employeeApi
      .getAll({ limit: 1000 })
      .then((res) => {
        const allEmployees = res.data?.data?.employees || [];
        const activeDoctors = allEmployees.filter(
          (e) => e.user_table?.role_type === "DOCTOR" && e.emp_status !== false,
        );
        setDoctors(activeDoctors);
      })
      .catch(() => {})
      .finally(() => setLoadingDoctors(false));
  }, []);

  // True while any of branches/departments/doctors is still loading -- the
  // whole form (including a preselected slot's branch/department/doctor)
  // stays behind a loader until all three are ready.
  const isLoadingMasterData = loadingBranches || loadingDepartments || loadingDoctors;

  // Fetch the doctors of the selected branch. The backend computes each
  // doctor's per-branch, per-date status (`doctor_status`) when a date is
  // passed, and scopes the list to the branch's active user_branch_mapping
  // entries -- so this list is the source of truth for who can actually
  // take an appointment at this branch on the selected day.
  useEffect(() => {
    if (!formData.branchId) {
      setBranchDoctors([]);
      setBranchDoctorsLoading(false);
      return;
    }
    setBranchDoctorsLoading(true);
    employeeApi
      .getAll({
        branchId: formData.branchId,
        limit: 1000,
        ...(formData.selectDate ? { date: formData.selectDate } : {}),
      })
      .then((res) => {
        const allEmployees = res.data?.data?.employees || [];
        setBranchDoctors(allEmployees.filter((e) => e.user_table?.role_type === "DOCTOR"));
        setBranchDoctorsLoading(false);
      })
      .catch(() => {
        setBranchDoctors([]);
        setBranchDoctorsLoading(false);
      });
  }, [formData.branchId, formData.selectDate]);

  // The already-selected doctor is always kept in the list, even when the
  // date-aware fetch above excludes them (e.g. no active schedule on the new
  // date) -- so picking a doctor first, a preselected slot, or a date change
  // never makes them vanish from the dropdown. Availability is still guarded
  // by the slots API, which returns an empty list for such doctors.
  useEffect(() => {
    if (!formData.branchId || !formData.doctorId) return;
    const selected = doctors.find((doc) => doc.employee_id === formData.doctorId);
    if (!selected) return;
    setBranchDoctors((prev) =>
      prev.some((doc) => doc.employee_id === formData.doctorId)
        ? prev
        : [...prev, selected],
    );
  }, [branchDoctors, doctors, formData.branchId, formData.doctorId]);

  // Fetch available slots when branch + doctor + date changes
  useEffect(() => {
    if (!formData.doctorId || !formData.branchId || !formData.selectDate) {
      setAvailableSlots([]);
      setDoctorUnavailable(false);
      return;
    }

    setLoadingSlots(true);
    setDoctorUnavailable(false);
    setFormData((prev) => ({ ...prev, timeSlot: "" }));
    let cancelled = false;

    (async () => {
      setLoadingSlots(true);
      setFormData((prev) => ({ ...prev, timeSlot: "" }));

      let openSlots: AvailableSlot[] = [];
      let fetchError: any = null;

      try {
        const res = await appointmentApi.getAvailableSlots(
          formData.doctorId,
          formData.branchId,
          formData.selectDate,
          { includePast: true },
        );
        const slots = res.data.data?.slots || [];
        const isCancelled = res.data.data?.is_cancelled ?? false;
        setSlotsCancelled(isCancelled);
        setAvailableSlots(slots.filter((s) => s.is_available));
        // Empty slots array = the backend found no active schedule for this
        // doctor/branch/date (a fully-booked day still returns slot entries).
        setDoctorUnavailable(slots.length === 0 && !isCancelled);
        openSlots = slots.filter((s) => s.is_available);
      } catch (error) {
        fetchError = error;
        setAvailableSlots([]);
        setDoctorUnavailable(true);
        setSlotsCancelled(false);
      }

      if (cancelled) return;

      // A Day View "New slot available" cell decides an hour is bookable from
      // the doctor_schedule row alone (day-of-week + time overlap) -- it
      // doesn't re-check everything this endpoint does (active branch
      // mapping, a fully-booked shift, etc). When that disagreement leaves
      // this exact doctor/branch/date with no real slots (empty list, or the
      // request itself rejected), search forward the same way picking a
      // doctor from the dropdown already does, instead of dead-ending with
      // an empty slot list and nothing to highlight.
      if ((fetchError || openSlots.length === 0) && preferredTime) {
        setFindingNearestDate(true);
        const nextDate = await findNearestAvailableDate(
          formData.doctorId,
          formData.branchId,
          formData.selectDate,
          maxSelectableDate,
        );
        setFindingNearestDate(false);

        if (cancelled) return;

        if (nextDate && nextDate !== formData.selectDate) {
          setFormData((prev) => ({ ...prev, selectDate: nextDate }));
          setLoadingSlots(false);
          return;
        }

        toast({
          title: "No available slots",
          description: fetchError
            ? fetchError?.response?.data?.message || fetchError.message || "Something went wrong"
            : "This doctor has no open slots this week or next week at this branch.",
          variant: "destructive",
        });
        setPreferredTime(null);
        setAvailableSlots([]);
        setLoadingSlots(false);
        return;
      }

      if (fetchError) {
        setAvailableSlots([]);
        toast({
          title: "Could not load available time slots",
          description: fetchError?.response?.data?.message || fetchError.message || "Something went wrong",
          variant: "destructive",
        });
        setLoadingSlots(false);
        return;
      }

      setAvailableSlots(openSlots);

      if (preferredTime && openSlots.length > 0) {
        // Prefer an exact match to the clicked hour. Day View's grid can
        // show an hour as "available" (it shows a doctor's whole shift)
        // that this real slot list no longer has -- e.g. an already-elapsed
        // hour on today's date, which the backend correctly excludes, or
        // slots at that hour that are all booked. Instead of falling back
        // to the nearest other slot (which left the grid ending at e.g.
        // 4:40 PM when the user picked 5:00 PM), keep the picked time in
        // the list so the slots extend up to what was selected and it stays
        // highlighted.
        const preferredMinutes = timeStringToMinutes(preferredTime);
        const exact = openSlots.find((s) => timeStringToMinutes(s.time) === preferredMinutes);
        const isToday = formData.selectDate === format(new Date(), "yyyy-MM-dd");
        const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
        const preferredIsPast = isToday && preferredMinutes <= nowMinutes;

        if (exact) {
          setFormData((prev) => ({ ...prev, timeSlot: exact.time }));
        } else if (!preferredIsPast) {
          // Day View can show an hour as "available" (it deliberately
          // displays the doctor's whole shift) that this real slot list no
          // longer has -- e.g. it's fully booked. Keep the picked time in
          // the list so the slots extend up to what was selected and it
          // stays highlighted. Not done when the picked hour has already
          // elapsed today -- the backend will never accept booking the
          // past, so pinning it here would just offer a slot that can
          // never actually be confirmed.
          setAvailableSlots((prev) => [
            ...prev,
            { schedule_id: "DAY_VIEW_SLOT", shift_name: "", time: preferredTime, is_available: true },
          ]);
          setFormData((prev) => ({ ...prev, timeSlot: preferredTime }));
        }
      }
      if (preferredTime) setPreferredTime(null);
      setLoadingSlots(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [formData.doctorId, formData.branchId, formData.selectDate]);

  // Load the full patient list once for the Patient dropdown.
  useEffect(() => {
    patientApi
      .getAll({ limit: 1000 })
      .then((res) => {
        const fetched = res.data.data?.patients || [];
        // Guarantee the preselected patient (arriving via nav state) is in
        // the options list even if it isn't among the first 1000 returned.
        if (preselectedPatient && !fetched.some((p) => p.patient_id === preselectedPatient.patient_id)) {
          setPatients([preselectedPatient, ...fetched]);
        } else {
          setPatients(fetched);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectPatient = (patientId: string) => {
    const patient = patients.find((p) => p.patient_id === patientId);
    if (!patient) return;
    setFormData((prev) => ({
      ...prev,
      patientId: patient.patient_id,
      patientName:
        `${patient.patient_first_name}${patient.patient_middle_name ? ` ${patient.patient_middle_name}` : ""}${patient.patient_last_name ? ` ${patient.patient_last_name}` : ""}`,
      patientNumber: patient.patient_primary_mobile || "",
    }));
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const required: RequiredField<keyof AppointmentFormData>[] = [
      { key: "patientId", label: "Patient" },
      { key: "patientName", label: "Patient Name" },
      { key: "branchId", label: "Branch" },
      { key: "departmentId", label: "Department" },
      { key: "doctorId", label: "Doctor Name" },
      { key: "patientType", label: "Patient Type" },
      { key: "selectDate", label: "Appointment Date" },
      { key: "timeSlot", label: "Available Time Slots" },
    ];
    if (!validateRequiredFields(required, formData, toast)) return;

    setShowConfirm(true);
  };

  const handleConfirmCreate = async () => {
    setSubmitting(true);
    try {
      const res = await appointmentApi.create({
        patient_id: formData.patientId,
        patient_name: formData.patientName,
        patient_number: formData.patientNumber,
        branch_id: formData.branchId,
        department_id: formData.departmentId,
        employee_id: formData.doctorId,
        appointment_date: formData.selectDate,
        appointment_time: formData.timeSlot,
        reason_for_visit: formData.patientComment || undefined,
        patient_type: formData.patientType || undefined,
      });

      setShowConfirm(false);
      setBookingResult(res.data.data);
    } catch (error: any) {
      toast({
        title: "Failed to create appointment",
        description: error?.response?.data?.message || error.message || "Something went wrong",
        variant: "destructive",
      });
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBookingDone = () => {
    setBookingResult(null);
    navigate("/appointments");
  };

  const handleCancel = () => {
    if (isDirty) {
      setShowLeaveConfirm(true);
      return;
    }
    navigate(-1);
  };

  const isDirty = Boolean(
    formData.patientId ||
      formData.patientName ||
      formData.branchId ||
      formData.departmentId ||
      formData.doctorId ||
      formData.timeSlot ||
      formData.patientType ||
      formData.patientComment
);
  
  // Once a branch is selected, only show departments that branch's (date-aware)
  // doctor list actually belongs to; otherwise fall back to the full list.
  const departmentsForDropdown = formData.branchId
    ? departments.filter((d) =>
        branchDoctors.some((doc) => doc.department_id === d.department_id),
      )
    : departments;

  // Once a branch is selected, only show that branch's doctors; either way,
  // further narrow down to the selected department, if one is chosen. With a
  // branch AND a date selected, only doctors whose backend-computed status
  // for that exact branch+date is ACTIVE are offered (plus the currently
  // selected doctor, who is always kept visible).
  const doctorsForDropdown = (formData.branchId ? branchDoctors : doctors).filter(
    (doc) =>
      (!formData.departmentId || doc.department_id === formData.departmentId) &&
      (formData.branchId && formData.selectDate
        ? true
        : true),
  );

  const selectedDoctor = doctors.find((doc) => doc.employee_id === formData.doctorId);
  const selectedDoctorName = selectedDoctor
    ? `Dr. ${selectedDoctor.first_name}${selectedDoctor.middle_name ? ` ${selectedDoctor.middle_name}` : ""} ${selectedDoctor.last_name}`
    : "";

  // Appointment Date is bookable only within exactly 14 days from today --
  // no past dates, nothing beyond the two-week window.
  const minSelectableDate = format(new Date(), "yyyy-MM-dd");
  const maxSelectableDate = format(addDays(new Date(), 14), "yyyy-MM-dd");

  // Weekdays (MONDAY..SUNDAY) the selected doctor actually works at the
  // selected branch, derived from their active schedules. null = no doctor or
  // branch chosen yet, so the calendar stays fully enabled. An EMPTY set =
  // the doctor is assigned to the branch but has no schedule for it -- every
  // date is then disabled, exactly like any other non-working day.
  const workingWeekdays = useMemo(() => {
    if (!formData.doctorId || !formData.branchId) return null;
    const days = new Set(
      doctorSchedules
        .filter(
          (s) =>
            s.branch_id === formData.branchId &&
            s.is_active !== false &&
            Boolean(s.day_of_week),
        )
        .map((s) => s.day_of_week as string),
    );
    return days;
  }, [doctorSchedules, formData.doctorId, formData.branchId]);

  const isDateDisabled = (date: Date) => {
    if (!formData.doctorId || !formData.branchId) return false;
    if (workingWeekdays.size === 0) return true;
    return !workingWeekdays.has(format(date, "EEEE").toUpperCase());
  };

  // Shared by the Doctor dropdown's onValueChange and the doctor-preselect
  // effect below -- looks up the doctor's real specialization/department and
  // their actual mapped branches (via employeeApi.getOne), then finds the
  // nearest date they have an open slot.
  const applyDoctorSelection = (val: string) => {
    const selectedDoctor = doctors.find((doc) => doc.employee_id === val);

    const specialization = selectedDoctor?.specialization?.trim().toLowerCase();
    const matchedDepartment = specialization
      ? departments.find((d) => d.department_name.trim().toLowerCase() === specialization)
      : undefined;

    setFormData((prev) => ({
      ...prev,
      doctorId: val,
      departmentId: prev.departmentId ? prev.departmentId : (matchedDepartment?.department_id || selectedDoctor?.department_id),
      timeSlot: "",
    }));

    if (!val) return;

    setFindingNearestDate(true);

    employeeApi
      .getOne(val)
      .then((res) => {
        const mappedBranches = activeBranches(res.data?.data?.branches || []);
        setDoctorSchedules(res.data?.data?.doctorSchedules || []);
        const nextBranchId =
          mappedBranches.find((b) => b.branch_id === formData.branchId)?.branch_id ||
          mappedBranches[0]?.branch_id;

        setFormData((prev) => ({
          ...prev,
          branchId: prev.branchId ? prev.branchId : nextBranchId,
        }));

        // Use the effective branchId: user's existing branch if set, otherwise the doctor's mapped branch
        const effectiveBranchId = formData.branchId || nextBranchId;

        if (!effectiveBranchId) return null;

        return findNearestAvailableDate(val, effectiveBranchId, formData.selectDate, maxSelectableDate);
      })
      .catch(() => {
        // Doctor lookup failed (backend hiccup etc.) -- fall back to their
        // primary branch so the doctor-first flow still auto-fills a branch
        // and finds a date; the slots API validates the real mapping.
        const fallbackBranchId = selectedDoctor?.branch_id || formData.branchId;
        if (!fallbackBranchId) return null;
        setFormData((prev) => ({ ...prev, branchId: fallbackBranchId }));
        return findNearestAvailableDate(val, fallbackBranchId, formData.selectDate, maxSelectableDate);
      })
      .then((date) => {
        if (date) {
          setFormData((prev) => ({ ...prev, selectDate: date, timeSlot: "" }));
        } else if (date === null) {
          toast({
            title: "No available date found",
            description: "This doctor has no open slots this week or next week at their branch.",
            variant: "destructive",
          });
        }
      })
      .finally(() => setFindingNearestDate(false));
  };

  // Arrived from a doctor's profile page with a doctor already chosen --
  // run the same selection logic as picking them from the dropdown, once
  // the doctor list has loaded (needed to resolve their specialization).
  useEffect(() => {
    if (!preselectedDoctorId || doctors.length === 0) return;
    applyDoctorSelection(preselectedDoctorId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedDoctorId, doctors]);

  // Arrived from a Day View grid slot with doctor/branch/department/date all
  // already decided -- only the doctor's schedules still need loading so the
  // calendar disables non-working days the same way the dropdown flow does,
  // without re-running applyDoctorSelection (which would overwrite the exact
  // branch/date the clicked cell stood for).
  useEffect(() => {
    if (!preselectedSlot) return;
    employeeApi
      .getOne(preselectedSlot.doctorId)
      .then((res) => setDoctorSchedules(res.data?.data?.doctorSchedules || []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedSlot]);

  return (
    <div className="min-h-screen bg-[#F7F9FB] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="w-full bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="px-8 py-6 border-b border-gray-100 flex items-center gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="p-2 rounded-xl hover:bg-gray-50 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </button>
            <div className="p-2.5 bg-blue-50 rounded-xl flex items-center justify-center">
              <CalendarPlus className="w-5 h-5 text-blue-600" />
            </div>
            <h4 className="hms-heading text-gray-900 tracking-tight">
              Create Appointment
            </h4>
          </div>

          {isLoadingMasterData ? (
            <div className="flex flex-col items-center justify-center gap-2 py-24 text-gray-400 text-sm">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              Loading branches, departments and doctors...
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-6 gap-y-6">
              {/* Patient Select */}
              <div className="lg:col-span-3">
                <label className={labelClass}>Select Patient {requiredStar}</label>
                <FormDropdown
                  className={inputClass}
                  options={patients.map((p) => ({
                    label: `${p.patient_id} - ${p.patient_first_name}${p.patient_middle_name ? ` ${p.patient_middle_name}` : ""}${p.patient_last_name ? ` ${p.patient_last_name}` : ""}${p.patient_primary_mobile ? ` (${p.patient_primary_mobile})` : ""}`,
                    value: p.patient_id,
                  }))}
                  value={formData.patientId}
                  onValueChange={selectPatient}
                  placeholder={patients.length ? "Search and select a patient" : "Loading patients..."}
                />
              </div>

              {/* Patient ID (read-only after selection) */}
              <div>
                <label className={labelClass}>Patient ID {requiredStar}</label>
                <input
                  type="text"
                  className={inputClass + " bg-gray-50 text-gray-500"}
                  value={formData.patientId}
                  readOnly
                  placeholder="Search and select a patient"
                />
              </div>

              {/* Patient Name (read-only after selection) */}
              <div>
                <label className={labelClass}>Patient Name {requiredStar}</label>
                <input
                  type="text"
                  className={inputClass + " bg-gray-50 text-gray-500"}
                  value={formData.patientName}
                  readOnly
                  placeholder="Auto-filled from selection"
                />
              </div>

              {/* Patient Number (read-only after selection) */}
              <div>
                <label className={labelClass}>Patient Number</label>
                <input
                  type="text"
                  className={inputClass + " bg-gray-50 text-gray-500"}
                  value={formData.patientNumber}
                  readOnly
                  placeholder="Auto-filled from selection"
                />
              </div>

              {/* Branch, Department, Doctor */}
              <div>
                <label className={labelClass}>Branch {requiredStar}</label>
                <FormDropdown
                  className={inputClass}
                  options={[
                    { label: "None", value: "" },
                    ...branches.map((b) => ({
                      label: `${b.branch_id}${b.branch_name ? ` - ${b.branch_name}` : ""}`,
                      value: b.branch_id,
                      highlight: currentBranchId ? b.branch_id === currentBranchId : false,
                      badge: currentBranchId && b.branch_id === currentBranchId ? "Your branch" : undefined,
                    })),
                  ]}

                  value={formData.branchId}
                  onValueChange={(val) => {
                    if (!val) {
                      setFormData((prev) => ({
                        ...prev,
                        branchId: "",
                        departmentId: "",
                        doctorId: "",
                        timeSlot: "",
                      }));
                      return;
                    }
                    // With a doctor already chosen, switching to a branch the
                    // doctor isn't mapped to keeps the doctor, department and
                    // date exactly as they were, and only reloads the slots
                    // for the new branch (the slots effect below refetches on
                    // branch change). Only when no doctor is picked yet does
                    // a branch change reset department/doctor, since their
                    // options depend on the branch.
                    const doctorLocked = Boolean(formData.doctorId);
                    setFormData((prev) => ({
                      ...prev,
                      branchId: val,
                      departmentId: doctorLocked ? prev.departmentId : "",
                      doctorId: doctorLocked ? prev.doctorId : "",
                      timeSlot: "",
                    }));

                    if (!val || !doctorLocked) return;
                  }}
                  placeholder={
                    branches.length
                      ? "Select Branch"
                      : "Loading branches..."
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Department {requiredStar}</label>
                <FormDropdown
                  className={inputClass}
                  options={[
                    { label: "None", value: "" },
                    ...departmentsForDropdown.map((d) => ({
                      label: d.department_name,
                      value: d.department_id,
                    })),
                  ]}
                  value={formData.departmentId}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, departmentId: val, doctorId: "", timeSlot: "" }))
                  }
                  placeholder={
                    branchDoctorsLoading
                      ? "Loading departments..."
                      : formData.branchId && departmentsForDropdown.length === 0
                        ? "No departments at this branch"
                        : departments.length
                          ? "Select Department"
                          : "Loading departments..."
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Doctor Name {requiredStar}</label>
                <FormDropdown
                  className={inputClass}
                  options={[
                    { label: "None", value: "" },
                    ...doctorsForDropdown.map((doc) => {
                      const fullName = `Dr. ${doc.first_name}${doc.middle_name ? ` ${doc.middle_name}` : ""} ${doc.last_name}`;
                      const specialty = doc.specialization || doc.department_master?.department_name;
                      const statusLabel =
                        doc.doctor_status === "LEAVE" ? " (On Leave)" : "";
                      return {
                        label: `${fullName}${statusLabel}${specialty ? ` (${specialty})` : ""}`,
                        value: doc.employee_id,
                      };
                    }),
                  ]}
                  value={formData.doctorId}
                  onValueChange={applyDoctorSelection}
                  placeholder={
                    formData.branchId && doctorsForDropdown.length === 0
                      ? "No doctors available for this date (including on leave)"
                      : "No doctors match this branch/department"
                  }
                />
              </div>

              {/* Patient Type */}
              <div>
                <label className={labelClass}>Patient Type {requiredStar}</label>
                <FormDropdown
                  className={inputClass}
                  options={[
                    "Outpatient (OPD)",
                    "Inpatient (IPD)",
                    "Emergency",
                    "Day-care",
                    "Corporate",
                    "Insurance",
                    "Referral",
                  ]}
                  value={formData.patientType}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, patientType: val }))}
                  placeholder="Select patient type"
                />
              </div>

              {/* Select Date */}
              <div>
                <label className={labelClass}>
                  Appointment Date {requiredStar}
                  {findingNearestDate && (
                    <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-gray-400 normal-case">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Finding nearest available date...
                    </span>
                  )}
                </label>

                <div className="relative" ref={calendarWrapperRef}>
                  {/* Fake input that just displays the date */}
                  <button
                    type="button"
                    onClick={() => setIsCalendarOpen(false)}
                    className="w-full flex items-center justify-between rounded-xl border border-gray-200 px-4 py-2.5 text-left cursor-default bg-white text-sm text-gray-900"
                  >
                    <span>{format(parseISO(formData.selectDate), "dd-MM-yyyy")}</span>
                  </button>

                  {/* Calendar icon - the ONLY trigger */}
                  <button
                    type="button"
                    onClick={() => setIsCalendarOpen((prev) => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                    aria-label="Open calendar"
                  >
                    <CalendarIcon className="w-4 h-4 text-gray-500" />
                  </button>

                  {isCalendarOpen && (
                    <div className="absolute z-50 mt-2">
                      <CalendarPicker
                        theme="light"
                        hideThemePicker
                        selected={parseISO(formData.selectDate)}
                        minDate={new Date()}
                        maxDate={addDays(new Date(), 14)}
                        isDateDisabled={isDateDisabled}
                        onSelect={(date) => {
                          if (date instanceof Date) {
                            setFormData((prev) => ({
                              ...prev,
                              selectDate: format(date, "yyyy-MM-dd"),
                              timeSlot: "",
                            }));
                            setIsCalendarOpen(false);
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Available Time Slots */}
              <div className="lg:col-span-3 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className={labelClass}>Available Time Slots {requiredStar}</label>
                  <div className="flex items-center gap-1 text-gray-400">
                    {loadingSlots && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span className="text-[10px] font-bold uppercase tracking-wide">
                      {loadingSlots ? "Loading slots..." : "Select a time slot"}
                    </span>
                  </div>
                </div>
                {!formData.doctorId || !formData.branchId || !formData.selectDate ? (
                  <div className="col-span-full py-8 text-center text-sm text-gray-400 bg-gray-50 rounded-xl">
                    Select a branch, doctor and date to see available time slots
                  </div>
                ) : loadingSlots || findingNearestDate ? (
                  <div className="col-span-full py-8 text-center text-sm text-gray-400 bg-gray-50 rounded-xl flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading available slots...
                  </div>
                ) : doctorUnavailable && slotsCancelled ? (
                  <div className="col-span-full py-8 text-center text-sm text-gray-400 bg-gray-50 rounded-xl">
                    Doctor is unavailable on this date (marked as cancelled)
                  </div>
                ) : doctorUnavailable ? (
                  <div className="col-span-full py-8 text-center text-sm text-gray-400 bg-gray-50 rounded-xl">
                    Doctor is not assigned for this day
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="col-span-full py-8 text-center text-sm text-gray-400 bg-gray-50 rounded-xl">
                    <input
                      type="time"
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          timeSlot: e.target.value,
                        }))
                      }
                      placeholder="Select a time"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {[...availableSlots]
                      .sort((a, b) => timeStringToMinutes(a.time) - timeStringToMinutes(b.time))
                      .map((slot) => (
                      <button
                        key={`${slot.schedule_id}-${slot.time}`}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, timeSlot: slot.time }))}
                        className={`h-10 text-sm font-bold rounded-lg transition-all duration-200 ${
                          formData.timeSlot === slot.time
                            ? "bg-blue-600 text-white shadow-md"
                            : "border border-blue-200 text-blue-600 hover:bg-blue-50"
                        }`}
                      >
                        {formatSlotLabel(slot.time)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* SMS Confirmation - Static */}
              <div className="lg:col-span-3">
                <label className={labelClass}>SMS Confirmation</label>
                <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-500">
                  SMS confirmation will be sent to the patient's registered mobile number upon booking.
                </div>
              </div>

              {/* Email Confirmation - Static */}
              <div className="lg:col-span-3">
                <label className={labelClass}>Email Confirmation</label>
                <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-500">
                  Email confirmation will be sent to the patient's registered email address upon booking.
                </div>
              </div>

              {/* Patient Comment / Reason for Visit */}
              <div className="lg:col-span-3">
                <label className={labelClass}>Reason for Visit</label>
                <textarea
                  name="patientComment"
                  rows={4}
                  placeholder="Describe the reason for the visit (optional)"
                  className={inputClass + " resize-none"}
                  value={formData.patientComment}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-4 mt-10 pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={handleCancel}
                disabled={submitting}
                className="w-full sm:w-auto px-8 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-8 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 shadow-[0_4px_14px_0_rgba(37,99,235,0.2)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.3)] group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90" />
                )}
                {submitting ? "Creating..." : "Confirm Appointment"}
              </button>
            </div>
          </form>
          )}
        </div>
      </div>

      <ConfirmationDialog
        open={showConfirm}
        onConfirm={handleConfirmCreate}
        onCancel={() => setShowConfirm(false)}
        type="question"
        title="Confirm Appointment"
        description="Are you sure you want to book this appointment?"
        confirmText="Yes"
        cancelText="No"
        loading={submitting}
      />

      <ConfirmationDialog
        open={showLeaveConfirm}
        type="info"
        title="Leave this page?"
        description="You have unsaved changes. If you leave now, your changes will be lost."
        confirmText="Leave"
        cancelText="Stay"
        onConfirm={() => {
          setShowLeaveConfirm(false);
          navigate(-1);
        }}
        onCancel={() => setShowLeaveConfirm(false)}
      />

      <ConfirmationDialog
        open={Boolean(bookingResult)}
        onConfirm={handleBookingDone}
        onCancel={handleBookingDone}
        hideCancelButton
        type="success"
        title="Appointment Booked"
        description={
          bookingResult ? (
            <div className="w-full min-w-[300px] sm:min-w-[340px] rounded-xl bg-gray-50 border border-gray-100 p-4 text-left text-sm">
              <div className="flex items-center justify-between gap-6 py-1">
                <span className="shrink-0 text-gray-500">Patient</span>
                <span className="text-right font-semibold text-gray-900">{formData.patientName || "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-6 py-1">
                <span className="shrink-0 text-gray-500">Patient ID</span>
                <span className="text-right font-semibold text-gray-900">{bookingResult.patient_id}</span>
              </div>
              <div className="flex items-center justify-between gap-6 py-1">
                <span className="shrink-0 text-gray-500">Appointment ID</span>
                <span className="text-right font-semibold text-gray-900">{bookingResult.appointment_id}</span>
              </div>
              <div className="flex items-center justify-between gap-6 py-1">
                <span className="shrink-0 text-gray-500">Date</span>
                <span className="text-right font-semibold text-gray-900">
                  {format(parseISO(bookingResult.appointment_date), "EEE, MMM d, yyyy")}
                </span>
              </div>
              <div className="flex items-center justify-between gap-6 py-1">
                <span className="shrink-0 text-gray-500">Time</span>
                <span className="text-right font-semibold text-gray-900">
                  {formatSlotLabel(bookingResult.appointment_time)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-6 py-1">
                <span className="shrink-0 text-gray-500">Doctor</span>
                <span className="text-right font-semibold text-gray-900">{selectedDoctorName || "-"}</span>
              </div>
            </div>
          ) : null
        }
        confirmText="Done"
      />
    </div>
  );
}
