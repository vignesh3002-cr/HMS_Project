import { useState, ChangeEvent, FormEvent } from "react";
import { Building2, Plus } from "lucide-react";

// Strongly typed interface for the form state
interface BranchFormData {
  branchCode: string;
  branchName: string;
  state: string;
  district: string;
  licenseNumber: string;
  mobileNumber: string;
  emergencyNumber: string;
  email: string;
  address: string;
  dateOfEstablish: string;
  adminUsername: string;
  password: string;
  confirmPassword: string;
  medicalServices: string;
}

export default function AddBranch() {
  // State initialized with the interface type
  const [formData, setFormData] = useState<BranchFormData>({
    branchCode: "",
    branchName: "",
    state: "",
    district: "",
    licenseNumber: "",
    mobileNumber: "",
    emergencyNumber: "",
    email: "",
    address: "",
    dateOfEstablish: "",
    adminUsername: "",
    password: "",
    confirmPassword: "",
    medicalServices: "",
  });

  // Generic handle change with correct TypeScript typing
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    console.log("Branch Data Submitted:", formData);
    // Add your API call logic here
  };

  const handleReset = () => {
    setFormData({
      branchCode: "",
      branchName: "",
      state: "",
      district: "",
      licenseNumber: "",
      mobileNumber: "",
      emergencyNumber: "",
      email: "",
      address: "",
      dateOfEstablish: "",
      adminUsername: "",
      password: "",
      confirmPassword: "",
      medicalServices: "",
    });
  };

  // Shared input class for consistent styling
  const inputClass =
    "w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200";
  const labelClass = "block text-sm font-semibold text-gray-800 mb-1.5";
  const requiredStar = <span className="text-red-600 ml-0.5">*</span>;

  return (
    <div className="min-h-screen bg-[#F4F6F9] p-6 flex items-start justify-center font-sans">
      {/* Main Card */}
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <h4 className="hms-heading text-gray-900 tracking-tight">
            Add Branch
          </h4>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
            {/* Row 1 - Branch Code, Branch Name */}
            <div>
              <label className={labelClass}>Branch Code {requiredStar}</label>
              <input
                type="text"
                name="branchCode"
                placeholder="Enter Branch Code"
                className={inputClass}
                value={formData.branchCode}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className={labelClass}>Branch Name {requiredStar}</label>
              <input
                type="text"
                name="branchName"
                placeholder="Enter Branch Name"
                className={inputClass}
                value={formData.branchName}
                onChange={handleChange}
              />
            </div>

            {/* Row 2 - State, District */}
            <div>
              <label className={labelClass}>State {requiredStar}</label>
              <select
                name="state"
                className={inputClass + " appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMS41TDYgNi41TDExIDEuNSIgc3Ryb2tlPSIjNkI3MjgwIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+')] bg-no-repeat bg-[length:12px_8px] bg-[center_right_1rem]"}
                value={formData.state}
                onChange={handleChange}
              >
                <option value="">Select State</option>
                <option value="TN">Tamil Nadu</option>
                <option value="KA">Karnataka</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>District {requiredStar}</label>
              <select
                name="district"
                className={inputClass + " appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMS41TDYgNi41TDExIDEuNSIgc3Ryb2tlPSIjNkI3MjgwIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+')] bg-no-repeat bg-[length:12px_8px] bg-[center_right_1rem]"}
                value={formData.district}
                onChange={handleChange}
              >
                <option value="">Select District</option>
                <option value="Chennai">Chennai</option>
                <option value="Coimbatore">Coimbatore</option>
                <option value="Madurai">Madurai</option>
                <option value="Bangalore">Bangalore</option>
                <option value="Mysore">Mysore</option>
              </select>
            </div>

            {/* Row 3 - License Number, Mobile Number, Emergency Number */}
            <div>
              <label className={labelClass}>License Number {requiredStar}</label>
              <input
                type="text"
                name="licenseNumber"
                placeholder="Enter License Number"
                className={inputClass}
                value={formData.licenseNumber}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className={labelClass}>Mobile Number {requiredStar}</label>
              <input
                type="text"
                name="mobileNumber"
                placeholder="Enter Mobile Number"
                className={inputClass}
                value={formData.mobileNumber}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className={labelClass}>Emergency Number {requiredStar}</label>
              <input
                type="text"
                name="emergencyNumber"
                placeholder="Enter Emergency Number"
                className={inputClass}
                value={formData.emergencyNumber}
                onChange={handleChange}
              />
            </div>

            {/* Row 4 - Date of Establish, Email */}
            <div>
              <label className={labelClass}>Date of Establish {requiredStar}</label>
              <input
                type="date"
                name="dateOfEstablish"
                className={inputClass + " text-gray-500"}
                value={formData.dateOfEstablish}
                onChange={handleChange}
              />
            </div>
            <div className="lg:col-span-1">
              <label className={labelClass}>Email {requiredStar}</label>
              <input
                type="email"
                name="email"
                placeholder="Enter Email"
                className={inputClass}
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            {/* Row 5 - Address (full width) */}
            <div className="lg:col-span-3">
              <label className={labelClass}>Address {requiredStar}</label>
              <input
                type="text"
                name="address"
                placeholder="Enter Address"
                className={inputClass}
                value={formData.address}
                onChange={handleChange}
              />
            </div>

            {/* Row 6 - Admin Username, Password, Confirm Password */}
            <div>
              <label className={labelClass}>Admin Username {requiredStar}</label>
              <input
                type="text"
                name="adminUsername"
                placeholder="Enter Admin Username"
                className={inputClass}
                value={formData.adminUsername}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className={labelClass}>Password {requiredStar}</label>
              <input
                type="password"
                name="password"
                placeholder="Enter Password"
                className={inputClass}
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className={labelClass}>Confirm Password {requiredStar}</label>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
                className={inputClass}
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>

            {/* Row 7 - Medical Services (full width) */}
            <div className="lg:col-span-3">
              <label className={labelClass}>Medical Services {requiredStar}</label>
              <textarea
                name="medicalServices"
                rows={2}
                placeholder="Enter Medical Services"
                className={`${inputClass} resize-none`}
                value={formData.medicalServices}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Actions Footer */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-4 mt-10 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={handleReset}
              className="w-full sm:w-auto px-8 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm"
            >
              Reset
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 shadow-[0_4px_14px_0_rgba(37,99,235,0.2)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.3)]"
            >
              <Plus className="w-4 h-4" />
              Add Branch
            </button> 
          </div>
        </form>
      </div>
    </div>
  );
}