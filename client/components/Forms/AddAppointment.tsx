import { useState, useEffect, useRef, ChangeEvent, FormEvent, KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarPlus, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FormDropdown } from "@/components/ui/form-dropdown";
import { branchApi, Branch } from "@/api/branch.api";
import { departmentApi, Department } from "@/api/department.api";
import { employeeApi, type EmployeeRecord } from "@/api/employee.api";

interface AppointmentFormData {
  patientNumber: string;
  patientId: string;
  patientName: string;
  branchId: string;
  departmentId: string;
  doctorId: string;
  selectDate: string;
  smsConfirm: "yes" | "no";
  smsOtp: string[];
  emailConfirm: "yes" | "no";
  emailOtp: string[];
  patientComment: string;
}

const emptyFormData: AppointmentFormData = {
  patientNumber: "",
  patientId: "",
  patientName: "",
  branchId: "",
  departmentId: "",
  doctorId: "",
  selectDate: new Date().toISOString().split("T")[0],
  smsConfirm: "no",
  smsOtp: ["", "", "", "", "", ""],
  emailConfirm: "no",
  emailOtp: ["", "", "", "", "", ""],
  patientComment: "",
};

// Shared styling — matches AddBranch.tsx / Addemployee.tsx / PatientRegistrationForm.tsx.
const inputClass =
  "w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200";
const labelClass = "block text-sm font-semibold text-gray-800 mb-1.5";
const requiredStar = <span className="text-red-600 ml-0.5">*</span>;

