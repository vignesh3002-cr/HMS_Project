import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { startOfWeek, endOfWeek, addWeeks, format, parseISO } from "date-fns";
import { ArrowLeft, CalendarPlus, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FormDropdown } from "@/components/ui/form-dropdown";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { branchApi, Branch } from "@/api/branch.api";
import { departmentApi, Department } from "@/api/department.api";
import { employeeApi, type EmployeeRecord } from "@/api/employee.api";
import { patientApi, type PatientRecord } from "@/api/patient.api";
import { appointmentApi, type AvailableSlot, type AppointmentResponse } from "@/api/appointment.api";

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

  // Arriving from a doctor's profile (Scheduled.tsx / Day Scheduled.tsx)
  // "Book Appointment" button carries that doctor's id so the form opens
  // with the doctor locked in and their branch/department auto-filled.
  const preselectedDoctorId = (location.state as { doctorId?: string } | null)?.doctorId;

  const [formData, setFormData] = useState<AppointmentFormData>(() => {
    let base = preselectedPatient
      ? {
          ...emptyFormData,
          patientId: preselectedPatient.patient_id,
          patientName: `${preselectedPatient.patient_first_name}${preselectedPatient.patient_middle_name ? ` ${preselectedPatient.patient_middle_name}` : ""}${preselectedPatient.patient_last_name ? ` ${preselectedPatient.patient_last_name}` : ""}`,
          patientNumber: preselectedPatient.patient_primary_mobile || "",
        }
      : emptyFormData;
    if (preselectedDoctorId) base = { ...base, doctorId: preselectedDoctorId };
    return base;
  });
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [bookingResult, setBookingResult] = useState<AppointmentResponse | null>(null);

  // Patient dropdown options
  const [patients, setPatients] = useState<PatientRecord[]>(
    preselectedPatient ? [preselectedPatient] : [],
  );

  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<EmployeeRecord[]>([]);

  // Branches the selected doctor is actually mapped to (via user_branch_mapping) --
  // restricts the Branch dropdown to only that doctor's branches instead of every branch.
  const [doctorBranches, setDoctorBranches] = useState<{ branch_id: string; branch_name: string }[]>([]);

  // Available time slots
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [findingNearestDate, setFindingNearestDate] = useState(false);

  // Doctors actually assigned (via employees.branch_id) to the currently
  // selected branch -- used to narrow the Department and Doctor dropdowns
  // down to what's actually available at that branch, once a branch is picked.
  const [branchDoctors, setBranchDoctors] = useState<EmployeeRecord[]>([]);

  useEffect(() => {
    branchApi
      .getAll()
      .then((res) => {
        if (res.data?.data) setBranches(res.data.data);
        else if (Array.isArray(res.data)) setBranches(res.data as unknown as Branch[]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    departmentApi
      .getAll()
      .then((res) => {
        if (res.data?.data) setDepartments(res.data.data);
        else if (Array.isArray(res.data)) setDepartments(res.data as unknown as Department[]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    employeeApi
      .getAll({ limit: 1000 })
      .then((res) => {
        const allEmployees = res.data?.data?.employees || [];
        setDoctors(allEmployees.filter((e) => e.user_table?.role_type === "DOCTOR"));
      })
      .catch(() => {});
  }, []);

  // Fetch the doctors assigned to the selected branch, so the Department and
  // Doctor dropdowns can be narrowed down to what's actually at that branch.
  useEffect(() => {
    if (!formData.branchId) {
      setBranchDoctors([]);
      return;
    }
    employeeApi
      .getAll({ branchId: formData.branchId, limit: 1000 })
      .then((res) => {
        const allEmployees = res.data?.data?.employees || [];
        setBranchDoctors(allEmployees.filter((e) => e.user_table?.role_type === "DOCTOR"));
      })
      .catch(() => setBranchDoctors([]));
  }, [formData.branchId]);

  // Fetch available slots when branch + doctor + date changes
  useEffect(() => {
    if (!formData.doctorId || !formData.branchId || !formData.selectDate) {
      setAvailableSlots([]);
      return;
    }

    setLoadingSlots(true);
    setFormData((prev) => ({ ...prev, timeSlot: "" }));

    appointmentApi
      .getAvailableSlots(formData.doctorId, formData.branchId, formData.selectDate)
      .then((res) => {
        const slots = res.data.data?.slots || [];
        setAvailableSlots(slots.filter((s) => s.is_available));
      })
      .catch(() => {
        setAvailableSlots([]);
      })
      .finally(() => setLoadingSlots(false));
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

    if (!formData.patientId) {
      toast({ title: "Please select a patient", variant: "destructive" });
      return;
    }
    if (!formData.timeSlot) {
      toast({ title: "Please select a time slot", variant: "destructive" });
      return;
    }

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
    navigate("/dashboard");
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

  // Once a branch is selected, only show departments that branch's doctors
  // actually belong to; otherwise fall back to the full department list.
  const departmentsForDropdown = formData.branchId
    ? departments.filter((d) =>
        branchDoctors.some((doc) => doc.department_id === d.department_id),
      )
    : departments;

  // Once a branch is selected, only show that branch's doctors; either way,
  // further narrow down to the selected department, if one is chosen.
  const doctorsForDropdown = (formData.branchId ? branchDoctors : doctors).filter((doc) =>
    formData.departmentId ? doc.department_id === formData.departmentId : true,
  );

  const selectedDoctor = doctors.find((doc) => doc.employee_id === formData.doctorId);
  const selectedDoctorName = selectedDoctor
    ? `Dr. ${selectedDoctor.first_name}${selectedDoctor.middle_name ? ` ${selectedDoctor.middle_name}` : ""} ${selectedDoctor.last_name}`
    : "";

  // Appointment Date is bookable only within the current week through the
  // end of next week -- no previous-week slots.
  const minSelectableDate = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const maxSelectableDate = format(
    endOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 }),
    "yyyy-MM-dd",
  );

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
      departmentId: matchedDepartment?.department_id || selectedDoctor?.department_id || prev.departmentId,
      timeSlot: "",
    }));

    if (!val) {
      setDoctorBranches([]);
      return;
    }

    setFindingNearestDate(true);

    employeeApi
      .getOne(val)
      .then((res) => {
        const mappedBranches = res.data?.data?.branches || [];
        setDoctorBranches(mappedBranches);
        const nextBranchId =
          mappedBranches.find((b) => b.branch_id === formData.branchId)?.branch_id ||
          mappedBranches[0]?.branch_id ||
          selectedDoctor?.branch_id ||
          formData.branchId;

        if (!nextBranchId) return null;

        setFormData((prev) => ({ ...prev, branchId: nextBranchId }));

        return findNearestAvailableDate(val, nextBranchId, formData.selectDate, maxSelectableDate);
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

          {/* Form Body */}
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
                  options={(formData.doctorId && doctorBranches.length > 0 ? doctorBranches : branches).map(
                    (b) => ({
                      label: `${b.branch_id}${b.branch_name ? ` - ${b.branch_name}` : ""}`,
                      value: b.branch_id,
                    }),
                  )}
                  value={formData.branchId}
                  onValueChange={(val) => {
                    setFormData((prev) => ({
                      ...prev,
                      branchId: val,
                      departmentId: "",
                      doctorId: "",
                      timeSlot: "",
                    }));

                    if (!val || !formData.doctorId) return;

                    setFindingNearestDate(true);
                    findNearestAvailableDate(formData.doctorId, val, formData.selectDate, maxSelectableDate)
                      .then((date) => {
                        if (date) {
                          setFormData((prev) => ({ ...prev, selectDate: date, timeSlot: "" }));
                        } else if (date === null) {
                          toast({
                            title: "No available date found",
                            description: "This doctor has no open slots this week or next week at this branch.",
                            variant: "destructive",
                          });
                        }
                      })
                      .finally(() => setFindingNearestDate(false));
                  }}
                  placeholder={
                    formData.doctorId && doctorBranches.length === 0
                      ? "This doctor has no mapped branches"
                      : branches.length
                        ? "Select Branch"
                        : "Loading branches..."
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Department {requiredStar}</label>
                <FormDropdown
                  className={inputClass}
                  options={departmentsForDropdown.map((d) => ({
                    label: d.department_name,
                    value: d.department_id,
                  }))}
                  value={formData.departmentId}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, departmentId: val, doctorId: "", timeSlot: "" }))
                  }
                  placeholder={
                    formData.branchId && departmentsForDropdown.length === 0
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
                  options={doctorsForDropdown.map((doc) => {
                    const fullName = `Dr. ${doc.first_name}${doc.middle_name ? ` ${doc.middle_name}` : ""} ${doc.last_name}`;
                    const specialty = doc.specialization || doc.department_master?.department_name;
                    return {
                      label: specialty ? `${fullName} (${specialty})` : fullName,
                      value: doc.employee_id,
                    };
                  })}
                  value={formData.doctorId}
                  onValueChange={applyDoctorSelection}
                  placeholder={
                    formData.branchId && doctorsForDropdown.length === 0
                      ? "No doctors match this branch/department"
                      : doctors.length
                        ? "Select Doctor"
                        : "Loading doctors..."
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
                <input
                  type="date"
                  name="selectDate"
                  min={minSelectableDate}
                  max={maxSelectableDate}
                  className={inputClass + " text-gray-500"}
                  value={formData.selectDate}
                  onChange={(e) => {
                    handleInputChange(e);
                    setFormData((prev) => ({ ...prev, timeSlot: "" }));
                  }}
                  required
                />
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
                ) 
                 : (
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {availableSlots.map((slot) => (
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
          navigate("/dashboard");
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
            <div className="w-full rounded-xl bg-gray-50 border border-gray-100 p-4 text-left text-sm">
              <div className="flex items-center justify-between gap-4 py-1">
                <span className="shrink-0 text-gray-500">Patient</span>
                <span className="text-right font-semibold text-gray-900">{formData.patientName || "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-4 py-1">
                <span className="shrink-0 text-gray-500">Patient ID</span>
                <span className="text-right font-semibold text-gray-900">{bookingResult.patient_id}</span>
              </div>
              <div className="flex items-center justify-between gap-4 py-1">
                <span className="shrink-0 text-gray-500">Appointment ID</span>
                <span className="text-right font-semibold text-gray-900">{bookingResult.appointment_id}</span>
              </div>
              <div className="flex items-center justify-between gap-4 py-1">
                <span className="shrink-0 text-gray-500">Date</span>
                <span className="text-right font-semibold text-gray-900">
                  {format(parseISO(bookingResult.appointment_date), "EEE, MMM d, yyyy")}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 py-1">
                <span className="shrink-0 text-gray-500">Time</span>
                <span className="text-right font-semibold text-gray-900">
                  {formatSlotLabel(bookingResult.appointment_time)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 py-1">
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
