import { useState, useEffect, useRef, ChangeEvent, FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, UserRound, Loader2, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FormDropdown } from "@/components/ui/form-dropdown";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { State as CSState, City } from "country-state-city";
import type { IState } from "country-state-city";
import { employeeApi, CreateEmployeePayload, WorkingHourDto } from "@/api/employee.api";
import { branchApi, Branch } from "@/api/branch.api";
import { departmentApi, Department } from "@/api/department.api";
import { AssignableUser } from "@/api/branch.api";

// ─── Types ────────────────────────────────────────────────────────────────────

type BackendRoleType =
  | "DOCTOR"
  | "NURSE"
  | "LAB_TECHNICIAN"
  | "PHARMACIST"
  | "BRANCH_ADMIN";

function toDisplayRole(roleType: BackendRoleType): string {
  if (roleType === "LAB_TECHNICIAN") return "Lab Technician";
  if (roleType === "BRANCH_ADMIN") return "Branch Admin";
  return roleType
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

function toBackendRole(displayRole: string): BackendRoleType {
  if (displayRole === "Lab Technician") return "LAB_TECHNICIAN";
  if (displayRole === "Branch Admin") return "BRANCH_ADMIN";
  return displayRole.toUpperCase().replace(/ /g, "_") as BackendRoleType;
}

const VALID_BACKEND_ROLES: BackendRoleType[] = [
  "DOCTOR",
  "NURSE",
  "LAB_TECHNICIAN",
  "PHARMACIST",
  "BRANCH_ADMIN",
];

const OTHER_DEPARTMENT_VALUE = "__OTHER__";
const ALL_DEPARTMENTS_VALUE = "__ALL__";

const DAYS_OF_WEEK: { value: WorkingHourDto["day_of_week"]; label: string }[] = [
  { value: "MONDAY", label: "Monday" },
  { value: "TUESDAY", label: "Tuesday" },
  { value: "WEDNESDAY", label: "Wednesday" },
  { value: "THURSDAY", label: "Thursday" },
  { value: "FRIDAY", label: "Friday" },
  { value: "SATURDAY", label: "Saturday" },
  { value: "SUNDAY", label: "Sunday" },
];

const TIME_OPTIONS: { label: string; value: string }[] = (() => {
  const options: { label: string; value: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const period = h < 12 ? "AM" : "PM";
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      options.push({
        label: `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`,
        value,
      });
    }
  }
  return options;
})();

interface ScheduleEntry {
  id: string;
  day_of_week: WorkingHourDto["day_of_week"] | "";
  start_time: string;
  end_time: string;
  branch_id: string;
}

function deriveShiftName(startTime: string): string {
  const hour = Number(startTime.split(":")[0]);
  return hour < 12 ? "Morning" : "Evening";
}

interface RoleConfig {
  designations: string[];
  qualifications: string[];
  licenseLabel: string;
  licensePlaceholder: string;
  isMedical: boolean;
  showSchedule: boolean;
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
    qualifications: ["MBBS", "MD", "MS", "DM", "MCh", "BDS", "MDS"],
    licenseLabel: "Doctor license no",
    licensePlaceholder: "Enter doctor license number",
    isMedical: true,
    showSchedule: true,
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
    qualifications: ["ANM", "GNM", "B.Sc Nursing", "Post Basic B.Sc Nursing", "M.Sc Nursing"],
    licenseLabel: "Nurse registration no",
    licensePlaceholder: "Enter nursing council registration number",
    isMedical: true,
    showSchedule: false,
  },
  Pharmacist: {
    designations: [
      "Chief Pharmacist",
      "Senior Pharmacist",
      "Pharmacist",
      "Assistant Pharmacist",
    ],
    qualifications: ["D.Pharm", "B.Pharm", "M.Pharm", "Pharm.D"],
    licenseLabel: "Pharmacist license no",
    licensePlaceholder: "Enter pharmacist license number",
    isMedical: true,
    showSchedule: false,
  },
  "Lab Technician": {
    designations: [
      "Lab Technician",
      "Senior Lab Technician",
      "Lab Supervisor",
      "Lab Manager",
    ],
    qualifications: ["B.Sc MLT", "M.Sc MLT", "DMLT", "PhD"],
    licenseLabel: "Lab license no",
    licensePlaceholder: "Enter lab license number",
    isMedical: true,
    showSchedule: false,
  },
  "Branch Admin": {
    designations: ["Branch Admin"],
    qualifications: [],
    licenseLabel: "License no",
    licensePlaceholder: "",
    isMedical: false,
    showSchedule: false,
  },
};