export default function AddAppointment() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState<AppointmentFormData>(emptyFormData);
  const [showSmsOtp, setShowSmsOtp] = useState(false);
  const [showEmailOtp, setShowEmailOtp] = useState(false);
  const smsOtpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const emailOtpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<EmployeeRecord[]>([]);

  // Real branch list — same pattern as Addemployee.tsx
  useEffect(() => {
    branchApi
      .getAll()
      .then((res) => {
        if (res.data?.data) setBranches(res.data.data);
        else if (Array.isArray(res.data)) setBranches(res.data as unknown as Branch[]);
      })
      .catch(() => {});
  }, []);

  // Real department list — same pattern as Addemployee.tsx
  useEffect(() => {
    departmentApi
      .getAll()
      .then((res) => {
        if (res.data?.data) setDepartments(res.data.data);
        else if (Array.isArray(res.data)) setDepartments(res.data as unknown as Department[]);
      })
      .catch(() => {});
  }, []);

  // Real doctor list — same employeeApi call Doctor.tsx uses, filtered to DOCTOR role
  useEffect(() => {
    employeeApi
      .getAll()
      .then((res) => {
        const allEmployees = res.data?.data?.employees || [];
        setDoctors(allEmployees.filter((e) => e.user_table?.role_type === "DOCTOR"));
      })
      .catch(() => {});
  }, []);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSmsConfirmChange = (value: "yes" | "no") => {
    setFormData((prev) => ({ ...prev, smsConfirm: value }));
    setShowSmsOtp(value === "yes");
  };

  const handleEmailConfirmChange = (value: "yes" | "no") => {
    setFormData((prev) => ({ ...prev, emailConfirm: value }));
    setShowEmailOtp(value === "yes");
  };

  const handleOtpChange = (index: number, value: string, type: "sms" | "email") => {
    if (value.length > 1) return;

    const otpArray = type === "sms" ? [...formData.smsOtp] : [...formData.emailOtp];
    otpArray[index] = value;

    setFormData((prev) => ({
      ...prev,
      [type === "sms" ? "smsOtp" : "emailOtp"]: otpArray,
    }));

    if (value && index < 5) {
      const refs = type === "sms" ? smsOtpRefs : emailOtpRefs;
      refs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    index: number,
    type: "sms" | "email"
  ) => {
    const refs = type === "sms" ? smsOtpRefs : emailOtpRefs;
    const otp = type === "sms" ? formData.smsOtp : formData.emailOtp;

    if (e.key === "Backspace" && index > 0 && !otp[index]) {
      refs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Appointment Form Data:", formData);
    toast({
      title: "Appointment created (demo)",
      description: "Check the browser console for the payload.",
    });
  };

  const handleCancel = () => navigate(-1);

  return (
    <div className="min-h-screen bg-[#F7F9FB] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Main Card */}
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
              {/* Patient Number, Patient ID, Patient Name */}
              <div>
                <label className={labelClass}>Patient Number {requiredStar}</label>
                <input
                  type="text"
                  name="patientNumber"
                  placeholder="+91 89765 43210"
                  className={inputClass}
                  value={formData.patientNumber}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className={labelClass}>Patient ID {requiredStar}</label>
                  <button
                    type="button"
                    onClick={() => navigate("/patients/add")}
                    className="text-xs font-bold text-blue-600 hover:underline mb-1.5"
                  >
                    + Add New
                  </button>
                </div>
                <input
                  type="text"
                  name="patientId"
                  placeholder="PM-0235"
                  className={inputClass}
                  value={formData.patientId}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Patient Name {requiredStar}</label>
                <input
                  type="text"
                  name="patientName"
                  placeholder="James Wilson"
                  className={inputClass}
                  value={formData.patientName}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* Branch, Department, Doctor Name — real data */}
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

              {/* Select Date */}
              <div>
                <label className={labelClass}>Select Date {requiredStar}</label>
                <input
                  type="date"
                  name="selectDate"
                  className={inputClass + " text-gray-500"}
                  value={formData.selectDate}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* SMS Confirmation */}
              <div className="lg:col-span-3 flex flex-col gap-3">
                <label className={labelClass}>
                  Send appointment confirmation via SMS
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="smsConfirm"
                      checked={formData.smsConfirm === "yes"}
                      onChange={() => handleSmsConfirmChange("yes")}
                      className="w-4 h-4 cursor-pointer accent-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="smsConfirm"
                      checked={formData.smsConfirm === "no"}
                      onChange={() => handleSmsConfirmChange("no")}
                      className="w-4 h-4 cursor-pointer accent-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">No</span>
                  </label>
                </div>

                {showSmsOtp && (
                  <div className="flex flex-col gap-3 p-4 bg-gray-50 rounded-xl">
                    <label className="text-xs font-bold text-blue-600 uppercase tracking-wide">
                      Verify SMS OTP
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {formData.smsOtp.map((digit, index) => (
                        <input
                          key={`sms-${index}`}
                          ref={(el) => {
                            smsOtpRefs.current[index] = el;
                          }}
                          type="text"
                          value={digit}
                          onChange={(e) => handleOtpChange(index, e.target.value, "sms")}
                          onKeyDown={(e) => handleOtpKeyDown(e, index, "sms")}
                          maxLength={1}
                          className="w-11 h-12 text-center bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Email Confirmation */}
              <div className="lg:col-span-3 flex flex-col gap-3">
                <label className={labelClass}>
                  Send appointment confirmation via Email
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="emailConfirm"
                      checked={formData.emailConfirm === "yes"}
                      onChange={() => handleEmailConfirmChange("yes")}
                      className="w-4 h-4 cursor-pointer accent-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="emailConfirm"
                      checked={formData.emailConfirm === "no"}
                      onChange={() => handleEmailConfirmChange("no")}
                      className="w-4 h-4 cursor-pointer accent-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">No</span>
                  </label>
                </div>

                {showEmailOtp && (
                  <div className="flex flex-col gap-3 p-4 bg-gray-50 rounded-xl">
                    <label className="text-xs font-bold text-blue-600 uppercase tracking-wide">
                      Verify Email OTP
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {formData.emailOtp.map((digit, index) => (
                        <input
                          key={`email-${index}`}
                          ref={(el) => {
                            emailOtpRefs.current[index] = el;
                          }}
                          type="text"
                          value={digit}
                          onChange={(e) => handleOtpChange(index, e.target.value, "email")}
                          onKeyDown={(e) => handleOtpKeyDown(e, index, "email")}
                          maxLength={1}
                          className="w-11 h-12 text-center bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Patient Comment */}
              <div className="lg:col-span-3">
                <label className={labelClass}>Patient Comment/Reason</label>
                <textarea
                  name="patientComment"
                  rows={4}
                  placeholder="Add any additional comments (optional)"
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
                className="w-full sm:w-auto px-8 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 shadow-[0_4px_14px_0_rgba(37,99,235,0.2)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.3)] group"
              >
                <Plus className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90" />
                Confirm Appointment
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
