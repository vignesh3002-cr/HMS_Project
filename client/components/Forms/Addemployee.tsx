import { useState, useEffect, useRef, ChangeEvent, FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, UserRound, Loader2, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FormDropdown } from "@/components/ui/form-dropdown";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { DayOfWeek, WorkingHourPayload, employeeApi } from "@/api/employee.api";
import { branchApi, Branch } from "@/api/branch.api";
import { departmentApi, Department } from "@/api/department.api";

// ---------------------------------------------------------------------------
// Role configuration
// Role options are fetched from the employee API (distinct role_type values
// from the employee records, excluding DOCTOR). Each known role has preset
// options for department / designation / specialization / qualification.
// ---------------------------------------------------------------------------
type RoleType = string;

interface RoleConfig {
  designations: string[];
  specializations: string[];
  qualifications: string[];
  licenseLabel: string;
  licensePlaceholder: string;
  // Explicit flag instead of inferring from empty specializations/qualifications —
  // makes it obvious which roles get those fields without guessing from array length.
  isMedical: boolean;
}

function toDisplayRole(roleType: string): string {
  return roleType
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function toBackendRole(displayRole: string): string {
  return displayRole.toUpperCase().replace(/ /g, "_");
}

const ROLE_CONFIG: Record<string, RoleConfig> = {
  Doctor: {
    designations: [
      "Consultant",
      "Senior Consultant",
      "Resident Doctor",
      "Junior Doctor",
      "Chief Medical Officer",
      "Visiting Doctor",
    ],
    specializations: [
      "Cardiology",
      "Neurology",
      "Orthopedics",
      "Pediatrics",
      "General Medicine",
      "Dermatology",
      "ENT",
      "Gynecology",
      "Psychiatry",
      "Radiology",
      "Anesthesiology",
      "Surgery",
    ],
    qualifications: ["MBBS", "MD", "MS", "DM", "MCh", "BDS", "MDS"],
    licenseLabel: "Doctor License No",
    licensePlaceholder: "Enter Doctor License Number",
    isMedical: true,
  },
  Nurse: {
    designations: [
      "Staff Nurse",
      "Head Nurse",
      "Nursing Supervisor",
      "Nursing Superintendent",
      "ICU Nurse",
      "OT Nurse",
    ],
    specializations: [
      "General Nursing",
      "ICU Care",
      "Pediatric Nursing",
      "Emergency Nursing",
      "OT Nursing",
      "Maternity Care",
    ],
    qualifications: [
      "ANM",
      "GNM",
      "B.Sc Nursing",
      "Post Basic B.Sc Nursing",
      "M.Sc Nursing",
    ],
    licenseLabel: "Nurse Registration No",
    licensePlaceholder: "Enter Nursing Council Registration Number",
    isMedical: true,
  },
  Pharmacist: {
    designations: [
      "Chief Pharmacist",
      "Senior Pharmacist",
      "Pharmacist",
      "Assistant Pharmacist",
    ],
    specializations: [
      "Clinical Pharmacy",
      "Hospital Pharmacy",
      "Retail Pharmacy",
      "Drug Information",
    ],
    qualifications: ["D.Pharm", "B.Pharm", "M.Pharm", "Pharm.D"],
    licenseLabel: "Pharmacist License No",
    licensePlaceholder: "Enter Pharmacist License Number",
    isMedical: true,
  },
  "Lab Technician": {
    designations: [
      "Lab Technician",
      "Senior Lab Technician",
      "Lab Supervisor",
      "Lab Manager",
    ],
    specializations: [
      "Clinical Lab",
      "Microbiology",
      "Pathology",
      "Hematology",
      "Biochemistry",
    ],
    qualifications: ["B.Sc MLT", "M.Sc MLT", "DMLT", "PhD"],
    licenseLabel: "Lab License No",
    licensePlaceholder: "Enter Lab License Number",
    isMedical: true,
  },
  // Non-medical roles — no specialization/qualification/license fields, so
  // those grid cells are skipped entirely (see isMedicalRole) instead of
  // rendering as blank filler boxes.
  Receptionist: {
    designations: [
      "Receptionist",
      "Senior Receptionist",
      "Front Desk Executive",
    ],
    specializations: [],
    qualifications: [],
    licenseLabel: "License No",
    licensePlaceholder: "",
    isMedical: false,
  },
  Staff: {
    designations: [
      "Receptionist",
      "Admin Executive",
      "Accountant",
      "HR Executive",
      "IT Support",
      "Office Manager",
      "Security Officer",
      "Housekeeping Staff",
    ],
    specializations: [],
    qualifications: [],
    licenseLabel: "License No",
    licensePlaceholder: "",
    isMedical: false,
  },
};

// All role types the backend accepts (from employee.types.ts). These serve
// as the authoritative list — the employee API fetch below will merge any
// extras it finds.
const VALID_BACKEND_ROLES = ["DOCTOR", "NURSE", "LAB_TECHNICIAN", "PHARMACIST", "RECEPTIONIST", "STAFF"];

// Sentinel departmentId value meaning "not in the list — user is typing a new one".
const OTHER_DEPARTMENT_VALUE = "__OTHER__";

// ---------------------------------------------------------------------------
// Doctor schedule — a doctor can have any number of time slots (a day can
// repeat, e.g. a morning shift at one branch and an evening shift at another).
// ---------------------------------------------------------------------------
const DAYS_OF_WEEK: { value: DayOfWeek; label: string }[] = [
  { value: "MONDAY", label: "Monday" },
  { value: "TUESDAY", label: "Tuesday" },
  { value: "WEDNESDAY", label: "Wednesday" },
  { value: "THURSDAY", label: "Thursday" },
  { value: "FRIDAY", label: "Friday" },
  { value: "SATURDAY", label: "Saturday" },
  { value: "SUNDAY", label: "Sunday" },
];

// Single-box 12-hour time picker options (every 15 minutes), reusing the same
// searchable FormDropdown used everywhere else instead of separate hh/mm/AM-PM inputs.
const TIME_OPTIONS: { label: string; value: string }[] = (() => {
  const options: { label: string; value: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const period = h < 12 ? "AM" : "PM";
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      options.push({ label: `${hour12}:${String(m).padStart(2, "0")} ${period}`, value });
    }
  }
  return options;
})();