interface EmployeeFormData {
  username: string;
  password: string;
  roleType: BackendRoleType;
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
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
  username: "",
  password: "",
  roleType: "DOCTOR",
  firstName: "",
  middleName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "",
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

// ─── Shared style tokens ──────────────────────────────────────────────────────

const inputCls =
  "w-full h-10 px-4 bg-white border border-gray-200 rounded-xl text-[13.5px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-[3px] focus:ring-blue-500/15 focus:border-blue-500 transition-all duration-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed";

const labelCls = "block text-[12.5px] font-semibold text-gray-700 mb-1.5";

const Req = () => <span className="text-red-600 ml-0.5">*</span>;
const Opt = () => (
  <span className="text-gray-400 text-[11px] font-normal ml-1">(optional)</span>
);

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-7">
      <h2 className="text-[14px] font-bold text-gray-900 pb-2 mb-1 border-b-2 border-blue-50">
        {title}
      </h2>
      <p className="text-[12px] text-gray-400 mb-4">{sub}</p>
      {children}
    </section>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddEmployee() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [submitting, setSubmitting] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [assignableAdmins, setAssignableAdmins] = useState<AssignableUser[]>([]);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [customDepartment, setCustomDepartment] = useState("");
  const [formData, setFormData] = useState<EmployeeFormData>(emptyFormData);
  const [roleOptions, setRoleOptions] = useState<string[]>(() =>
    VALID_BACKEND_ROLES.map(toDisplayRole),
  );
  const [indianStates, setIndianStates] = useState<IState[]>([]);
  const [districtOptions, setDistrictOptions] = useState<string[]>([]);
  const [sameAsCurrent, setSameAsCurrent] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [consultationMinutes, setConsultationMinutes] = useState("20");
  const nextSlotId = useRef(0);

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  useEffect(() => {
    employeeApi
      .getAll()
      .then((res) => {
        const employees = res.data?.data?.employees || [];
        const apiRoles = [
          ...new Set(
            employees
              .map((e) => e.user_table?.role_type)
              .filter(
                (r): r is BackendRoleType =>
                  !!r && VALID_BACKEND_ROLES.includes(r as BackendRoleType),
              ),
          ),
        ];
        const allRoles = [
          ...new Set([...VALID_BACKEND_ROLES, ...apiRoles].map(toDisplayRole)),
        ];
        setRoleOptions(allRoles);
        const roleParam = searchParams.get("role");
        if (roleParam) {
          const display = toDisplayRole(roleParam as BackendRoleType);
          if (allRoles.includes(display))
            setFormData((p) => ({ ...p, roleType: roleParam as BackendRoleType }));
        }
      })
      .catch(() => {});
  }, [searchParams]);

  useEffect(() => {
    setIndianStates(CSState.getStatesOfCountry("IN"));
  }, []);

  useEffect(() => {
    if (formData.state) {
      const s = indianStates.find((s) => s.name === formData.state);
      if (s)
        setDistrictOptions(
          City.getCitiesOfState("IN", s.isoCode)
            .map((c) => c.name)
            .sort(),
        );
    } else {
      setDistrictOptions([]);
    }
  }, [formData.state, indianStates]);

