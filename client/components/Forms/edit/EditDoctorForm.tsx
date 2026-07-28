import { useEffect, useState, useRef, ChangeEvent, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, Stethoscope, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FormDropdown } from "@/components/ui/form-dropdown";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { State as CSState, City } from "country-state-city";
import type { IState } from "country-state-city";
import { branchApi, Branch } from "@/api/branch.api";
import { departmentApi, Department } from "@/api/department.api";
import { DayOfWeek, WorkingHourPayload, employeeApi } from "@/api/employee.api";

const DOCTOR_DESIGNATIONS = [
  "Consultant",
  "Senior Consultant",
  "Resident Doctor",
  "Junior Doctor",
  "Chief Medical Officer",
  "Visiting Doctor",
];
const DOCTOR_SPECIALIZATIONS = [
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
];
const DOCTOR_QUALIFICATIONS = ["MBBS", "MD", "MS", "DM", "MCh", "BDS", "MDS"];

const OTHER_DEPARTMENT_VALUE = "__OTHER__";

const DAYS_OF_WEEK: { value: DayOfWeek; label: string }[] = [
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

function deriveShiftName(startTime: string): string {
  const hour = Number(startTime.split(":")[0]);
  return hour < 12 ? "Morning" : "Evening";
}

interface EditDoctorFormData {
  firstName: string;
  middleName: string;
  lastName: string;
  bloodGroup: string;
  nationality: string;
  maritalStatus: string;
  mobileNo: string;
  email: string;
  aadhaarNo: string;
  panNo: string;
  passportNo: string;
  currentAddress: string;
  permanentAddress: string;
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactNumber: string;
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
  photoUrl: string | null;
  isActive: boolean;
}

const emptyFormData: EditDoctorFormData = {
  firstName: "",
  middleName: "",
  lastName: "",
  bloodGroup: "",
  nationality: "",
  maritalStatus: "",
  mobileNo: "",
  email: "",
  aadhaarNo: "",
  panNo: "",
  passportNo: "",
  currentAddress: "",
  permanentAddress: "",
  emergencyContactName: "",
  emergencyContactRelation: "",
  emergencyContactNumber: "",
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
  photoUrl: null,
  isActive: true,
};

const inputCls =
  "w-full h-10 px-4 bg-white border border-gray-200 rounded-xl text-[13.5px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-[3px] focus:ring-blue-500/15 focus:border-blue-500 transition-all duration-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed";

const labelCls = "block text-[12.5px] font-semibold text-gray-700 mb-1.5";

const Req = () => <span className="text-red-600 ml-0.5">*</span>;
const Opt = () => (
  <span className="text-gray-400 text-[11px] font-normal ml-1">(optional)</span>
);

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

export default function EditDoctorForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const [formData, setFormData] = useState<EditDoctorFormData>(emptyFormData);
  const [sameAsCurrent, setSameAsCurrent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [customDepartment, setCustomDepartment] = useState("");

  const [indianStates, setIndianStates] = useState<IState[]>([]);
  const [districtOptions, setDistrictOptions] = useState<string[]>([]);

  useEffect(() => {
    setIndianStates(CSState.getStatesOfCountry("IN"));
  }, []);

  useEffect(() => {
    if (formData.state) {
      const selectedState = indianStates.find((s) => s.name === formData.state);
      if (selectedState) {
        const cities = City.getCitiesOfState("IN", selectedState.isoCode);
        setDistrictOptions(cities.map((c) => c.name).sort());
        return;
      }
    }
    setDistrictOptions([]);
  }, [formData.state, indianStates]);

  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [consultationMinutes, setConsultationMinutes] = useState("20");
  const nextSlotId = useRef(0);

  const addScheduleEntry = () => {
    const slotId = `slot-${nextSlotId.current++}`;
    setSchedule((prev) => [
      ...prev,
      { id: slotId, day_of_week: "", start_time: "09:00", end_time: "17:00", branch_id: "" },
    ]);
  };

  const removeScheduleEntry = (slotId: string) => {
    setSchedule((prev) => prev.filter((entry) => entry.id !== slotId));
  };

  const updateScheduleEntry = (slotId: string, field: keyof ScheduleEntry, value: string) => {
    setSchedule((prev) =>
      prev.map((entry) => (entry.id === slotId ? { ...entry, [field]: value } : entry)),
    );
  };

  const emergencyOptional = formData.maritalStatus === "Divorced";

  const setField = (key: keyof EditDoctorFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    key: keyof EditDoctorFormData,
  ) => {
    const value = e.target.value;
    setFormData((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "currentAddress" && sameAsCurrent) {
        next.permanentAddress = value;
      }
      return next;
    });
  };

  const handleSameAsCurrentToggle = (e: ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setSameAsCurrent(checked);
    if (checked) {
      setFormData((prev) => ({ ...prev, permanentAddress: prev.currentAddress }));
    }
  };

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
    if (!id) return;
    employeeApi
      .getById(id)
      .then((res) => {
        const payload = res.data?.data;
        const employee = payload?.employee;
        const user = payload?.user;

        if (!employee) {
          toast({
            title: "Doctor not found",
            description: "Couldn't find this doctor's record.",
            variant: "destructive",
          });
          return;
        }

        if (user?.role_type !== "DOCTOR") {
          toast({
            title: "Not a Doctor",
            description: "This edit form only supports Doctor accounts.",
            variant: "destructive",
          });
          return;
        }

        setFormData({
          firstName: employee.first_name || "",
          middleName: employee.middle_name || "",
          lastName: employee.last_name || "",
          bloodGroup: employee.blood_group || "",
          nationality: employee.nationality || "",
          maritalStatus: employee.marital_status || "",
          mobileNo: employee.mobile_no || "",
          email: employee.email || "",
          aadhaarNo: employee.aadhaar_no || "",
          panNo: employee.pan_no || "",
          passportNo: employee.passport_no || "",
          currentAddress: employee.current_address || "",
          permanentAddress: employee.parmanant_address || "",
          emergencyContactName: employee.emergency_contact_name || "",
          emergencyContactRelation: employee.emergency_contact_relationship || "",
          emergencyContactNumber: employee.emergency_contact_number || "",
          state: employee.employee_state || "",
          district: employee.employee_district || "",
          area: employee.employee_area || "",
          pincode: employee.employee_pincode != null ? String(employee.employee_pincode) : "",
          experience: employee.employee_no_experence != null ? String(employee.employee_no_experence) : "",
          departmentId: employee.department_id || "",
          designation: employee.designation || "",
          specialization: employee.specialization || "",
          qualification: employee.qualification || "",
          docLicenseNo: employee.license_no || "",
          joiningDate: employee.joining_date ? String(employee.joining_date).slice(0, 10) : "",
          branchIds: employee.branch_id ? [employee.branch_id] : [],
          photoUrl: employee.employee_photo_URL || employee.photo || null,
          isActive: employee.emp_status === true,
        });

        if (employee.current_address && employee.current_address === employee.parmanant_address) {
          setSameAsCurrent(true);
        }

        const dbSchedules: any[] = payload?.doctorSchedules || [];
        if (dbSchedules.length > 0) {
          const mapped: ScheduleEntry[] = dbSchedules.map((s: any) => ({
            id: `db-${s.schedule_id}`,
            day_of_week: s.day_of_week || "",
            start_time: s.start_time ? String(s.start_time).slice(0, 5) : "09:00",
            end_time: s.end_time ? String(s.end_time).slice(0, 5) : "17:00",
            branch_id: s.branch_id || "",
          }));
          setSchedule(mapped);

          const profile: any = payload?.doctorProfile;
          if (profile?.consultation_minutes) {
            setConsultationMinutes(String(profile.consultation_minutes));
          }
        }
      })
      .catch(() => {
        toast({
          title: "Failed to load doctor",
          description: "Couldn't reach the employees API.",
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id) return;

    const requiredFields: { key: Exclude<keyof EditDoctorFormData, "branchIds" | "isActive">; label: string }[] = [
      { key: "firstName", label: "First Name" },
      { key: "lastName", label: "Last Name" },
      { key: "bloodGroup", label: "Blood Group" },
      { key: "nationality", label: "Nationality" },
      { key: "maritalStatus", label: "Marital Status" },
      { key: "mobileNo", label: "Mobile Number" },
      { key: "email", label: "Email" },
      { key: "aadhaarNo", label: "Aadhaar No" },
      { key: "panNo", label: "PAN No" },
      { key: "departmentId", label: "Department" },
      { key: "designation", label: "Designation" },
      { key: "specialization", label: "Specialization" },
      { key: "qualification", label: "Qualification" },
      { key: "docLicenseNo", label: "License No" },
      { key: "joiningDate", label: "Joining Date" },
      { key: "currentAddress", label: "Current Address" },
      { key: "permanentAddress", label: "Permanent Address" },
      { key: "state", label: "State" },
      { key: "district", label: "District" },
      { key: "area", label: "Area" },
      { key: "pincode", label: "Pincode" },
      { key: "experience", label: "Experience" },
      ...(emergencyOptional
        ? []
        : [
            { key: "emergencyContactName" as const, label: "Emergency Contact Name" },
            { key: "emergencyContactRelation" as const, label: "Emergency Contact Relation" },
            { key: "emergencyContactNumber" as const, label: "Emergency Contact Number" },
          ]),
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
        description: 'Please select at least one "Branch".',
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

    const incompleteSlot = schedule.find((entry) => !entry.day_of_week);
    if (incompleteSlot) {
      toast({
        title: "Incomplete schedule",
        description: "Please select a day for every schedule time slot.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      let departmentId = formData.departmentId;
      if (departmentId === OTHER_DEPARTMENT_VALUE) {
        const deptResponse = await departmentApi.create({ department_name: customDepartment.trim() });
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

      const response = await employeeApi.update(id, {
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
        current_address: formData.currentAddress,
        permanent_address: formData.permanentAddress,
        emergency_contact_name: formData.emergencyContactName || undefined,
        emergency_contact_relationship: formData.emergencyContactRelation || undefined,
        emergency_contact_number: formData.emergencyContactNumber || undefined,
        employee_state: formData.state || undefined,
        employee_district: formData.district || undefined,
        employee_area: formData.area || undefined,
        employee_pincode: formData.pincode ? Number(formData.pincode) : undefined,
        employee_no_experence: formData.experience ? Number(formData.experience) : undefined,
        department_id: departmentId,
        designation: formData.designation,
        specialization: formData.specialization || undefined,
        qualification: formData.qualification || undefined,
        license_no: formData.docLicenseNo || undefined,
        joining_date: formData.joiningDate,
        branch_ids: formData.branchIds,
        consultation_minutes: Number(consultationMinutes) || 20,
        working_hours: workingHours,
        employee_photo_URL: formData.photoUrl || undefined,
        emp_status: formData.isActive,
      });

      if (!response.data.success) {
        throw new Error(response.data.message);
      }

      toast({
        title: "Doctor updated",
        description: `${formData.firstName} ${formData.lastName} was updated successfully.`,
      });

      navigate(-1);
    } catch (error: any) {
      toast({
        title: "Failed to update doctor",
        description: error.response?.data?.message ?? error.message ?? "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData(emptyFormData);
    setSameAsCurrent(false);
    setCustomDepartment("");
    setSchedule([]);
    setConsultationMinutes("20");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 flex items-center justify-center">
        <div className="w-full max-w-5xl bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

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
            <Stethoscope className="w-5 h-5" />
          </div>
          <h4 className="hms-heading text-gray-900 tracking-tight">Edit Doctor</h4>
        </div>

        {/* ── Body ── */}
        <form onSubmit={handleSubmit} className="px-8 pt-7 pb-8">
          {/* Photo + Status */}
          <div className="flex items-start gap-10 pb-6 border-b border-gray-100 mb-7">
            <AvatarUpload
              value={formData.photoUrl}
              onChange={(url) => setFormData((p) => ({ ...p, photoUrl: url }))}
              label="Doctor photo"
              hint="Click or drag an image to upload (Max 1MB)"
              size={80}
            />
            <div className="w-px self-stretch bg-gray-200" aria-hidden />
            <div className="w-64">
              <label className={labelCls}>Status <Req /></label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, isActive: true }))}
                  disabled={submitting}
                  className={`h-10 rounded-xl border-2 text-[13px] font-semibold transition-colors ${
                    formData.isActive
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, isActive: false }))}
                  disabled={submitting}
                  className={`h-10 rounded-xl border-2 text-[13px] font-semibold transition-colors ${
                    !formData.isActive
                      ? "border-red-400 bg-red-50 text-red-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  Inactive
                </button>
              </div>
            </div>
          </div>

          {/* ── Personal details ── */}
          <Section title="Personal details" sub="Identifying details for this doctor.">
            <div className="grid grid-cols-3 gap-x-5 gap-y-[18px]">
              <div>
                <label className={labelCls}>First name <Req /></label>
                <input
                  type="text"
                  className={inputCls}
                  value={formData.firstName}
                  onChange={(e) => handleChange(e, "firstName")}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Middle name <Opt /></label>
                <input
                  type="text"
                  className={inputCls}
                  value={formData.middleName}
                  onChange={(e) => handleChange(e, "middleName")}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Last name <Req /></label>
                <input
                  type="text"
                  className={inputCls}
                  value={formData.lastName}
                  onChange={(e) => handleChange(e, "lastName")}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className={labelCls}>Blood group <Req /></label>
                <FormDropdown
                  className={inputCls}
                  options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]}
                  value={formData.bloodGroup}
                  onValueChange={(val) => setField("bloodGroup", val)}
                  placeholder="Select"
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Nationality <Req /></label>
                <input
                  type="text"
                  className={inputCls}
                  value={formData.nationality}
                  onChange={(e) => handleChange(e, "nationality")}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Marital status <Req /></label>
                <FormDropdown
                  className={inputCls}
                  options={["Single", "Married", "Divorced"]}
                  value={formData.maritalStatus}
                  onValueChange={(val) => setField("maritalStatus", val)}
                  placeholder="Select"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className={labelCls}>Aadhaar no <Req /></label>
                <input
                  type="text"
                  className={inputCls}
                  value={formData.aadhaarNo}
                  onChange={(e) => handleChange(e, "aadhaarNo")}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>PAN no <Req /></label>
                <input
                  type="text"
                  className={inputCls}
                  value={formData.panNo}
                  onChange={(e) => handleChange(e, "panNo")}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Passport no <Opt /></label>
                <input
                  type="text"
                  className={inputCls}
                  value={formData.passportNo}
                  onChange={(e) => handleChange(e, "passportNo")}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className={labelCls}>Email <Req /></label>
                <input
                  type="email"
                  className={inputCls}
                  value={formData.email}
                  onChange={(e) => handleChange(e, "email")}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Mobile <Req /></label>
                <input
                  type="tel"
                  className={inputCls}
                  value={formData.mobileNo}
                  onChange={(e) => handleChange(e, "mobileNo")}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Joining date <Req /></label>
                <input
                  type="date"
                  max={new Date().toISOString().split("T")[0]}
                  className={inputCls + " text-gray-500"}
                  value={formData.joiningDate}
                  onChange={(e) => handleChange(e, "joiningDate")}
                  disabled={submitting}
                />
              </div>
            </div>
          </Section>

          {/* ── Contact & Address ── */}
          <Section title="Contact & Address" sub="Contact details, address and location information.">
            <div className="grid grid-cols-3 gap-x-5 gap-y-[18px]">
              <div>
                <label className={labelCls}>
                  Emergency contact name {emergencyOptional ? <Opt /> : <Req />}
                </label>
                <input
                  type="text"
                  className={inputCls}
                  value={formData.emergencyContactName}
                  onChange={(e) => handleChange(e, "emergencyContactName")}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Emergency contact relation {emergencyOptional ? <Opt /> : <Req />}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Spouse, Parent"
                  className={inputCls}
                  value={formData.emergencyContactRelation}
                  onChange={(e) => handleChange(e, "emergencyContactRelation")}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Emergency contact number {emergencyOptional ? <Opt /> : <Req />}
                </label>
                <input
                  type="tel"
                  className={inputCls}
                  value={formData.emergencyContactNumber}
                  onChange={(e) => handleChange(e, "emergencyContactNumber")}
                  disabled={submitting}
                />
              </div>

              <div className="col-span-3">
                <label className={labelCls}>Current address <Req /></label>
                <input
                  type="text"
                  maxLength={255}
                  className={inputCls}
                  value={formData.currentAddress}
                  onChange={(e) => handleChange(e, "currentAddress")}
                  disabled={submitting}
                />
              </div>

              <div className="col-span-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sameAsCurrent"
                  checked={sameAsCurrent}
                  onChange={handleSameAsCurrentToggle}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  disabled={submitting}
                />
                <label
                  htmlFor="sameAsCurrent"
                  className="text-[13px] text-gray-700 cursor-pointer select-none"
                >
                  Same as current address
                </label>
              </div>

              <div className="col-span-3">
                <label className={labelCls}>Permanent address <Req /></label>
                <input
                  type="text"
                  maxLength={255}
                  className={inputCls}
                  value={formData.permanentAddress}
                  onChange={(e) => handleChange(e, "permanentAddress")}
                  disabled={submitting || sameAsCurrent}
                />
              </div>

              <div>
                <label className={labelCls}>State <Req /></label>
                <FormDropdown
                  className={inputCls}
                  options={indianStates.map((s) => s.name)}
                  value={formData.state}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, state: val, district: "" }))
                  }
                  placeholder="Select State"
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>District <Req /></label>
                <FormDropdown
                  className={inputCls}
                  options={districtOptions}
                  value={formData.district}
                  onValueChange={(val) => setField("district", val)}
                  placeholder={formData.state ? "Select District" : "Select State first"}
                  disabled={submitting || !formData.state}
                />
              </div>
              <div>
                <label className={labelCls}>Area <Req /></label>
                <input
                  type="text"
                  maxLength={50}
                  className={inputCls}
                  value={formData.area}
                  onChange={(e) => handleChange(e, "area")}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Pincode <Req /></label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  className={inputCls}
                  value={formData.pincode}
                  onChange={(e) => handleChange(e, "pincode")}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Experience <Req /></label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Years of experience"
                  maxLength={50}
                  className={inputCls}
                  value={formData.experience}
                  onChange={(e) => handleChange(e, "experience")}
                  disabled={submitting}
                />
              </div>
            </div>
          </Section>

          {/* ── Professional details ── */}
          <Section title="Professional details" sub="Doctor's professional credentials and affiliations.">
            <div className="grid grid-cols-3 gap-x-5 gap-y-[18px]">
              <div>
                <label className={labelCls}>Department <Req /></label>
                <FormDropdown
                  className={inputCls}
                  options={[
                    ...departments.map((d) => ({
                      label: d.department_name,
                      value: d.department_id,
                    })),
                    { label: "Others", value: OTHER_DEPARTMENT_VALUE },
                  ]}
                  value={formData.departmentId}
                  onValueChange={(val) => {
                    setField("departmentId", val);
                    if (val !== OTHER_DEPARTMENT_VALUE) setCustomDepartment("");
                  }}
                  placeholder={departments.length ? "Select department" : "Loading departments..."}
                  disabled={submitting}
                />
                {formData.departmentId === OTHER_DEPARTMENT_VALUE && (
                  <input
                    type="text"
                    placeholder="Type your department name"
                    maxLength={100}
                    className={inputCls + " mt-2"}
                    value={customDepartment}
                    onChange={(e) => setCustomDepartment(e.target.value)}
                    disabled={submitting}
                  />
                )}
              </div>
              <div>
                <label className={labelCls}>Designation <Req /></label>
                <FormDropdown
                  className={inputCls}
                  options={DOCTOR_DESIGNATIONS}
                  value={formData.designation}
                  onValueChange={(val) => setField("designation", val)}
                  placeholder="Select designation"
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Specialization <Req /></label>
                <FormDropdown
                  className={inputCls}
                  options={DOCTOR_SPECIALIZATIONS}
                  value={formData.specialization}
                  onValueChange={(val) => setField("specialization", val)}
                  placeholder="Select specialization"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className={labelCls}>Qualification <Req /></label>
                <FormDropdown
                  className={inputCls}
                  options={DOCTOR_QUALIFICATIONS}
                  value={formData.qualification}
                  onValueChange={(val) => setField("qualification", val)}
                  placeholder="Select qualification"
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>License No <Req /></label>
                <input
                  type="text"
                  className={inputCls}
                  value={formData.docLicenseNo}
                  onChange={(e) => handleChange(e, "docLicenseNo")}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Branch(es) <Req /></label>
                <MultiSelectDropdown
                  options={branches.map((b) => ({
                    label: `${b.branch_id}${b.branch_name ? ` - ${b.branch_name}` : ""}`,
                    value: b.branch_id,
                  }))}
                  value={formData.branchIds}
                  onValueChange={(vals) =>
                    setFormData((prev) => ({ ...prev, branchIds: vals }))
                  }
                  placeholder={branches.length ? "Select branch(es)" : "No branches available"}
                  className={inputCls}
                  disabled={submitting || branches.length === 0}
                />
              </div>
            </div>
          </Section>

          {/* ── Schedule / Time Slots ── */}
          <Section title="Schedule / Time Slots" sub="Set the doctor's weekly working hours and consultation duration.">
            <div className="grid grid-cols-3 gap-x-5 gap-y-[18px]">
              <div>
                <label className={labelCls}>Consultation Minutes <Req /></label>
                <input
                  type="number"
                  min={1}
                  className={inputCls}
                  value={consultationMinutes}
                  onChange={(e) => setConsultationMinutes(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="col-span-3">
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
                        <label className="block text-[12.5px] font-semibold text-gray-600 mb-1">
                          Day
                        </label>
                        <FormDropdown
                          className={inputCls}
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
                        <label className="block text-[12.5px] font-semibold text-gray-600 mb-1">
                          Start Time
                        </label>
                        <FormDropdown
                          className={inputCls}
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
                        <label className="block text-[12.5px] font-semibold text-gray-600 mb-1">
                          End Time
                        </label>
                        <FormDropdown
                          className={inputCls}
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
                        <label className="block text-[12.5px] font-semibold text-gray-600 mb-1">
                          Branch
                        </label>
                        <FormDropdown
                          className={inputCls}
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
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" /> Add Time Slot
                </button>
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
                  Saving…
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
