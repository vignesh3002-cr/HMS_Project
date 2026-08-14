import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import {
  IdCard,
  Phone,
  Mail,
  MapPin,
  Cake,
  Droplet,
  VenusAndMars,
  Briefcase,
  ShieldCheck,
  FileText,
  Building2,
  Award,
  User,
} from "lucide-react";
import { employeeApi, type EmployeeDetailResponse } from "@/api/employee.api";

// Role-based extra fields, mirroring Addemployee.tsx's ROLE_CONFIG /
// isMedical logic exactly: only Doctor/Nurse/Pharmacist/Lab Technician are
// "medical" roles with a qualification + license/registration number, each
// under its own label; Branch Admin/Staff Admin/Staff show "Department"
// instead of "Specialization" and never have a qualification or license
// number (that form never collects one for them). Bio only exists for
// Doctor -- it comes from a separate doctorProfile join, not a field every
// employee has.
interface RoleMeta {
  displayRole: string;
  isMedical: boolean;
  licenseLabel: string;
  specializationLabel: string;
  showBio: boolean;
}

function getRoleMeta(roleType: string | undefined): RoleMeta {
  switch ((roleType || "STAFF").toUpperCase()) {
    case "DOCTOR":
      return { displayRole: "Doctor", isMedical: true, licenseLabel: "Medical License No", specializationLabel: "Specialization", showBio: true };
    case "NURSE":
      return { displayRole: "Nurse", isMedical: true, licenseLabel: "Nurse Registration No", specializationLabel: "Specialization", showBio: false };
    case "PHARMACIST":
      return { displayRole: "Pharmacist", isMedical: true, licenseLabel: "Pharmacist License No", specializationLabel: "Specialization", showBio: false };
    case "LAB_TECHNICIAN":
      return { displayRole: "Laboratory Technician", isMedical: true, licenseLabel: "Lab License No", specializationLabel: "Specialization", showBio: false };
    case "BRANCH_ADMIN":
      return { displayRole: "Branch Admin", isMedical: false, licenseLabel: "", specializationLabel: "Department", showBio: false };
    case "ADMIN":
      return { displayRole: "Staff Admin", isMedical: false, licenseLabel: "", specializationLabel: "Department", showBio: false };
    default:
      return { displayRole: "Staff", isMedical: false, licenseLabel: "", specializationLabel: "Department", showBio: false };
  }
}

function getDesignationLabel(roleType: string | undefined, rawDesignation: string | null | undefined, meta: RoleMeta): string {
  const rt = (roleType || "STAFF").toUpperCase();
  if (rt === "BRANCH_ADMIN") return "Branch Admin";
  if (rt === "ADMIN" || rt === "STAFF") return rawDesignation || meta.displayRole;
  return rawDesignation || meta.displayRole;
}

function formatFullName(e: EmployeeDetailResponse["employee"] | null, roleType: string | undefined): string {
  if (!e) return "Employee";
  const name = [e.first_name, e.middle_name, e.last_name].filter(Boolean).join(" ");
  return (roleType || "").toUpperCase() === "DOCTOR" ? `Dr. ${name}` : name;
}

const val = (v?: string | null | number): string =>
  v !== undefined && v !== null && String(v).trim() !== "" ? String(v) : "—";

// joining_date (and any other plain date field) comes back as a full ISO
// timestamp (e.g. "2026-08-01T00:00:00.000Z") -- render it as MM/DD/YYYY
// instead of passing the raw string through val().
const formatDateOnly = (iso?: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return format(d, "MM/dd/yyyy");
};

const calculateAge = (dob?: string | null): string => {
  if (!dob) return "—";
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return "—";
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return `${age}`;
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="bg-white border border-[#E5E7EB] rounded-xl p-5 mb-4">
    <h2 className="hms-heading text-lg mb-4">{title}</h2>
    {children}
  </section>
);

const InfoItem = ({
  icon: Icon,
  title,
  value,
  span = 1,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: string | number }>;
  title: string;
  value: string;
  span?: number;
}) => (
  <div className={span > 1 ? "col-span-2" : ""}>
    <div className="flex items-start gap-3">
      <div className="w-[23px] h-[23px] flex items-center justify-center text-[#424752] shrink-0">
        <Icon className="w-[17px] h-[17px]" strokeWidth={1.75} />
      </div>
      <div className="flex flex-col gap-[3px]">
        <strong className="hms-department-text text-[#191C1E]">{title}</strong>
        <span className="hms-content-text text-[#424752]">{value}</span>
      </div>
    </div>
  </div>
);

