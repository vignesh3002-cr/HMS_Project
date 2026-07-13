import { useState, ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UserRound, Loader2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FormDropdown } from "@/components/ui/form-dropdown";

// Strongly typed interface for the form state.
// Field names mirror the `employees` table columns (see hms-backend/prisma/schema.prisma)
// so every input here has a real column to be saved into.
interface EmployeeFormData {
  userId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  bloodGroup: string;
  nationality: string;
  maritalStatus: string;
  mobileNo: string;
  permanentAddress: string;
  currentAddress: string;
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactNumber: string;
  aadhaarNo: string;
  panNo: string;
  passportNo: string;
  department: string;
  departmentId: string;
  designation: string;
  specialization: string;
  qualification: string;
  docLicenseNo: string;
  joiningDate: string;
  bp: string;
  sugar: string;
  allergies: string;
  chronicDiseases: string;
  medicalHistory: string;
  branchId: string;
  empStatus: string;
  email: string;
}

const emptyFormData: EmployeeFormData = {
  userId: "",
  firstName: "",
  middleName: "",
  lastName: "",
  bloodGroup: "",
  nationality: "",
  maritalStatus: "",
  mobileNo: "",
  permanentAddress: "",
  currentAddress: "",
  emergencyContactName: "",
  emergencyContactRelation: "",
  emergencyContactNumber: "",
  aadhaarNo: "",
  panNo: "",
  passportNo: "",
  department: "",
  departmentId: "",
  designation: "",
  specialization: "",
  qualification: "",
  docLicenseNo: "",
  joiningDate: "",
  bp: "",
  sugar: "",
  allergies: "",
  chronicDiseases: "",
  medicalHistory: "",
  branchId: "",
  empStatus: "",
  email: "",
};