interface ScheduleEntry {
  id: string;
  day_of_week: DayOfWeek | "";
  start_time: string;
  end_time: string;
  branch_id: string;
}

// Shift name isn't entered manually — it's derived from the start time:
// anything before noon is the Morning shift, otherwise Evening.
function deriveShiftName(startTime: string): string {
  const hour = Number(startTime.split(":")[0]);
  return hour < 12 ? "Morning" : "Evening";
}

// Strongly typed interface for the form state.
// Field names mirror the `employees` table columns (see hms-backend/prisma/schema.prisma)
// so every input here has a real column to be saved into.
interface EmployeeFormData {
  userId: string;
  username: string;
  password: string;
  roleType: RoleType;
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
  state: string;
  district: string;
  area: string;
  pincode: string;
  experience: string;
  departmentId: string;
  designation: string;
  specialization: string;
  qualification: string;
  docLicenseNo: string;
  joiningDate: string;
  branchIds: string[];
  email: string;
  photoUrl: string | null;
}

const emptyFormData: EmployeeFormData = {
  userId: "",
  username: "",
  password: "",
  roleType: "",
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
  state: "",
  district: "",
  area: "",
  pincode: "",
  experience: "",
  departmentId: "",
  designation: "",
  specialization: "",
  qualification: "",
  docLicenseNo: "",
  joiningDate: "",
  branchIds: [],
  email: "",
  photoUrl: null,
};