  useEffect(() => {
    branchApi
      .getAll()
      .then((res) => {
        if (res.data?.data) setBranches(res.data.data);
        else if (Array.isArray(res.data)) setBranches(res.data as unknown as Branch[]);
      })
      .catch(() => {});

    branchApi
      .getAssignableAdmins()
      .then((res) => {
        if (res.data?.success && res.data?.data) setAssignableAdmins(res.data.data);
      })
      .catch(() => {});

    departmentApi
      .getAll()
      .then((res) => {
        if (res.data?.data) setDepartments(res.data.data);
        else if (Array.isArray(res.data))
          setDepartments(res.data as unknown as Department[]);
      })
      .catch(() => {});
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────

  const displayRole = toDisplayRole(formData.roleType);
  const roleConfig = ROLE_CONFIG[displayRole] ?? null;
  const isMedical = roleConfig?.isMedical ?? false;
  const showSchedule = roleConfig?.showSchedule ?? false;
  const emergencyOptional = formData.maritalStatus === "Divorced";
  const todayStr = new Date().toISOString().slice(0, 10);

  const roleHintText = showSchedule
    ? `${displayRole} selected — specialization, qualification, license number and the schedule builder are shown below.`
    : isMedical
    ? `${displayRole} selected — specialization, qualification and license number are shown below.`
    : `${displayRole} selected — designation only, no medical fields required.`;

  const branchOptions = branches.map((b) => {
    const admin = assignableAdmins.find((a) =>
      a.current_branches.includes(b.branch_id),
    );
    const adminLabel = admin
      ? ` - ${admin.full_name} (${admin.employee_id})`
      : b.admin_name
      ? ` - ${b.admin_name}${b.admin_employee_id ? ` (${b.admin_employee_id})` : ""}`
      : "";
    return {
      label: `${b.branch_id}${b.branch_name ? ` - ${b.branch_name}` : ""}${adminLabel}`,
      value: b.branch_id,
    };
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((p) => {
      const next = { ...p, [name]: value };
      if (name === "currentAddress" && sameAsCurrent) next.permanentAddress = value;
      return next;
    });
  };

  const handleRoleChange = (val: string) => {
    const newRole = toBackendRole(val) as BackendRoleType;
    setFormData((p) => ({
      ...p,
      roleType: newRole,
      designation: newRole === "BRANCH_ADMIN" ? "Branch Admin" : "",
      specialization: "",
      departmentId: "",
      qualification: "",
      docLicenseNo: "",
      branchIds: newRole === "DOCTOR" ? p.branchIds : p.branchIds.slice(0, 1),
    }));
    if (newRole !== "DOCTOR") {
      setSchedule([]);
      setConsultationMinutes("20");
    }
  };

  const handleSameAsCurrent = (e: ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setSameAsCurrent(checked);
    if (checked)
      setFormData((p) => ({ ...p, permanentAddress: p.currentAddress }));
  };

  const addSlot = () => {
    const id = `slot-${nextSlotId.current++}`;
    setSchedule((p) => [
      ...p,
      { id, day_of_week: "", start_time: "09:00", end_time: "17:00", branch_id: "" },
    ]);
  };

  const removeSlot = (id: string) =>
    setSchedule((p) => p.filter((s) => s.id !== id));

  const updateSlot = (id: string, field: keyof ScheduleEntry, value: string) =>
    setSchedule((p) =>
      p.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    );

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const required: { key: keyof EmployeeFormData; label: string }[] = [
      { key: "roleType", label: "Role" },
      { key: "firstName", label: "First Name" },
      { key: "lastName", label: "Last Name" },
      { key: "email", label: "Email" },
      { key: "dateOfBirth", label: "Date of Birth" },
      { key: "gender", label: "Gender" },
      { key: "mobileNo", label: "Mobile Number" },
      { key: "designation", label: "Designation" },
      { key: "joiningDate", label: "Joining Date" },
      { key: "username", label: "Username" },
      { key: "password", label: "Password" },
    ];

    const missing = required.find((f) => {
      const v = formData[f.key];
      return Array.isArray(v) ? v.length === 0 : !String(v).trim();
    });
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
        description: 'Please select at least one "Branch".',
        variant: "destructive",
      });
      return;
    }

    if (!confirmPassword.trim()) {
      toast({
        title: "Missing required field",
        description: "Please confirm your password.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Password and confirm password do not match.",
        variant: "destructive",
      });
      return;
    }