export default function AddEmployee() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  // State initialized with the interface type
  const [formData, setFormData] = useState<EmployeeFormData>(emptyFormData);

  // Generic handle change with correct TypeScript typing
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const requiredFields: { key: keyof EmployeeFormData; label: string }[] = [
      { key: "firstName", label: "First Name" },
      { key: "lastName", label: "Last Name" },
      { key: "mobileNo", label: "Mobile Number" },
      { key: "email", label: "Email" },
      { key: "department", label: "Department" },
      { key: "designation", label: "Designation" },
      { key: "joiningDate", label: "Joining Date" },
      { key: "empStatus", label: "Employee Status" },
    ];

    const missing = requiredFields.find((f) => !formData[f.key].trim());
    if (missing) {
      toast({
        title: "Missing required field",
        description: `Please fill in "${missing.label}".`,
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Static mode – simulate a short delay then show success
      await new Promise((resolve) => setTimeout(resolve, 800));

      toast({
        title: "Employee added",
        description: `${formData.firstName} ${formData.lastName} was added successfully.`,
      });

      navigate(-1);
    } catch {
      toast({
        title: "Failed to add employee",
        description: "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData(emptyFormData);
  };

  // Shared input class for consistent styling
  const inputClass =
    "w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200";
  const labelClass = "block text-sm font-semibold text-gray-800 mb-1.5";
  const requiredStar = <span className="text-red-600 ml-0.5">*</span>;

  return (
    <div className="min-h-screen bg-[#FFFFF] p-6 flex items-start justify-center font-sans">
      {/* Main Card */}
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-gray-50 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div className="p-2.5 bg-blue-50 rounded-xl flex items-center justify-center">
            <UserRound className="w-5 h-5 text-blue-600" />
          </div>
          <h4 className="hms-heading text-gray-900 tracking-tight">
            Add Employee
          </h4>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
            {/* Row 1 - First Name, Middle Name, Last Name */}
            <div>
              <label className={labelClass}>First Name {requiredStar}</label>
              <input
                type="text"
                name="firstName"
                placeholder="Enter First Name"
                className={inputClass}
                value={formData.firstName}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
            <div>
              <label className={labelClass}>Middle Name</label>
              <input
                type="text"
                name="middleName"
                placeholder="Enter Middle Name"
                className={inputClass}
                value={formData.middleName}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
            <div>
              <label className={labelClass}>Last Name {requiredStar}</label>
              <input
                type="text"
                name="lastName"
                placeholder="Enter Last Name"
                className={inputClass}
                value={formData.lastName}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            {/* Row 2 - Blood Group, Nationality, Marital Status */}
            <div>
              <label className={labelClass}>Blood Group</label>
              <FormDropdown
                name="bloodGroup"
                className={inputClass}
                options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]}
                value={formData.bloodGroup}
                onValueChange={(val) =>
                  setFormData((prev) => ({ ...prev, bloodGroup: val }))
                }
                placeholder="Select Blood Group"
                disabled={submitting}
              />
            </div>
            <div>
              <label className={labelClass}>Nationality</label>
              <input
                type="text"
                name="nationality"
                placeholder="Enter Nationality"
                className={inputClass}
                value={formData.nationality}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
            <div>
              <label className={labelClass}>Marital Status</label>
              <FormDropdown
                name="maritalStatus"
                className={inputClass}
                options={["Single", "Married", "Divorced", "Widowed"]}
                value={formData.maritalStatus}
                onValueChange={(val) =>
                  setFormData((prev) => ({ ...prev, maritalStatus: val }))
                }
                placeholder="Select Marital Status"
                disabled={submitting}
              />
            </div>

            {/* Row 3 - Mobile No, Email, Aadhaar No */}
            <div>
              <label className={labelClass}>Mobile Number {requiredStar}</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                name="mobileNo"
                placeholder="Enter Mobile Number"
                className={inputClass}
                value={formData.mobileNo}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
            <div>
              <label className={labelClass}>Email {requiredStar}</label>
              <input
                type="email"
                name="email"
                placeholder="Enter Email"
                className={inputClass}
                value={formData.email}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
            <div>
              <label className={labelClass}>Aadhaar No</label>
              <input
                type="text"
                name="aadhaarNo"
                placeholder="Enter Aadhaar Number"
                className={inputClass}
                value={formData.aadhaarNo}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            {/* Row 4 - PAN No, Passport No, Department */}
            <div>
              <label className={labelClass}>PAN No</label>
              <input
                type="text"
                name="panNo"
                placeholder="Enter PAN Number"
                className={inputClass}
                value={formData.panNo}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
            <div>
              <label className={labelClass}>Passport No</label>
              <input
                type="text"
                name="passportNo"
                placeholder="Enter Passport Number"
                className={inputClass}
                value={formData.passportNo}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
            <div>
              <label className={labelClass}>Department {requiredStar}</label>
              <input
                type="text"
                name="department"
                placeholder="Enter Department"
                className={inputClass}
                value={formData.department}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            {/* Row 5 - Designation, Specialization, Qualification */}
            <div>
              <label className={labelClass}>Designation {requiredStar}</label>
              <input
                type="text"
                name="designation"
                placeholder="Enter Designation"
                className={inputClass}
                value={formData.designation}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
            <div>
              <label className={labelClass}>Specialization</label>
              <input
                type="text"
                name="specialization"
                placeholder="Enter Specialization"
                className={inputClass}
                value={formData.specialization}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
            <div>
              <label className={labelClass}>Qualification</label>
              <input
                type="text"
                name="qualification"
                placeholder="Enter Qualification"
                className={inputClass}
                value={formData.qualification}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            {/* Row 6 - Doc License No, Joining Date, Employee Status */}
            <div>
              <label className={labelClass}>Doctor License No</label>
              <input
                type="text"
                name="docLicenseNo"
                placeholder="Enter License Number"
                className={inputClass}
                value={formData.docLicenseNo}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
            <div>
              <label className={labelClass}>Joining Date {requiredStar}</label>
              <input
                type="date"
                name="joiningDate"
                className={inputClass + " text-gray-500"}
                value={formData.joiningDate}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
            <div>
              <label className={labelClass}>Employee Status {requiredStar}</label>
              <FormDropdown
                name="empStatus"
                className={inputClass}
                options={["Active", "Inactive"]}
                value={formData.empStatus}
                onValueChange={(val) =>
                  setFormData((prev) => ({ ...prev, empStatus: val }))
                }
                placeholder="Select Status"
                disabled={submitting}
              />
            </div>

            {/* Row 7 - BP, Sugar, Branch ID */}
            <div>
              <label className={labelClass}>BP</label>
              <input
                type="text"
                name="bp"
                placeholder="e.g. 120/80"
                className={inputClass}
                value={formData.bp}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
            <div>
              <label className={labelClass}>Sugar</label>
              <input
                type="text"
                name="sugar"
                placeholder="Enter Sugar Level"
                className={inputClass}
                value={formData.sugar}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
            <div>
              <label className={labelClass}>Branch</label>
              <input
                type="text"
                name="branchId"
                placeholder="Enter Branch ID"
                className={inputClass}
                value={formData.branchId}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            {/* Row 8 - Emergency Contact Name, Relation, Number */}
            <div>
              <label className={labelClass}>Emergency Contact Name</label>
              <input
                type="text"
                name="emergencyContactName"
                placeholder="Enter Contact Name"
                className={inputClass}
                value={formData.emergencyContactName}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
            <div>
              <label className={labelClass}>Emergency Contact Relation</label>
              <input
                type="text"
                name="emergencyContactRelation"
                placeholder="e.g. Spouse, Parent"
                className={inputClass}
                value={formData.emergencyContactRelation}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
            <div>
              <label className={labelClass}>Emergency Contact Number</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                name="emergencyContactNumber"
                placeholder="Enter Contact Number"
                className={inputClass}
                value={formData.emergencyContactNumber}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            {/* Row 9 - Permanent Address, Current Address (full width each) */}
            <div className="lg:col-span-3">
              <label className={labelClass}>Permanent Address</label>
              <input
                type="text"
                name="permanentAddress"
                placeholder="Enter Permanent Address"
                className={inputClass}
                value={formData.permanentAddress}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
            <div className="lg:col-span-3">
              <label className={labelClass}>Current Address</label>
              <input
                type="text"
                name="currentAddress"
                placeholder="Enter Current Address"
                className={inputClass}
                value={formData.currentAddress}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            {/* Row 10 - Allergies, Chronic Diseases (full width each) */}
            <div className="lg:col-span-3">
              <label className={labelClass}>Allergies</label>
              <textarea
                name="allergies"
                rows={2}
                placeholder="Enter Known Allergies"
                className={`${inputClass} resize-none`}
                value={formData.allergies}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
            <div className="lg:col-span-3">
              <label className={labelClass}>Chronic Diseases</label>
              <textarea
                name="chronicDiseases"
                rows={2}
                placeholder="Enter Chronic Diseases"
                className={`${inputClass} resize-none`}
                value={formData.chronicDiseases}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            {/* Row 11 - Medical History (full width) */}
            <div className="lg:col-span-3">
              <label className={labelClass}>Medical History</label>
              <textarea
                name="medicalHistory"
                rows={3}
                placeholder="Enter Medical History"
                className={`${inputClass} resize-none`}
                value={formData.medicalHistory}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
          </div>

          {/* Actions Footer */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-4 mt-10 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={handleReset}
              disabled={submitting}
              className="w-full sm:w-auto px-8 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-8 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 shadow-[0_4px_14px_0_rgba(37,99,235,0.2)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.3)] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {submitting ? "Adding Employee..." : "Add Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}