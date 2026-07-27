import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarPlus, Loader2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FormDropdown } from "@/components/ui/form-dropdown";
import { branchApi, Branch } from "@/api/branch.api";
import { departmentApi, Department } from "@/api/department.api";
import { employeeApi, type EmployeeRecord } from "@/api/employee.api";
import { appointmentApi, type AvailableSlot } from "@/api/appointment.api";

interface AppointmentFormData {
  patientId: string;
  patientName: string;
  patientNumber: string;
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
  branchId: "",
  departmentId: "",
  doctorId: "",
  selectDate: new Date().toISOString().split("T")[0],
  timeSlot: "",
  patientComment: "",
};

// appointment_date/appointment_time come back as UTC-anchored Date/Time
// values (see appointment.utils.ts on the backend), so these must read UTC
// getters directly -- local getters would shift the day/hour in timezones
// behind UTC.
function toDateInputValue(date: string): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toTimeInputValue(time: string): string {
  const t = new Date(time);
  if (isNaN(t.getTime())) return "";
  const hh = String(t.getUTCHours()).padStart(2, "0");
  const mm = String(t.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatSlotLabel(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const ampm = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${h12.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")} ${ampm}`;
}

const inputClass =
  "w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200";
const labelClass = "block text-sm font-semibold text-gray-800 mb-1.5";
const requiredStar = <span className="text-red-600 ml-0.5">*</span>;

// Terminal statuses can't be edited on the backend (see
// TERMINAL_APPOINTMENT_STATUSES in appointment.constants.ts) -- checked here
// too so the user gets a clear message instead of a failed submit.
const TERMINAL_STATUSES = ["COMPLETED", "CANCELLED", "NO_SHOW"];

export default function EditAppointment() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();

  const [formData, setFormData] = useState<AppointmentFormData>(emptyFormData);
  const [loadingAppointment, setLoadingAppointment] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // The appointment's original doctor/branch/date/time -- its own slot is
  // "booked" by itself, so it won't show up in the available-slots list
  // unless the user changes doctor/branch/date; kept so we can still offer
  // it as a selectable option when nothing has changed.
  const [originalSlot, setOriginalSlot] = useState<{
    doctorId: string;
    branchId: string;
    date: string;
    time: string;
  } | null>(null);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<EmployeeRecord[]>([]);

  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

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

  // Load the appointment being edited and prefill the form from it.
  useEffect(() => {
    if (!id) {
      navigate("/appointments");
      return;
    }

    appointmentApi
      .getOne(id)
      .then((res) => {
        const record = res.data?.data;

        if (!record) {
          throw new Error("Appointment not found");
        }

        if (TERMINAL_STATUSES.includes(record.status ?? "")) {
          toast({
            title: "This appointment can't be edited",
            description: `It is already ${record.status?.toLowerCase()}.`,
            variant: "destructive",
          });
          navigate("/appointments");
          return;
        }

        const patient = record.patient_bio_data;
        const date = toDateInputValue(record.appointment_date);
        const time = toTimeInputValue(record.appointment_time);

        setFormData({
          patientId: record.patient_id,
          patientName: patient
            ? [patient.patient_first_name, patient.patient_middle_name, patient.patient_last_name]
                .filter(Boolean)
                .join(" ")
            : "",
          patientNumber: patient?.patient_primary_mobile || "",
          branchId: record.branch_id || "",
          departmentId: record.department_id || "",
          doctorId: record.employee_id || "",
          selectDate: date,
          timeSlot: time,
          patientComment: record.reason_for_visit || "",
        });

        setOriginalSlot({
          doctorId: record.employee_id || "",
          branchId: record.branch_id || "",
          date,
          time,
        });
      })
      .catch((err) => {
        console.error("[Edit Appointment] Load error:", err);
        toast({
          title: "Failed to load appointment",
          description: err.response?.data?.message || "Couldn't reach the appointments API.",
          variant: "destructive",
        });
        navigate("/appointments");
      })
      .finally(() => setLoadingAppointment(false));
  }, [id]);

  // Fetch available slots when branch + doctor + date changes.
  useEffect(() => {
    if (!formData.doctorId || !formData.branchId || !formData.selectDate) {
      setAvailableSlots([]);
      return;
    }

    setLoadingSlots(true);

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

  // The appointment's own current slot blocks itself in the availability
  // check, so surface it as a selectable option whenever nothing has changed
  // yet -- otherwise the user's own existing booking looks "unavailable".
  const isUnchangedSlot =
    !!originalSlot &&
    formData.doctorId === originalSlot.doctorId &&
    formData.branchId === originalSlot.branchId &&
    formData.selectDate === originalSlot.date;

  const slotsToShow =
    isUnchangedSlot && originalSlot?.time && !availableSlots.some((s) => s.time === originalSlot.time)
      ? [
          { schedule_id: "current", shift_name: "Current", time: originalSlot.time, is_available: true },
          ...availableSlots,
        ]
      : availableSlots;

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!id) return;

    if (!formData.timeSlot) {
      toast({ title: "Please select a time slot", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      await appointmentApi.update(id, {
        employee_id: formData.doctorId,
        branch_id: formData.branchId,
        department_id: formData.departmentId || undefined,
        appointment_date: formData.selectDate,
        appointment_time: formData.timeSlot,
        reason_for_visit: formData.patientComment || undefined,
      });

      await appointmentApi.updateStatus(id, "RESCHEDULED");

      toast({
        title: "Appointment rescheduled",
        description: `Appointment ${id} has been rescheduled.`,
      });
      navigate("/appointments");
    } catch (error: any) {
      toast({
        title: "Failed to reschedule appointment",
        description: error?.response?.data?.message || error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => navigate(-1);

  if (loadingAppointment) {
    return (
      <div className="min-h-screen bg-[#F7F9FB] flex items-center justify-center gap-2 text-[#6B7280] text-sm">
        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
        Loading appointment...
      </div>
    );
  }

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
              Edit Appointment
            </h4>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-6 gap-y-6">
              {/* Patient (read-only -- patient can't be changed on an edit) */}
              <div>
                <label className={labelClass}>Patient ID</label>
                <input
                  type="text"
                  className={inputClass + " bg-gray-50 text-gray-500"}
                  value={formData.patientId}
                  readOnly
                />
              </div>

              <div>
                <label className={labelClass}>Patient Name</label>
                <input
                  type="text"
                  className={inputClass + " bg-gray-50 text-gray-500"}
                  value={formData.patientName}
                  readOnly
                />
              </div>

              <div>
                <label className={labelClass}>Patient Number</label>
                <input
                  type="text"
                  className={inputClass + " bg-gray-50 text-gray-500"}
                  value={formData.patientNumber}
                  readOnly
                />
              </div>

              {/* Branch, Department, Doctor */}
              <div>
                <label className={labelClass}>Branch {requiredStar}</label>
                <FormDropdown
                  className={inputClass}
                  options={branches.map((b) => ({
                    label: `${b.branch_id}${b.branch_name ? ` - ${b.branch_name}` : ""}`,
                    value: b.branch_id,
                  }))}
                  value={formData.branchId}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, branchId: val, timeSlot: "" }))}
                  placeholder={branches.length ? "Select Branch" : "Loading branches..."}
                />
              </div>
              <div>
                <label className={labelClass}>Department {requiredStar}</label>
                <FormDropdown
                  className={inputClass}
                  options={departments.map((d) => ({
                    label: d.department_name,
                    value: d.department_id,
                  }))}
                  value={formData.departmentId}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, departmentId: val }))}
                  placeholder={departments.length ? "Select Department" : "Loading departments..."}
                />
              </div>
              <div>
                <label className={labelClass}>Doctor Name {requiredStar}</label>
                <FormDropdown
                  className={inputClass}
                  options={doctors.map((doc) => {
                    const fullName = `Dr. ${doc.first_name}${doc.middle_name ? ` ${doc.middle_name}` : ""} ${doc.last_name}`;
                    const specialty = doc.specialization || doc.department_master?.department_name;
                    return {
                      label: specialty ? `${fullName} (${specialty})` : fullName,
                      value: doc.employee_id,
                    };
                  })}
                  value={formData.doctorId}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, doctorId: val, timeSlot: "" }))}
                  placeholder={doctors.length ? "Select Doctor" : "Loading doctors..."}
                />
              </div>

              {/* Select Date */}
              <div>
                <label className={labelClass}>Appointment Date {requiredStar}</label>
                <input
                  type="date"
                  name="selectDate"
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
                ) : loadingSlots ? (
                  <div className="col-span-full py-8 text-center text-sm text-gray-400 bg-gray-50 rounded-xl flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading available slots...
                  </div>
                ) : slotsToShow.length === 0 ? (
                  <div className="col-span-full py-8 text-center text-sm text-amber-500 bg-amber-50 rounded-xl">
                    No available slots for this doctor on the selected date
                  </div>
                ) : (
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {slotsToShow.map((slot) => (
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
                  <Check className="w-4 h-4" />
                )}
                {submitting ? "Rescheduling..." : "Confirm Appointment"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
