import { useState, useEffect, useRef, ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarPlus, Plus, Search, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FormDropdown } from "@/components/ui/form-dropdown";
import { branchApi, Branch } from "@/api/branch.api";
import { departmentApi, Department } from "@/api/department.api";
import { employeeApi, type EmployeeRecord } from "@/api/employee.api";
import { patientApi, type PatientRecord } from "@/api/patient.api";
import { appointmentApi, type AvailableSlot } from "@/api/appointment.api";

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
  selectDate: new Date().toISOString().split("T")[0],
  timeSlot: "",
  patientComment: "",
};

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

export default function AddAppointment() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState<AppointmentFormData>(emptyFormData);
  const [submitting, setSubmitting] = useState(false);

  // Patient search
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<PatientRecord[]>([]);
  const [searchingPatient, setSearchingPatient] = useState(false);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const patientSearchRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<EmployeeRecord[]>([]);

  // Available time slots
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

  // Patient search with debounce
  const handlePatientSearch = (value: string) => {
    setPatientSearch(value);
    setShowPatientDropdown(true);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (value.trim().length < 2) {
      setPatientResults([]);
      return;
    }

    searchTimeout.current = setTimeout(() => {
      setSearchingPatient(true);
      patientApi
        .getAll({ search: value, limit: 10 })
        .then((res) => {
          setPatientResults(res.data.data?.patients || []);
        })
        .catch(() => {
          setPatientResults([]);
        })
        .finally(() => setSearchingPatient(false));
    }, 300);
  };

  const selectPatient = (patient: PatientRecord) => {
    setFormData((prev) => ({
      ...prev,
      patientId: patient.patient_id,
      patientName:
        `${patient.patient_first_name}${patient.patient_middle_name ? ` ${patient.patient_middle_name}` : ""}${patient.patient_last_name ? ` ${patient.patient_last_name}` : ""}`,
      patientNumber: patient.patient_primary_mobile || "",
    }));
    setPatientSearch(
      `${patient.patient_id} - ${patient.patient_first_name}${patient.patient_last_name ? ` ${patient.patient_last_name}` : ""}`
    );
    setShowPatientDropdown(false);
  };

  const clearPatient = () => {
    setFormData((prev) => ({
      ...prev,
      patientId: "",
      patientName: "",
      patientNumber: "",
    }));
    setPatientSearch("");
    setPatientResults([]);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (patientSearchRef.current && !patientSearchRef.current.contains(e.target as Node)) {
        setShowPatientDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.patientId) {
      toast({ title: "Please select a patient", variant: "destructive" });
      return;
    }
    if (!formData.timeSlot) {
      toast({ title: "Please select a time slot", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      await appointmentApi.create({
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

      toast({
        title: "Appointment created",
        description: "The appointment has been scheduled successfully.",
      });
      navigate("/appointments");
    } catch (error: any) {
      toast({
        title: "Failed to create appointment",
        description: error?.response?.data?.message || error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => navigate(-1);

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
              {/* Patient Search */}
              <div className="lg:col-span-3 relative" ref={patientSearchRef}>
                <label className={labelClass}>Search Patient {requiredStar}</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by patient ID, name, or mobile..."
                    className={inputClass + " pl-10 pr-10"}
                    value={patientSearch}
                    onChange={(e) => handlePatientSearch(e.target.value)}
                    onFocus={() => {
                      if (patientResults.length > 0) setShowPatientDropdown(true);
                    }}
                  />
                  {patientSearch && (
                    <button
                      type="button"
                      onClick={clearPatient}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {searchingPatient && (
                    <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
                  )}
                </div>

                {showPatientDropdown && patientResults.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {patientResults.map((p) => (
                      <button
                        key={p.patient_id}
                        type="button"
                        onClick={() => selectPatient(p)}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                      >
                        <div className="text-sm font-semibold text-gray-900">
                          {p.patient_first_name}{p.patient_middle_name ? ` ${p.patient_middle_name}` : ""}{p.patient_last_name ? ` ${p.patient_last_name}` : ""}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {p.patient_id}{p.patient_primary_mobile ? ` | ${p.patient_primary_mobile}` : ""}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
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
                  options={branches.map((b) => ({
                    label: `${b.branch_id}${b.branch_name ? ` - ${b.branch_name}` : ""}`,
                    value: b.branch_id,
                  }))}
                  value={formData.branchId}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, branchId: val }))}
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
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, doctorId: val }))}
                  placeholder={doctors.length ? "Select Doctor" : "Loading doctors..."}
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
                <label className={labelClass}>Appointment Date {requiredStar}</label>
                <input
                  type="date"
                  name="selectDate"
                  className={inputClass + " text-gray-500"}
                  value={formData.selectDate}
                  onChange={handleInputChange}
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
                ) : availableSlots.length === 0 ? (
                  <div className="col-span-full py-8 text-center text-sm text-amber-500 bg-amber-50 rounded-xl">
                    No available slots for this doctor on the selected date
                  </div>
                ) : (
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
    </div>
  );
}