const BranchesSection = ({ branches }: { branches: { branch_id: string; branch_name: string }[] }) => (
  <div className="col-span-2 md:col-span-4">
    <strong className="hms-department-text text-[#191C1E] block mb-2">Branches</strong>
    {branches.length > 0 ? (
      <div className="flex flex-wrap gap-2">
        {branches.map((b) => (
          <span key={b.branch_id} className="inline-flex items-center gap-1 px-2 py-0.5 hms-department-text text-[#475C7F] bg-[#E6E8EA] rounded-lg">
            <Building2 className="w-3.5 h-3.5" />
            {b.branch_name}
          </span>
        ))}
      </div>
    ) : (
      <span className="hms-content-text text-[#8C8D8F]">—</span>
    )}
  </div>
);

export default function ViewEmployee() {
  const { id } = useParams();
  const [detail, setDetail] = useState<EmployeeDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    employeeApi
      .getOne(id)
      .then((res) => setDetail(res.data?.data ?? null))
      .catch((err) => {
        console.error("[ViewEmployee] Failed to load employee:", err);
        setDetail(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex w-full font-[Manrope,sans-serif] bg-[#F7F9FB] min-h-screen items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#00488D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex w-full font-[Manrope,sans-serif] bg-[#F7F9FB] min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="hms-subheading">Failed to load employee details.</p>
          <button onClick={() => window.history.back()} className="mt-4 text-[#00488D] underline text-sm font-semibold">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const employee = detail.employee ?? null;
  const roleType = detail.user?.role_type || employee?.user_table?.role_type;
  const meta = getRoleMeta(roleType);
  const name = formatFullName(employee, roleType);
  const designation = getDesignationLabel(roleType, employee?.designation, meta);

  // For medical roles this is a real specialization; for everyone else the
  // same underlying field holds their department/area name -- see
  // Addemployee.tsx's isMedical ? "specialization" : "department" labeling.
  const specializationOrDept = detail.doctorProfile?.specialization || employee?.specialization || "—";
  const qualification = detail.doctorProfile?.qualification || employee?.qualification || "—";
  const licenseNo = detail.doctorProfile?.license_no || employee?.license_no || "—";
  const bio = detail.doctorProfile?.doctor_bio?.trim() || "—";

  const branchNames = detail.branches?.length
    ? detail.branches.map((b) => b.branch_name)
    : employee?.branch?.branch_name
      ? [employee.branch.branch_name]
      : [];
  const isAvailable = employee?.emp_status === true || detail.user?.user_status === 0;
  const photo = employee?.employee_photo_URL || "";
  const phone = employee?.mobile_no || "—";
  const email = employee?.email || "—";
  const experience = employee?.employee_no_experence != null ? `${employee.employee_no_experence}+ yrs` : "—";
  const dob = (employee as any)?.dob ? format(new Date((employee as any).dob), "dd MMM yyyy") : "—";
  const age = calculateAge((employee as any)?.dob);
  const gender = (employee as any)?.gender || "—";

  return (
    <div className="min-h-screen bg-[#F7F9FB] font-[Manrope,sans-serif]">
      <main className="w-full p-4 max-w-[1200px] mx-auto">
        {/* HEADER */}
        <div className="flex items-start gap-2 mb-4">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 border-0 bg-transparent text-[#424752] text-sm cursor-pointer"
          >
            <span className="text-[25px] leading-none">‹</span>
          </button>
          <div className="flex-1">
            <h1 className="hms-heading">{name}</h1>
            <p className="hms-subheading mt-1">View full employee profile</p>
          </div>
        </div>

        {/* CONTACT */}
        <Section title="Contact Information">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-32 h-32 rounded-lg overflow-hidden shrink-0 bg-[#E6E8EA] flex items-center justify-center">
              {photo ? (
                <img src={photo} alt={name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-1/2 h-1/2 text-[#8C8D8F]" strokeWidth={1.5} />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className="inline-flex items-center gap-[5px] bg-[#D6E3FF] text-[#00488D] px-[9px] py-1 rounded-full hms-department-text">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00488D]" />
                  {designation}
                </span>
                <span className={`hms-content-text ${isAvailable ? "text-[#16A34A]" : "text-[#8C8D8F]"}`}>
                  {isAvailable ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InfoItem icon={Mail} title="Email" value={val(email)} />
                <InfoItem icon={Phone} title="Mobile No" value={val(phone)} />
                {meta.isMedical && <InfoItem icon={IdCard} title={meta.licenseLabel} value={val(licenseNo)} />}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <InfoItem icon={Cake} title="Date of Birth" value={dob} />
            <InfoItem icon={Cake} title="Age" value={age} />
            <InfoItem icon={VenusAndMars} title="Gender" value={gender} />
            <InfoItem icon={Droplet} title="Blood Group" value={val(employee?.blood_group)} />
            <InfoItem icon={ShieldCheck} title="Experience" value={experience} />
          </div>
        </Section>

        {/* PERSONAL INFORMATION */}
        <Section title="Personal Information">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoItem icon={User} title="Nationality" value={val(employee?.nationality)} />
            <InfoItem icon={Award} title="Marital Status" value={val(employee?.marital_status)} />
            <InfoItem icon={IdCard} title="Aadhaar No" value={val(employee?.aadhaar_no)} />
            <InfoItem icon={FileText} title="PAN No" value={val(employee?.pan_no)} />
            <InfoItem icon={FileText} title="Passport No" value={val(employee?.passport_no)} />
            <InfoItem icon={Briefcase} title="Designation" value={designation} />
            {meta.isMedical && <InfoItem icon={Award} title="Qualification" value={val(qualification)} />}
          </div>
          {meta.showBio && (
            <div className="mt-4">
              <strong className="hms-department-text text-[#191C1E] block mb-2">Bio</strong>
              <p className="hms-content-text text-[#424752] leading-[22px]">{bio}</p>
            </div>
          )}
        </Section>

        {/* DEPARTMENT & ROLE */}
        <Section title="Department & Role">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoItem icon={Building2} title={meta.specializationLabel} value={val(specializationOrDept)} />
            {meta.isMedical && <InfoItem icon={Award} title="Qualification" value={val(qualification)} />}
            <InfoItem icon={Briefcase} title="Experience" value={experience} />
            {meta.isMedical && <InfoItem icon={IdCard} title={meta.licenseLabel} value={val(licenseNo)} />}
            <InfoItem icon={Cake} title="Joining Date" value={formatDateOnly(employee?.joining_date)} />
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <BranchesSection branches={detail.branches ?? []} />
          </div>
        </Section>

        {/* CURRENT ADDRESS */}
        <Section title="Current Address">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoItem icon={MapPin} title="Address" value={val(employee?.current_address)} span={2} />
            <InfoItem icon={MapPin} title="Area" value={val(employee?.employee_area)} />
            <InfoItem icon={MapPin} title="City" value={val(employee?.employee_district)} />
            <InfoItem icon={MapPin} title="State" value={val(employee?.employee_state)} />
            <InfoItem icon={MapPin} title="Pincode" value={val(employee?.employee_pincode)} />
          </div>
        </Section>

        {/* PERMANENT ADDRESS */}
        <Section title="Permanent Address">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoItem icon={MapPin} title="Address" value={val(employee?.parmanent_address)} span={2} />
            <InfoItem icon={MapPin} title="Area" value={val((employee as any)?.permanent_employee_area)} />
            <InfoItem icon={MapPin} title="City" value={val((employee as any)?.permanent_employee_district)} />
            <InfoItem icon={MapPin} title="State" value={val((employee as any)?.permanent_employee_state)} />
            <InfoItem icon={MapPin} title="Pincode" value={val((employee as any)?.permanent_employee_pincode)} />
          </div>
        </Section>

        {/* EMERGENCY CONTACT */}
        <Section title="Emergency Contact">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoItem icon={User} title="Contact Name" value={val(employee?.emergency_contact_name)} />
            <InfoItem icon={Phone} title="Relation" value={val(employee?.emergency_contact_relationship)} />
            <InfoItem icon={Phone} title="Contact Number" value={val(employee?.emergency_contact_number)} />
          </div>
        </Section>
      </main>
    </div>
  );
}