export default function AddEmployee() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // State initialized with the interface type
  const [formData, setFormData] = useState<EmployeeFormData>(emptyFormData);

  // Role options: start with all backend-accepted roles, then merge any
  // extras found in the employee API (so a role *can* exist in the DB and
  // appear here without any frontend code change).
  const [roleOptions, setRoleOptions] = useState<string[]>(() =>
    VALID_BACKEND_ROLES.map(toDisplayRole),
  );
  useEffect(() => {
    employeeApi.getAll().then((res) => {
      const employees = res.data?.data?.employees || [];
      const apiRoles = [...new Set(employees
        .map((e) => e.user_table?.role_type)
        .filter((r): r is string => !!r)
      )];
      const allRoles = [...new Set([...VALID_BACKEND_ROLES, ...apiRoles])].map(toDisplayRole);
      setRoleOptions(allRoles);
      const roleParam = searchParams.get("role");
      if (roleParam) {
        const displayRole = toDisplayRole(roleParam);
        if (allRoles.includes(displayRole)) {
          setFormData((prev) => ({ ...prev, roleType: displayRole }));
        }
      }
    }).catch(() => {
      // API failed — keep the VALID_BACKEND_ROLES list as-is
    });
  }, [searchParams]);

  // Re-typed password — must match before submit is allowed. Username has
  // no confirm field; it's a single required field.
  const [confirmPassword, setConfirmPassword] = useState("");

  // Free-typed department name, used only when departmentId === OTHER_DEPARTMENT_VALUE.
  const [customDepartment, setCustomDepartment] = useState("");

  // Fetch branches on mount for the branch dropdown
  useEffect(() => {
    branchApi
      .getAll()
      .then((res) => {
        if (res.data?.data) setBranches(res.data.data);
        else if (Array.isArray(res.data)) setBranches(res.data as unknown as Branch[]);
      })
      .catch(() => {});
  }, []);

  // Fetch the real department list on mount for the department dropdown
  useEffect(() => {
    departmentApi
      .getAll()
      .then((res) => {
        if (res.data?.data) setDepartments(res.data.data);
        else if (Array.isArray(res.data)) setDepartments(res.data as unknown as Department[]);
      })
      .catch(() => {});
  }, []);

  // Whether the Permanent Address should mirror the Current Address
  const [sameAsCurrent, setSameAsCurrent] = useState(false);

  // Doctor schedule — dynamic list of time slots, only relevant when roleType === "Doctor"
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [consultationMinutes, setConsultationMinutes] = useState("20");
  const nextSlotId = useRef(0);

  const addScheduleEntry = () => {
    const id = `slot-${nextSlotId.current++}`;
    setSchedule((prev) => [
      ...prev,
      { id, day_of_week: "", start_time: "09:00", end_time: "17:00", branch_id: "" },
    ]);
  };

  const removeScheduleEntry = (id: string) => {
    setSchedule((prev) => prev.filter((entry) => entry.id !== id));
  };

  const updateScheduleEntry = (id: string, field: keyof ScheduleEntry, value: string) => {
    setSchedule((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry)),
    );
  };

  // Convenience lookup: the field presets for the currently selected role.
  // When no role is selected yet, dropdown-driven fields fall back to an
  // empty option list and are disabled with a "select role first" hint.
  const roleConfig = formData.roleType ? ROLE_CONFIG[formData.roleType] : null;

  // Driven by the role's own config instead of hardcoding a role name, so any
  // non-medical role (Staff, Receptionist, ...) skips specialization/
  // qualification/license the same way. No role picked yet still defaults to
  // showing those fields (disabled, "select a role first" placeholder).
  const isMedicalRole = roleConfig ? roleConfig.isMedical : true;

  // Divorced employees may not have (or want to list) an emergency contact.
  const emergencyOptional = formData.maritalStatus === "Divorced";

  // Generic handle change with correct TypeScript typing
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const next = { ...prev, [name]: value };

      // Keep Permanent Address mirrored to Current Address while the
      // "Same as Current Address" checkbox is ticked.
      if (name === "currentAddress" && sameAsCurrent) {
        next.permanentAddress = value;
      }

      return next;
    });
  };

  // Changing the role resets the role-specific fields so a stale
  // Doctor designation doesn't linger after switching to Nurse, etc.
  // Multi-branch only makes sense for Doctors, so switching away trims to one.
  const handleRoleChange = (val: string) => {
    const newRole = val as RoleType;
    setFormData((prev) => ({
      ...prev,
      roleType: newRole,
      designation: "",
      specialization: "",
      qualification: "",
      docLicenseNo: "",
      branchIds: newRole === "Doctor" ? prev.branchIds : prev.branchIds.slice(0, 1),
    }));
    if (newRole !== "Doctor") {
      setSchedule([]);
      setConsultationMinutes("20");
    }
  };

  // Toggling the checkbox copies the current address into permanent
  // address immediately; unticking it just unlocks the field again.
  const handleSameAsCurrentToggle = (e: ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setSameAsCurrent(checked);
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        permanentAddress: prev.currentAddress,
      }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Every field is mandatory except Middle Name, Passport No, and (for
    // Divorced employees) the emergency contact fields.
    const requiredFields: { key: Exclude<keyof EmployeeFormData, "branchIds">; label: string }[] = [
      { key: "username", label: "Username" },
      { key: "password", label: "Password" },
      { key: "roleType", label: "Role" },
      { key: "firstName", label: "First Name" },
      { key: "lastName", label: "Last Name" },
      { key: "bloodGroup", label: "Blood Group" },
      { key: "nationality", label: "Nationality" },
      { key: "maritalStatus", label: "Marital Status" },
      { key: "mobileNo", label: "Mobile Number" },
      { key: "email", label: "Email" },
      { key: "aadhaarNo", label: "Aadhaar No" },
      { key: "panNo", label: "PAN No" },
      { key: "state", label: "State" },
      { key: "district", label: "District" },
      { key: "area", label: "Area" },
      { key: "pincode", label: "Pincode" },
      { key: "departmentId", label: "Department" },
      { key: "designation", label: "Designation" },
      ...(isMedicalRole
        ? [
            { key: "specialization" as const, label: "Specialization" },
            { key: "qualification" as const, label: "Qualification" },
            { key: "docLicenseNo" as const, label: "License No" },
          ]
        : []),
      { key: "joiningDate", label: "Joining Date" },
      ...(emergencyOptional
        ? []
        : [
            { key: "emergencyContactName" as const, label: "Emergency Contact Name" },
            { key: "emergencyContactRelation" as const, label: "Emergency Contact Relation" },
            { key: "emergencyContactNumber" as const, label: "Emergency Contact Number" },
          ]),
      { key: "currentAddress", label: "Current Address" },
      { key: "permanentAddress", label: "Permanent Address" },
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

    if (formData.branchIds.length === 0) {
      toast({
        title: "Missing required field",
        description: `Please select at least one "Branch".`,
        variant: "destructive",
      });
      return;
    }

    if (!confirmPassword.trim()) {
      toast({
        title: "Missing required field",
        description: "Please confirm your Password.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Password and Confirm Password do not match.",
        variant: "destructive",
      });
      return;
    }

    if (formData.departmentId === OTHER_DEPARTMENT_VALUE && !customDepartment.trim()) {
      toast({
        title: "Missing required field",
        description: 'Please type a department name for "Others".',
        variant: "destructive",
      });
      return;
    }

    if (formData.roleType === "Doctor") {
      const incompleteSlot = schedule.find((entry) => !entry.day_of_week);
      if (incompleteSlot) {
        toast({
          title: "Incomplete schedule",
          description: "Please select a day for every schedule time slot.",
          variant: "destructive",
        });
        return;
      }
    }

    setSubmitting(true);

    try {
      // "Others" has no real department_id yet — create it first (existing
      // POST /departments endpoint) and use the id it returns.
      let departmentId = formData.departmentId;
      if (departmentId === OTHER_DEPARTMENT_VALUE) {
        const deptResponse = await departmentApi.create({
          department_name: customDepartment.trim(),
        });
        const created = deptResponse.data.data;
        departmentId = created.department_id;
        setDepartments((prev) => [...prev, created]);
      }

      const workingHours: WorkingHourPayload[] = schedule.map((entry) => ({
        branch_id: formData.branchIds.includes(entry.branch_id)
          ? entry.branch_id
          : formData.branchIds[0],
        day_of_week: entry.day_of_week as DayOfWeek,
        shift_name: deriveShiftName(entry.start_time),
        start_time: entry.start_time,
        end_time: entry.end_time,
      }));

      const response = await employeeApi.create({
        username: formData.username,
        password: formData.password,
        role_type: toBackendRole(formData.roleType) as "DOCTOR" | "NURSE" | "PHARMACIST" | "LAB_TECHNICIAN" | "RECEPTIONIST" | "STAFF",
        first_name: formData.firstName,
        middle_name: formData.middleName || undefined,
        last_name: formData.lastName,
        email: formData.email,
        mobile_no: formData.mobileNo,
        blood_group: formData.bloodGroup,
        nationality: formData.nationality,
        marital_status: formData.maritalStatus,
        aadhaar_no: formData.aadhaarNo,
        pan_no: formData.panNo,
        passport_no: formData.passportNo || undefined,
        permanent_address: formData.permanentAddress,
        current_address: formData.currentAddress,
        emergency_contact_name: formData.emergencyContactName || undefined,
        emergency_contact_relationship: formData.emergencyContactRelation || undefined,
        emergency_contact_number: formData.emergencyContactNumber || undefined,
        department_id: departmentId,
        designation: formData.designation,
        specialization: isMedicalRole ? formData.specialization : undefined,
        qualification: isMedicalRole ? formData.qualification : undefined,
        doc_license_no: isMedicalRole ? formData.docLicenseNo : undefined,
        joining_date: formData.joiningDate,
        emp_status: true,
        branch_ids: formData.branchIds,
        consultation_minutes: Number(consultationMinutes) || 20,
        working_hours: formData.roleType === "Doctor" ? workingHours : undefined,
      });

      if (!response.data.success) {
        throw new Error(response.data.message);
      }

      toast({
        title: "Employee added",
        description: `${formData.firstName} ${formData.lastName} was added successfully.`,
      });

      navigate(-1);
    } catch (error: any) {
      toast({
        title: "Failed to add employee",
        description:
          error.response?.data?.message ?? error.message ?? "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData(emptyFormData);
    setSameAsCurrent(false);
    setSchedule([]);
    setConsultationMinutes("20");
    setConfirmPassword("");
    setCustomDepartment("");
  };

  // Joining date can't be backdated — earliest selectable day is today.
  const todayStr = new Date().toISOString().slice(0, 10);

  // Shared input class for consistent styling
  const inputClass =
    "w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200";
  const disabledInputClass =
    "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 placeholder:text-gray-400 cursor-not-allowed transition-all duration-200";
  const labelClass = "block text-sm font-semibold text-gray-800 mb-1.5";
  const requiredStar = <span className="text-red-600 ml-0.5">*</span>;
  const optionalTag = <span className="text-gray-400 text-xs font-normal">(optional)</span>;

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
          <h4 className="form-heading text-gray-900 tracking-tight">
            Add Employee
          </h4>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-8">
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
            <div className="lg:col-span-3 flex flex-col sm:flex-row items-center sm:items-start gap-14 pb-2">
              <AvatarUpload
                value={formData.photoUrl}
                onChange={(url) => setFormData((prev) => ({ ...prev, photoUrl: url }))}
                label="Employee photo"
                hint="Click or drag an image to upload (Max 1MB)"
                size={128}
              />
              <div
                aria-hidden="true"
                className="hidden sm:block w-px self-stretch bg-gray-200"
              />
              <div className="w-full sm:w-72">
                <label className={labelClass}>Role {requiredStar}</label>
                <FormDropdown
                  name="role"
                  className={inputClass}
                  options={roleOptions}
                  value={formData.roleType}
                  onValueChange={handleRoleChange}
                  placeholder={roleOptions.length ? "Select Role" : "Loading roles..."}
                  disabled={submitting || roleOptions.length === 0}
                />
              </div>
            </div>

            {/* First Name, Middle Name, Last Name */}
            <div>
              <label className={labelClass}>First Name {requiredStar}</label>
              <input
                type="text"
                name="firstName"
                placeholder="Enter First Name"
                maxLength={50}
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
                maxLength={50}
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
                maxLength={50}
                className={inputClass}
                value={formData.lastName}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            {/* Blood Group, Nationality, Marital Status */}
            <div>
              <label className={labelClass}>Blood Group {requiredStar}</label>
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
              <label className={labelClass}>Experience {requiredStar}</label>
              <input
                type="text"
                name="experience"
                placeholder="Enter Experience (in years)"
                maxLength={50}
                className={inputClass}
                value={formData.experience}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
            <div>
              <label className={labelClass}>Nationality {requiredStar}</label>
              <input
                type="text"
                name="nationality"
                placeholder="Enter Nationality"
                maxLength={50}
                className={inputClass}
                value={formData.nationality}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
            <div>
              <label className={labelClass}>Marital Status {requiredStar}</label>
              <FormDropdown
                name="maritalStatus"
                className={inputClass}
                options={["Single", "Married", "Divorced"]}
                value={formData.maritalStatus}
                onValueChange={(val) =>
                  setFormData((prev) => ({ ...prev, maritalStatus: val }))
                }
                placeholder="Select Marital Status"
                disabled={submitting}
              />
            </div>

            {/* State, District, Area, Pincode */}
            <div>
              <label className={labelClass}>State {requiredStar}</label>
              <input
                type="text"
                name="state"
                placeholder="Enter State"
                maxLength={50}
                className={inputClass}
                value={formData.state}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
            <div>
              <label className={labelClass}>District {requiredStar}</label>
              <input
                type="text"
                name="district"
                placeholder="Enter District"
                maxLength={50}
                className={inputClass}
                value={formData.district}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
            <div>
              <label className={labelClass}>Area {requiredStar}</label>
              <input
                type="text"
                name="area"
                placeholder="Enter Area"
                maxLength={50}
                className={inputClass}
                value={formData.area}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
            <div>
              <label className={labelClass}>Pincode {requiredStar}</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                name="pincode"
                placeholder="Enter Pincode"
                maxLength={10}
                className={inputClass}
                value={formData.pincode}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
            <div />
            <div />

            {/* Mobile No, Email, Aadhaar No */}
            <div>
              <label className={labelClass}>Mobile Number {requiredStar}</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                name="mobileNo"
                placeholder="Enter Mobile Number"
                maxLength={15}
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
                maxLength={50}
                className={inputClass}
                value={formData.email}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
            <div>
              <label className={labelClass}>Aadhaar No {requiredStar}</label>
              <input
                type="text"
                name="aadhaarNo"
                placeholder="Enter Aadhaar Number"
                maxLength={20}
                className={inputClass}
                value={formData.aadhaarNo}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            {/* PAN No, Passport No */}
            <div>
              <label className={labelClass}>PAN No {requiredStar}</label>
              <input
                type="text"
                name="panNo"
                placeholder="Enter PAN Number"
                maxLength={20}
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
                maxLength={20}
                className={inputClass}
                value={formData.passportNo}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
            <div />

            {/* --------------------------------------------------------- */}
            {/* Role-based fields — labels, options, and the license      */}
            {/* field all change depending on the selected Role.          */}
            {/* --------------------------------------------------------- */}

            {/* Department (with "Others" + free-text fallback), Designation, Specialization */}
            <div>
              <label className={labelClass}>Department {requiredStar}</label>
              <FormDropdown
                name="departmentId"
                className={inputClass}
                options={[
                  ...departments.map((d) => ({
                    label: d.department_name,
                    value: d.department_id,
                  })),
                  { label: "Others", value: OTHER_DEPARTMENT_VALUE },
                ]}
                value={formData.departmentId}
                onValueChange={(val) => {
                  setFormData((prev) => ({ ...prev, departmentId: val }));
                  if (val !== OTHER_DEPARTMENT_VALUE) setCustomDepartment("");
                }}
                placeholder={departments.length ? "Select Department" : "Loading departments..."}
                disabled={submitting}
              />
              {formData.departmentId === OTHER_DEPARTMENT_VALUE && (
                <input
                  type="text"
                  placeholder="Type your department name"
                  maxLength={100}
                  className={inputClass + " mt-2"}
                  value={customDepartment}
                  onChange={(e) => setCustomDepartment(e.target.value)}
                  disabled={submitting}
                />
              )}
            </div>
            <div>
              <label className={labelClass}>
                {formData.roleType
                  ? `${formData.roleType} Designation`
                  : "Designation"}{" "}
                {requiredStar}
              </label>
              <FormDropdown
                name="designation"
                className={roleConfig ? inputClass : disabledInputClass}
                options={roleConfig ? roleConfig.designations : []}
                value={formData.designation}
                onValueChange={(val) =>
                  setFormData((prev) => ({ ...prev, designation: val }))
                }
                placeholder={
                  roleConfig ? "Select Designation" : "Select a role first"
                }
                disabled={submitting || !roleConfig}
              />
            </div>
<AnimatePresence>
               {isMedicalRole && (
                 <motion.div
                   layout
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   transition={{ duration: 0.25, ease: "easeInOut" }}
                 >
                   <label className={labelClass}>
                     {formData.roleType
                       ? `${formData.roleType} Specialization`
                       : "Specialization"}{" "}
                     {requiredStar}
                   </label>
                   <FormDropdown
                     name="specialization"
                     className={roleConfig ? inputClass : disabledInputClass}
                     options={roleConfig ? roleConfig.specializations : []}
                     value={formData.specialization}
                     onValueChange={(val) =>
                       setFormData((prev) => ({ ...prev, specialization: val }))
                     }
                     placeholder={
                       roleConfig ? "Select Specialization" : "Select a role first"
                     }
                     disabled={submitting || !roleConfig}
                   />
                 </motion.div>
               )}
             </AnimatePresence>

            {/* Qualification, License/Registration No, Joining Date */}
<AnimatePresence>
               {isMedicalRole && (
                 <motion.div
                   layout
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   transition={{ duration: 0.25, ease: "easeInOut" }}
                 >
                   <label className={labelClass}>
                     {formData.roleType
                       ? `${formData.roleType} Qualification`
                       : "Qualification"}{" "}
                     {requiredStar}
                   </label>
                   <FormDropdown
                     name="qualification"
                     className={roleConfig ? inputClass : disabledInputClass}
                     options={roleConfig ? roleConfig.qualifications : []}
                     value={formData.qualification}
                     onValueChange={(val) =>
                       setFormData((prev) => ({ ...prev, qualification: val }))
                     }
                     placeholder={
                       roleConfig ? "Select Qualification" : "Select a role first"
                     }
                     disabled={submitting || !roleConfig}
                   />
                 </motion.div>
               )}
             </AnimatePresence>
<AnimatePresence>
               {isMedicalRole && (
                 <motion.div
                   layout
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   transition={{ duration: 0.25, ease: "easeInOut" }}
                 >
                   <label className={labelClass}>
                     {roleConfig ? roleConfig.licenseLabel : "License No"} {requiredStar}
                   </label>
                   <input
                     type="text"
                     name="docLicenseNo"
                     maxLength={50}
                     placeholder={
                       roleConfig
                         ? roleConfig.licensePlaceholder
                         : "Select a role first"
                     }
                     className={roleConfig ? inputClass : disabledInputClass}
                     value={formData.docLicenseNo}
                     onChange={handleChange}
                     disabled={submitting || !roleConfig}
                   />
                 </motion.div>
               )}
             </AnimatePresence>
            <div>
              <label className={labelClass}>Joining Date {requiredStar}</label>
              <input
                type="date"
                name="joiningDate"
                min={todayStr}
                className={inputClass + " text-gray-500"}
                value={formData.joiningDate}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            {/* Branch — multiple only makes sense for Doctors; every other role picks one */}
            <div>
              <label className={labelClass}>Branch {requiredStar}</label>
              {formData.roleType === "Doctor" ? (
                <MultiSelectDropdown
                  options={branches.map((b) => ({
                    label: `${b.branch_id}${b.branch_name ? ` - ${b.branch_name}` : ""}`,
                    value: b.branch_id,
                  }))}
                  value={formData.branchIds}
                  onValueChange={(vals) =>
                    setFormData((prev) => ({ ...prev, branchIds: vals }))
                  }
                  placeholder={branches.length ? "Select Branch(es)" : "No branches available"}
                  disabled={submitting || branches.length === 0}
                />
              ) : (
                <FormDropdown
                  name="branchId"
                  className={inputClass}
                  options={branches.map((b) => ({
                    label: `${b.branch_id}${b.branch_name ? ` - ${b.branch_name}` : ""}`,
                    value: b.branch_id,
                  }))}
                  value={formData.branchIds[0] ?? ""}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, branchIds: val ? [val] : [] }))
                  }
                  placeholder={branches.length ? "Select Branch" : "No branches available"}
                  disabled={submitting || branches.length === 0}
                />
              )}
            </div>

            {/* Doctor-only — schedule / time slots. Any number of slots per day is
                allowed (e.g. a morning slot at one branch, an evening slot at another).
                A day with no slot simply has no doctor_schedule row (inactive). */}
            <AnimatePresence>
            {formData.roleType === "Doctor" && (
              <motion.div
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                style={{ overflow: "hidden" }}
                className="lg:col-span-3"
              >
                <label className={labelClass}>Schedule / Time Slots</label>

                <div className="mb-4 max-w-xs">
                  <label className={labelClass}>Consultation Minutes {requiredStar}</label>
                  <input
                    type="number"
                    min={1}
                    className={inputClass}
                    value={consultationMinutes}
                    onChange={(e) => setConsultationMinutes(e.target.value)}
                    disabled={submitting}
                  />
                </div>

                {schedule.length === 0 && (
                  <p className="text-sm text-gray-400 mb-3">No time slots added yet.</p>
                )}

                <div className="space-y-3">
                  {schedule.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 p-3"
                    >
                      <div className="w-40">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Day
                        </label>
                        <FormDropdown
                          name={`day-${entry.id}`}
                          className={inputClass}
                          options={DAYS_OF_WEEK}
                          value={entry.day_of_week}
                          onValueChange={(val) =>
                            updateScheduleEntry(entry.id, "day_of_week", val)
                          }
                          placeholder="Select Day"
                          disabled={submitting}
                        />
                      </div>
                      <div className="w-36">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Start Time
                        </label>
                        <FormDropdown
                          name={`start-${entry.id}`}
                          className={inputClass}
                          options={TIME_OPTIONS}
                          value={entry.start_time}
                          onValueChange={(val) =>
                            updateScheduleEntry(entry.id, "start_time", val)
                          }
                          placeholder="Start Time"
                          disabled={submitting}
                        />
                      </div>
                      <div className="w-36">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          End Time
                        </label>
                        <FormDropdown
                          name={`end-${entry.id}`}
                          className={inputClass}
                          options={TIME_OPTIONS}
                          value={entry.end_time}
                          onValueChange={(val) =>
                            updateScheduleEntry(entry.id, "end_time", val)
                          }
                          placeholder="End Time"
                          disabled={submitting}
                        />
                      </div>
                      <div className="w-56">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Branch
                        </label>
                        <FormDropdown
                          name={`branch-${entry.id}`}
                          className={inputClass}
                          options={branches
                            .filter((b) => formData.branchIds.includes(b.branch_id))
                            .map((b) => ({
                              label: `${b.branch_id}${b.branch_name ? ` - ${b.branch_name}` : ""}`,
                              value: b.branch_id,
                            }))}
                          value={entry.branch_id}
                          onValueChange={(val) =>
                            updateScheduleEntry(entry.id, "branch_id", val)
                          }
                          placeholder="Select Branch"
                          disabled={submitting || branches.length === 0}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeScheduleEntry(entry.id)}
                        disabled={submitting}
                        className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50"
                        aria-label="Remove time slot"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addScheduleEntry}
                  disabled={submitting}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" /> Add Time Slot
                </button>
              </motion.div>
            )}
            </AnimatePresence>

            {/* Emergency Contact Name, Relation, Number — optional when Divorced */}
            <div>
              <label className={labelClass}>
                Emergency Contact Name {emergencyOptional ? optionalTag : requiredStar}
              </label>
              <input
                type="text"
                name="emergencyContactName"
                placeholder="Enter Contact Name"
                maxLength={100}
                className={inputClass}
                value={formData.emergencyContactName}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
            <div>
              <label className={labelClass}>
                Emergency Contact Relation {emergencyOptional ? optionalTag : requiredStar}
              </label>
              <input
                type="text"
                name="emergencyContactRelation"
                placeholder="e.g. Spouse, Parent"
                maxLength={50}
                className={inputClass}
                value={formData.emergencyContactRelation}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
            <div>
              <label className={labelClass}>
                Emergency Contact Number {emergencyOptional ? optionalTag : requiredStar}
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                name="emergencyContactNumber"
                placeholder="Enter Contact Number"
                maxLength={15}
                className={inputClass}
                value={formData.emergencyContactNumber}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            {/* Current Address, then "Same as Current" checkbox, then Permanent Address */}
            <div className="lg:col-span-3">
              <label className={labelClass}>Current Address {requiredStar}</label>
              <input
                type="text"
                name="currentAddress"
                placeholder="Enter Current Address"
                maxLength={255}
                className={inputClass}
                value={formData.currentAddress}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            <div className="lg:col-span-3 flex items-center gap-2 -mt-2">
              <input
                type="checkbox"
                id="sameAsCurrent"
                checked={sameAsCurrent}
                onChange={handleSameAsCurrentToggle}
                disabled={submitting}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label
                htmlFor="sameAsCurrent"
                className="text-sm font-medium text-gray-700 cursor-pointer select-none"
              >
                Same as Current Address
              </label>
            </div>

            <div className="lg:col-span-3">
              <label className={labelClass}>Permanent Address {requiredStar}</label>
              <input
                type="text"
                name="permanentAddress"
                placeholder="Enter Permanent Address"
                maxLength={255}
                className={sameAsCurrent ? disabledInputClass : inputClass}
                value={formData.permanentAddress}
                onChange={handleChange}
                disabled={submitting || sameAsCurrent}
              />
            </div>

            {/* Login credentials — kept last on the form; confirm fields catch typos before submit */}
            <div>
              <label className={labelClass}>Username {requiredStar}</label>
              <input
                type="text"
                name="username"
                placeholder="Enter Username"
                maxLength={50}
                className={inputClass}
                value={formData.username}
                onChange={handleChange}
                disabled={submitting}
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
                disabled={submitting}
              />
            </div>
            <div>
              <label className={labelClass}>Confirm Password {requiredStar}</label>
              <input
                type="password"
                placeholder="Re-enter Password"
                className={inputClass}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={submitting}
              />
            </div>
          </motion.div>

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