    if (formData.roleType === "DOCTOR") {
      const bad = schedule.find((s) => !s.day_of_week);
      if (bad) {
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
      let departmentId = formData.departmentId;

      if (departmentId === ALL_DEPARTMENTS_VALUE) {
        departmentId = departments[0]?.department_id || "";
      } else if (departmentId === OTHER_DEPARTMENT_VALUE) {
        if (!customDepartment.trim()) {
          toast({
            title: "Missing required field",
            description: `Please type a ${isMedical ? "specialization" : "department"} name for "Others".`,
            variant: "destructive",
          });
          setSubmitting(false);
          return;
        }

        const r = await departmentApi.create({
          department_name: customDepartment.trim(),
        });
        const created = r.data.data;
        departmentId = created.department_id;
        setDepartments((p) => [...p, created]);
      }

      if (!departmentId) {
        toast({
          title: "Missing department",
          description:
            "No department selected. Please create or select a department.",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      const workingHours: WorkingHourDto[] = schedule.map((s) => ({
        branch_id: formData.branchIds.includes(s.branch_id)
          ? s.branch_id
          : formData.branchIds[0],
        day_of_week: s.day_of_week as WorkingHourDto["day_of_week"],
        shift_name: deriveShiftName(s.start_time),
        start_time: s.start_time,
        end_time: s.end_time,
      }));

      const response = await employeeApi.create({
        employee_photo_URL: formData.photoUrl || undefined,
        username: formData.username,
        password: formData.password,
        role_type: formData.roleType,
        first_name: formData.firstName,
        middle_name: formData.middleName || undefined,
        last_name: formData.lastName,
        dob: formData.dateOfBirth || undefined,
        gender: formData.gender || undefined,
        email: formData.email,
        mobile_no: formData.mobileNo,
        blood_group: formData.bloodGroup || undefined,
        nationality: formData.nationality || undefined,
        marital_status: formData.maritalStatus || undefined,
        aadhaar_no: formData.aadhaarNo || undefined,
        pan_no: formData.panNo || undefined,
        passport_no: formData.passportNo || undefined,
        permanent_address: formData.permanentAddress || undefined,
        current_address: formData.currentAddress || undefined,
        emergency_contact_name: formData.emergencyContactName || undefined,
        emergency_contact_relationship: formData.emergencyContactRelation || undefined,
        emergency_contact_number: formData.emergencyContactNumber || undefined,
        employee_state: formData.state || undefined,
        employee_district: formData.district || undefined,
        employee_area: formData.area || undefined,
        employee_pincode: formData.pincode ? Number(formData.pincode) : undefined,
        employee_no_experence: formData.experience
          ? Number(formData.experience)
          : undefined,
        department_id: departmentId,
        designation: formData.designation,
        specialization:
          isMedical
            ? formData.departmentId === OTHER_DEPARTMENT_VALUE
              ? customDepartment.trim() || undefined
              : departments.find((d) => d.department_id === departmentId)?.department_name || undefined
            : undefined,
        qualification: formData.qualification || undefined,
        license_no: formData.docLicenseNo || undefined,
        joining_date: formData.joiningDate,
        emp_status: true,
        branch_ids: formData.branchIds,
        consultation_minutes: Number(consultationMinutes) || 20,
        working_hours: formData.roleType === "DOCTOR" ? workingHours : undefined,
      } as CreateEmployeePayload);

      if (!response.data.success) throw new Error(response.data.message);

      toast({
        title: "Employee added",
        description: `${formData.firstName} ${formData.lastName} was added successfully.`,
      });
      navigate(-1);
    } catch (err: any) {
      toast({
        title: "Failed to add employee",
        description:
          err.response?.data?.message ?? err.message ?? "Something went wrong.",
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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100">
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-8 py-5 border-b border-gray-100">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-50 transition-colors text-gray-500"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <UserRound className="w-5 h-5" />
          </div>
          <h4 className="hms-heading text-gray-900 tracking-tight">
            Add Employee
          </h4>
        </div>

        {/* ── Body ── */}
        <form onSubmit={handleSubmit} className="px-8 pt-7 pb-8">

          {/* Photo + Role */}
          <div className="flex items-start gap-10 pb-6 border-b border-gray-100 mb-7">
            <AvatarUpload
              value={formData.photoUrl}
              onChange={(url) => setFormData((p) => ({ ...p, photoUrl: url }))}
              label="Employee photo"
              hint="Click or drag an image to upload (Max 1MB)"
              size={96}
            />
            <div className="w-px self-stretch bg-gray-200" aria-hidden />
            <div className="w-[36rem] max-w-full">
              <label className={labelCls}>
                Role <Req />
              </label>
              <FormDropdown
                name="role"
                className={inputCls}
                options={roleOptions}
                value={displayRole}
                onValueChange={handleRoleChange}
                placeholder={roleOptions.length ? "Select role" : "Loading roles…"}
                disabled={submitting || roleOptions.length === 0}
              />
            </div>
          </div>

          {/* Role hint banner */}
          <div className="text-[11.5px] text-blue-600 bg-blue-50 rounded-lg px-3.5 py-2.5 mb-6">
            {roleHintText}
          </div>

          {/* ── General information ── */}
          <Section
            title="General information"
            sub="Personal details used to identify the employee."
          >
            <div className="grid grid-cols-3 gap-x-5 gap-y-[18px]">
              <div>
                <label className={labelCls}>First name <Req /></label>
                <input
                  name="firstName"
                  placeholder="Enter first name"
                  maxLength={50}
                  className={inputCls}
                  value={formData.firstName}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Middle name</label>
                <input
                  name="middleName"
                  placeholder="Enter middle name"
                  maxLength={50}
                  className={inputCls}
                  value={formData.middleName}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Last name <Req /></label>
                <input
                  name="lastName"
                  placeholder="Enter last name"
                  maxLength={50}
                  className={inputCls}
                  value={formData.lastName}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className={labelCls}>Gender <Req /></label>
                <FormDropdown
                  name="gender"
                  className={inputCls}
                  options={["Male", "Female", "Other"]}
                  value={formData.gender}
                  onValueChange={(v) => setFormData((p) => ({ ...p, gender: v }))}
                  placeholder="Select gender"
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Date of birth <Req /></label>
                <input
                  type="date"
                  name="dateOfBirth"
                  max={todayStr}
                  className={inputCls + " text-gray-500"}
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className={labelCls}>Blood group <Req /></label>
                <FormDropdown
                  name="bloodGroup"
                  className={inputCls}
                  options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]}
                  value={formData.bloodGroup}
                  onValueChange={(v) => setFormData((p) => ({ ...p, bloodGroup: v }))}
                  placeholder="Select blood group"
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Experience (years) <Req /></label>
                <input
                  name="experience"
                  placeholder="Enter experience"
                  maxLength={10}
                  className={inputCls}
                  value={formData.experience}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Nationality <Req /></label>
                <input
                  name="nationality"
                  placeholder="Enter nationality"
                  maxLength={50}
                  className={inputCls}
                  value={formData.nationality}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className={labelCls}>Marital status <Req /></label>
                <FormDropdown
                  name="maritalStatus"
                  className={inputCls}
                  options={["Single", "Married", "Divorced"]}
                  value={formData.maritalStatus}
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, maritalStatus: v }))
                  }
                  placeholder="Select marital status"
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Aadhaar no <Req /></label>
                <input
                  name="aadhaarNo"
                  placeholder="Enter aadhaar number"
                  maxLength={20}
                  className={inputCls}
                  value={formData.aadhaarNo}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>PAN no <Req /></label>
                <input
                  name="panNo"
                  placeholder="Enter PAN number"
                  maxLength={20}
                  className={inputCls}
                  value={formData.panNo}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className={labelCls}>
                  Passport no <Opt />
                </label>
                <input
                  name="passportNo"
                  placeholder="Enter passport number"
                  maxLength={20}
                  className={inputCls}
                  value={formData.passportNo}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Joining date <Req /></label>
                <input
                  type="date"
                  name="joiningDate"
                  max={todayStr}
                  className={inputCls + " text-gray-500"}
                  value={formData.joiningDate}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
            </div>
          </Section>

          {/* ── Address and location ── */}
          <Section
            title="Address and location"
            sub="State, district and residential details."
          >
            <div className="grid grid-cols-3 gap-x-5 gap-y-[18px]">
              <div>
                <label className={labelCls}>State <Req /></label>
                <FormDropdown
                  name="state"
                  className={inputCls}
                  options={indianStates.map((s) => s.name)}
                  value={formData.state}
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, state: v, district: "" }))
                  }
                  placeholder="Select state"
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>District <Req /></label>
                <FormDropdown
                  name="district"
                  className={inputCls}
                  options={districtOptions}
                  value={formData.district}
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, district: v }))
                  }
                  placeholder={formData.state ? "Select district" : "Select state first"}
                  disabled={submitting || !formData.state}
                />
              </div>
              <div>
                <label className={labelCls}>Area <Req /></label>
                <input
                  name="area"
                  placeholder="Enter area"
                  maxLength={50}
                  className={inputCls}
                  value={formData.area}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className={labelCls}>Pincode <Req /></label>
                <input
                  name="pincode"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Enter pincode"
                  maxLength={10}
                  className={inputCls}
                  value={formData.pincode}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>

              <div className="col-span-3">
                <label className={labelCls}>Current address <Req /></label>
                <input
                  name="currentAddress"
                  placeholder="Enter current address"
                  maxLength={255}
                  className={inputCls}
                  value={formData.currentAddress}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>

              <div className="col-span-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sameAsCurrent"
                  checked={sameAsCurrent}
                  onChange={handleSameAsCurrent}
                  disabled={submitting}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="sameAsCurrent"
                  className="text-[13px] text-gray-700 cursor-pointer select-none"
                >
                  Same as permanent address
                </label>
              </div>

              <div className="col-span-3">
                <label className={labelCls}>Permanent address <Req /></label>
                <input
                  name="permanentAddress"
                  placeholder="Enter permanent address"
                  maxLength={255}
                  className={inputCls}
                  value={formData.permanentAddress}
                  onChange={handleChange}
                  disabled={submitting || sameAsCurrent}
                />
              </div>
            </div>
          </Section>

          {/* ── Contact information ── */}
          <Section
            title="Contact information"
            sub="How to reach the employee and in an emergency."
          >
            <div className="grid grid-cols-3 gap-x-5 gap-y-[18px]">
              <div>
                <label className={labelCls}>Mobile number <Req /></label>
                <input
                  name="mobileNo"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Enter mobile number"
                  maxLength={15}
                  className={inputCls}
                  value={formData.mobileNo}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Email <Req /></label>
                <input
                  type="email"
                  name="email"
                  placeholder="Enter email"
                  maxLength={50}
                  className={inputCls}
                  value={formData.email}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div /> {/* spacer */}

              <div>
                <label className={labelCls}>
                  Emergency contact name{" "}
                  {emergencyOptional ? <Opt /> : <Req />}
                </label>
                <input
                  name="emergencyContactName"
                  placeholder="Enter contact name"
                  maxLength={100}
                  className={inputCls}
                  value={formData.emergencyContactName}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Emergency contact relation{" "}
                  {emergencyOptional ? <Opt /> : <Req />}
                </label>
                <input
                  name="emergencyContactRelation"
                  placeholder="e.g. spouse, parent"
                  maxLength={50}
                  className={inputCls}
                  value={formData.emergencyContactRelation}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Emergency contact number{" "}
                  {emergencyOptional ? <Opt /> : <Req />}
                </label>
                <input
                  name="emergencyContactNumber"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Enter contact number"
                  maxLength={15}
                  className={inputCls}
                  value={formData.emergencyContactNumber}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
            </div>
          </Section>

          {/* ── Role and designation ── */}
          <Section
            title="Role and designation"
            sub={
              isMedical
                ? `Specialization, qualification and license apply to the ${displayRole} role.`
                : displayRole === "Branch Admin"
                ? `Department selection is available for the ${displayRole} role.`
                : `${displayRole} role does not require specialization, qualification or a license number.`
            }
          >
            <div className="grid grid-cols-3 gap-x-5 gap-y-[18px]">
              <div>
                <label className={labelCls}>
                  {displayRole} designation <Req />
                </label>
                <FormDropdown
                  name="designation"
                  className={roleConfig ? inputCls : inputCls}
                  options={roleConfig?.designations ?? []}
                  value={formData.designation}
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, designation: v }))
                  }
                  placeholder={roleConfig ? "Select designation" : "Select a role first"}
                  disabled={submitting || !roleConfig}
                />
              </div>

              <AnimatePresence>
                {(isMedical || displayRole === "Branch Admin") && (
                  <motion.div
                    key="specialization"
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <label className={labelCls}>
                      {displayRole} {isMedical ? "specialization" : "department"} <Req />
                    </label>
                    <FormDropdown
                      name="departmentId"
                      className={inputCls}
                      options={[
                        ...departments.map((d) => ({ label: d.department_name, value: d.department_id })),
                        { label: "Others", value: OTHER_DEPARTMENT_VALUE },
                      ]}
                      value={formData.departmentId}
                      onValueChange={(v) => {
                        setFormData((p) => ({
                          ...p,
                          departmentId: v,
                          specialization:
                            isMedical && v !== OTHER_DEPARTMENT_VALUE
                              ? departments.find((d) => d.department_id === v)?.department_name || ""
                              : "",
                        }));
                        if (v !== OTHER_DEPARTMENT_VALUE) setCustomDepartment("");
                      }}
                      placeholder={departments.length ? `Select ${isMedical ? "specialization" : "department"}` : "Loading…"}
                      disabled={submitting || departments.length === 0}
                    />
                    {formData.departmentId === OTHER_DEPARTMENT_VALUE && (
                      <input
                        type="text"
                        placeholder={`Type your ${isMedical ? "specialization" : "department"}`}
                        maxLength={100}
                        className={inputCls + " mt-2"}
                        value={customDepartment}
                        onChange={(e) => setCustomDepartment(e.target.value)}
                        disabled={submitting}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {isMedical && (
                  <motion.div
                    key="qualification"
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <label className={labelCls}>
                      {displayRole} qualification <Req />
                    </label>
                    <MultiSelectDropdown
                      className={inputCls}
                      options={roleConfig?.qualifications ?? []}
                      value={formData.qualification ? formData.qualification.split(",").filter(Boolean) : []}
                      onValueChange={(vals) =>
                        setFormData((p) => ({ ...p, qualification: vals.join(",") }))
                      }
                      placeholder="Select qualification(s)"
                      disabled={submitting || !roleConfig}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {isMedical && (
                  <motion.div
                    key="license"
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <label className={labelCls}>
                      {roleConfig?.licenseLabel ?? "License no"} <Req />
                    </label>
                    <input
                      name="docLicenseNo"
                      placeholder={roleConfig?.licensePlaceholder ?? ""}
                      maxLength={50}
                      className={inputCls}
                      value={formData.docLicenseNo}
                      onChange={handleChange}
                      disabled={submitting || !roleConfig}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Branch — multi for Doctor, single otherwise */}
              <div className="col-span-2">
                <label className={labelCls}>Branch <Req /></label>
                {formData.roleType === "DOCTOR" ? (
                  <MultiSelectDropdown
                    options={branchOptions}
                    value={formData.branchIds}
                    onValueChange={(vals) =>
                      setFormData((p) => ({ ...p, branchIds: vals }))
                    }
                    placeholder={
                      branches.length ? "Select branch(es)" : "No branches available"
                    }
                    disabled={submitting || branches.length === 0}
                  />
                ) : (
                  <FormDropdown
                    name="branchId"
                    className={inputCls}
                    options={branchOptions}
                    value={formData.branchIds[0] ?? ""}
                    onValueChange={(v) =>
                      setFormData((p) => ({ ...p, branchIds: v ? [v] : [] }))
                    }
                    placeholder={
                      branches.length ? "Select branch" : "No branches available"
                    }
                    disabled={submitting || branches.length === 0}
                  />
                )}
              </div>
            </div>
          </Section>

          {/* ── Schedule (Doctor only) ── */}
          <AnimatePresence>
            {showSchedule && (
              <motion.div
                key="schedule"
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <Section
                  title="Schedule and time slots"
                  sub="Weekly working hours — shown only for the Doctor role."
                >
                  {/* Consultation minutes */}
                  <div className="mb-5 max-w-[200px]">
                    <label className={labelCls}>
                      Consultation minutes <Req />
                    </label>
                    <input
                      type="number"
                      min={1}
                      className={inputCls}
                      value={consultationMinutes}
                      onChange={(e) => setConsultationMinutes(e.target.value)}
                      disabled={submitting}
                    />
                  </div>

                  {schedule.length === 0 && (
                    <p className="text-[13px] text-gray-400 mb-3">
                      No time slots added yet.
                    </p>
                  )}

                  {/* ── Style 3 slot rows ── */}
                  <div className="space-y-2.5 mb-3">
                    {schedule.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex flex-wrap items-end gap-3 bg-white border border-gray-200 border-l-[4px] border-l-blue-600 rounded-r-[10px] px-4 py-3.5"
                      >
                        {/* Day */}
                        <div className="flex flex-col">
                          <label className="text-[10.5px] font-bold text-blue-600 uppercase tracking-[0.04em] mb-1.5">
                            Day
                          </label>
                          <FormDropdown
                            name={`day-${entry.id}`}
                            className={inputCls + " !h-9 !w-[150px]"}
                            options={DAYS_OF_WEEK}
                            value={entry.day_of_week}
                            onValueChange={(v) => updateSlot(entry.id, "day_of_week", v)}
                            placeholder="Select day"
                            disabled={submitting}
                          />
                        </div>

                        {/* Start time */}
                        <div className="flex flex-col">
                          <label className="text-[10.5px] font-bold text-blue-600 uppercase tracking-[0.04em] mb-1.5">
                            Start time
                          </label>
                          <FormDropdown
                            name={`start-${entry.id}`}
                            className={inputCls + " !h-9 !w-[150px]"}
                            options={TIME_OPTIONS}
                            value={entry.start_time}
                            onValueChange={(v) => updateSlot(entry.id, "start_time", v)}
                            placeholder="Start time"
                            disabled={submitting}
                          />
                        </div>

                        {/* End time */}
                        <div className="flex flex-col">
                          <label className="text-[10.5px] font-bold text-blue-600 uppercase tracking-[0.04em] mb-1.5">
                            End time
                          </label>
                          <FormDropdown
                            name={`end-${entry.id}`}
                            className={inputCls + " !h-9 !w-[150px]"}
                            options={TIME_OPTIONS}
                            value={entry.end_time}
                            onValueChange={(v) => updateSlot(entry.id, "end_time", v)}
                            placeholder="End time"
                            disabled={submitting}
                          />
                        </div>

                        {/* Branch */}
                        <div className="flex flex-col">
                          <label className="text-[10.5px] font-bold text-blue-600 uppercase tracking-[0.04em] mb-1.5">
                            Branch
                          </label>
                          <FormDropdown
                            name={`branch-${entry.id}`}
                            className={inputCls + " !h-9 !w-[200px]"}
                            options={branches
                              .filter((b) => formData.branchIds.includes(b.branch_id))
                              .map((b) => ({
                                label: `${b.branch_id}${b.branch_name ? ` - ${b.branch_name}` : ""}`,
                                value: b.branch_id,
                              }))}
                            value={entry.branch_id}
                            onValueChange={(v) => updateSlot(entry.id, "branch_id", v)}
                            placeholder="Select branch"
                            disabled={submitting || branches.length === 0}
                          />
                        </div>

                        {/* Remove — Style 3 danger tint */}
                        <button
                          type="button"
                          onClick={() => removeSlot(entry.id)}
                          disabled={submitting}
                          className="w-8 h-8 flex items-center justify-center rounded-[6px] border border-red-300 bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                          aria-label="Remove time slot"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addSlot}
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-blue-600 border border-blue-200 rounded-[10px] bg-white hover:bg-blue-50 transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    Add time slot
                  </button>
                </Section>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Account credentials ── */}
          <Section
            title="Account credentials"
            sub="Login details for portal access."
          >
            <div className="grid grid-cols-3 gap-x-5 gap-y-[18px]">
              <div>
                <label className={labelCls}>Username <Req /></label>
                <input
                  name="username"
                  placeholder="Enter username"
                  maxLength={50}
                  className={inputCls}
                  value={formData.username}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Password <Req /></label>
                <input
                  type="password"
                  name="password"
                  placeholder="Enter password"
                  maxLength={50}
                  className={inputCls}
                  value={formData.password}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Confirm password <Req /></label>
                <input
                  type="password"
                  placeholder="Confirm password"
                  maxLength={50}
                  className={inputCls}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>
          </Section>

          {/* ── Actions ── */}
          <div className="flex justify-end gap-3.5 pt-5 mt-1.5 border-t border-gray-100">
            <button
              type="button"
              onClick={handleReset}
              disabled={submitting}
              className="h-[42px] px-6 text-[13.5px] font-semibold text-gray-700 border border-gray-300 rounded-xl bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-[42px] px-6 text-[13.5px] font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding…
                </>
              ) : (
                "Add employee"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}