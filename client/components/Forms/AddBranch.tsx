import { useState, ChangeEvent, FormEvent } from "react";
import { Building2, Plus } from "lucide-react";

// Strongly typed interface for the form state
interface BranchFormData {
  branchId: string;
  branchType: string;
  branchName: string;
  email: string;
  address: string;
  state: string;
  contactNumber: string;
  country: string;
  branchCode: string;
  licenseNumber: string;
  emergencyNumber: string;
  dateOfEstablish: string;
  adminUsername: string;
  password: string;
  consultationRooms: string;
  createdBy: string;
  branchStatus: string;
  medicalServices: string;
  liveStatus: string;
}

export default function AddBranch() {
  // State initialized with the interface type
  const [formData, setFormData] = useState<BranchFormData>({
    branchId: "",
    branchType: "",
    branchName: "",
    email: "",
    address: "",
    state: "",
    contactNumber: "",
    country: "",
    branchCode: "",
    licenseNumber: "",
    emergencyNumber: "",
    dateOfEstablish: "",
    adminUsername: "",
    password: "",
    consultationRooms: "",
    createdBy: "",
    branchStatus: "",
    medicalServices: "",
    liveStatus: "",
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
      branchId: "",
      branchType: "",
      branchName: "",
      email: "",
      address: "",
      state: "",
      contactNumber: "",
      country: "",
      branchCode: "",
      licenseNumber: "",
      emergencyNumber: "",
      dateOfEstablish: "",
      adminUsername: "",
      password: "",
      consultationRooms: "",
      createdBy: "",
      branchStatus: "",
      medicalServices: "",
      liveStatus: "",
    });
  };

  // Shared input class for consistent styling
  const inputClass =
    "w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200";
  const labelClass = "block text-sm font-bold text-gray-800 mb-1.5";
  const requiredStar = <span className="text-red-500 ml-0.5">*</span>;

  return (
    <div className="min-h-screen bg-[#F4F6F9] p-6 flex items-start justify-center font-sans">
      {/* Main Card */}
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
            Add Branch
          </h1>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
            {/* Row 1 */}
            <div>
              <label className={labelClass}>Branch ID {requiredStar}</label>
              <input
                type="text"
                name="branchId"
                placeholder="Branch ID"
                className={inputClass}
                value={formData.branchId}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className={labelClass}>Branch Type {requiredStar}</label>
              <select
                name="branchType"
                className={
                  inputClass +
                  " appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMS41TDYgNi41TDExIDEuNSIgc3Ryb2tlPSIjNkI3MjgwIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+')] bg-no-repeat bg-[length:12px_8px] bg-[center_right_1rem]"
                }
                value={formData.branchType}
                onChange={handleChange}
              >
                <option value="">Select Branch Type</option>
                <option value="Main">Main</option>
                <option value="Sub">Sub</option>
              </select>
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

            {/* Row 2 - Email full width */}
            <div>
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
            <div className="lg:col-span-2">
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

            {/* Row 3 */}
            <div>
              <label className={labelClass}>State Name {requiredStar}</label>
              <select
                name="state"
                className={
                  inputClass +
                  " appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMS41TDYgNi41TDExIDEuNSIgc3Ryb2tlPSIjNkI3MjgwIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+')] bg-no-repeat bg-[length:12px_8px] bg-[center_right_1rem]"
                }
                value={formData.state}
                onChange={handleChange}
              >
                <option value="">Select State</option>
                <option value="TN">Tamil Nadu</option>
                <option value="KA">Karnataka</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Contact Number {requiredStar}</label>
              <input
                type="text"
                name="contactNumber"
                placeholder="Enter Number"
                className={inputClass}
                value={formData.contactNumber}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className={labelClass}>Country {requiredStar}</label>
              <select
                name="country"
                className={
                  inputClass +
                  " appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMS41TDYgNi41TDExIDEuNSIgc3Ryb2tlPSIjNkI3MjgwIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+')] bg-no-repeat bg-[length:12px_8px] bg-[center_right_1rem]"
                }
                value={formData.country}
                onChange={handleChange}
              >
                <option value="">Select Country</option>
                <option value="IN">India</option>
                <option value="US">USA</option>
              </select>
            </div>

            {/* Row 4 */}
            <div>
              <label className={labelClass}>Branch Code {requiredStar}</label>
              <input
                type="text"
                name="branchCode"
                placeholder="Enter Code"
                className={inputClass}
                value={formData.branchCode}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className={labelClass}>License Number {requiredStar}</label>
              <input
                type="text"
                name="licenseNumber"
                placeholder="Enter Number"
                className={inputClass}
                value={formData.licenseNumber}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className={labelClass}>Emergency Number {requiredStar}</label>
              <input
                type="text"
                name="emergencyNumber"
                placeholder="Enter Number"
                className={inputClass}
                value={formData.emergencyNumber}
                onChange={handleChange}
              />
            </div>

            {/* Row 5 */}
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
            <div>
              <label className={labelClass}>Admin User name {requiredStar}</label>
              <input
                type="text"
                name="adminUsername"
                placeholder="Enter Code"
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

            {/* Row 6 */}
            <div>
              <label className={labelClass}>Consultation Rooms {requiredStar}</label>
              <input
                type="text"
                name="consultationRooms"
                placeholder="Enter Room"
                className={inputClass}
                value={formData.consultationRooms}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className={labelClass}>Created By {requiredStar}</label>
              <input
                type="text"
                name="createdBy"
                placeholder="Enter created"
                className={inputClass}
                value={formData.createdBy}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className={labelClass}>Branch Status {requiredStar}</label>
              <select
                name="branchStatus"
                className={
                  inputClass +
                  " appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMS41TDYgNi41TDExIDEuNSIgc3Ryb2tlPSIjNkI3MjgwIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+')] bg-no-repeat bg-[length:12px_8px] bg-[center_right_1rem]"
                }
                value={formData.branchStatus}
                onChange={handleChange}
              >
                <option value="">Select Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Row 7 - Medical Services (2 cols) + Live Status (1 col) */}
            <div className="lg:col-span-2">
              <label className={labelClass}>Medical Services {requiredStar}</label>
              <textarea
                name="medicalServices"
                rows={1}
                placeholder="Enter Medical Services"
                className={`${inputClass} resize-none`}
                value={formData.medicalServices}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className={labelClass}>Live {requiredStar}</label>
              <select
                name="liveStatus"
                className={
                  inputClass +
                  " appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMS41TDYgNi41TDExIDEuNSIgc3Ryb2tlPSIjNkI3MjgwIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+')] bg-no-repeat bg-[length:12px_8px] bg-[center_right_1rem]"
                }
                value={formData.liveStatus}
                onChange={handleChange}
              >
                <option value="">Select Status</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
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