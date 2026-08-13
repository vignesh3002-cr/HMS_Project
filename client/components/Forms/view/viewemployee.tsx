import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, IdCard, Phone, Mail, MapPin, Cake, Droplet, VenusAndMars, Briefcase, ShieldCheck, FileText, Building2, Award, Stethoscope, User } from "lucide-react";
import { employeeApi, type EmployeeDetailResponse } from "@/api/employee.api";

function formatDoctorFullName(e: EmployeeDetailResponse["employee"] | null): string {
  if (!e) return "Doctor";
  return `Dr. ${[e.first_name, e.middle_name, e.last_name].filter(Boolean).join(" ")}`;
}

const val = (v?: string | null | number): string =>
  v !== undefined && v !== null && String(v).trim() !== "" ? String(v) : "—";

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
  <section className="bg-white border border-[#edf0f4] rounded-[10px] p-[21px] mb-4">
    <h2 className="text-lg font-semibold text-[#172033] mb-4">{title}</h2>
    {children}
  </section>
);

const InfoCell = ({ icon: Icon, title, value, span = 1 }: { icon: React.ComponentType<{ className?: string; strokeWidth?: string | number }>; title: string; value: string; span?: number }) => (
  <div className={span > 1 ? "col-span-2" : ""}>
    <div className="flex items-start gap-3">
      <div className="w-[23px] h-[23px] flex items-center justify-center text-gray-900 shrink-0">
        <Icon className="w-[17px] h-[17px]" strokeWidth={1.75} />
      </div>
      <div className="flex flex-col gap-[3px]">
        <strong className="text-xs font-bold text-[#222938]">{title}</strong>
        <span className="text-[#6d7480] text-xs leading-[18px]">{value}</span>
      </div>
    </div>
  </div>
);

const BioSection = ({ title, value }: { title: string; value: string }) => (
  <div className="col-span-4">
    <strong className="text-xs font-bold text-[#222938] block mb-2">{title}</strong>
    <p className="text-[#6d7480] text-xs leading-[22px]">{value}</p>
  </div>
);

const BranchesSection = ({ branches }: { branches: { branch_id: string; branch_name: string }[] }) => (
  <div className="col-span-4">
    <strong className="text-xs font-bold text-[#222938] block mb-2">Branches</strong>
    {branches.length > 0 ? (
      <div className="flex flex-wrap gap-2">
        {branches.map((b) => (
          <span key={b.branch_id} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg">
            <Building2 className="w-3.5 h-3.5" />
            {b.branch_name}
          </span>
        ))}
      </div>
    ) : (
      <span className="text-slate-300 font-medium">—</span>
    )}
  </div>
);

export default function DoctorDetailView() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [doctorDetail, setDoctorDetail] = useState<EmployeeDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    employeeApi
      .getOne(id)
      .then((res) => setDoctorDetail(res.data?.data ?? null))
      .catch((err) => {
        console.error("[DoctorDetailView] Failed to load doctor:", err);
        setDoctorDetail(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f9fc] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#004a91] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!doctorDetail) {
    return (
      <div className="min-h-screen bg-[#f7f9fc] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#5f6672]">Failed to load doctor details.</p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 text-[#004a91] underline"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const doctorEmployee = doctorDetail.employee ?? null;
  const doctorName = formatDoctorFullName(doctorEmployee);
  const doctorSpecialization = doctorDetail.doctorProfile?.specialization || doctorEmployee?.specialization || "—";
  const doctorQualification = doctorDetail.doctorProfile?.qualification || doctorEmployee?.qualification || "—";
  // getEmployeeById returns every mapping this doctor ever had (status
  // included) — only status 1 is a real, current assignment. Closed/historical
  // mappings (status 0) must not show up here.
  const activeBranches = (doctorDetail.branches ?? []).filter((b) => b.status === 1);
  const doctorBranchNames = activeBranches.length
    ? activeBranches.map((b) => b.branch_name)
    : doctorEmployee?.branch?.branch_name
      ? [doctorEmployee.branch.branch_name]
      : [];
  const doctorIsAvailable = doctorEmployee?.emp_status === true || doctorDetail.user?.user_status === 0;
  const doctorPhoto = doctorEmployee?.employee_photo_URL || "";
  const doctorLicenseNo = doctorDetail.doctorProfile?.license_no || doctorEmployee?.license_no || "—";
  const doctorPhone = doctorEmployee?.mobile_no || "—";
  const doctorEmail = doctorEmployee?.email || "—";
  const doctorLocation = doctorEmployee?.current_address || doctorEmployee?.parmanent_address || "—";
  const doctorBloodGroup = doctorEmployee?.blood_group || "—";
  const doctorExperience = doctorEmployee?.employee_no_experence != null ? `${doctorEmployee.employee_no_experence}+ yrs` : "—";
  const doctorDOB = (doctorEmployee as any)?.dob
    ? format(new Date((doctorEmployee as any).dob), "dd MMM yyyy")
    : "—";
  const doctorAge = calculateAge((doctorEmployee as any)?.dob);
  const doctorGender = (doctorEmployee as any)?.gender || "—";
  const doctorBio = doctorDetail.doctorProfile?.doctor_bio?.trim() || "—";

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-[#172033] font-[Inter,Arial,sans-serif]">
      <main className="w-full p-4 max-w-[1200px] mx-auto">
        {/* BACK BUTTON + HEADER */}
        <div className="flex items-start gap-2 mb-4">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 border-0 bg-transparent text-[#343943] text-sm cursor-pointer"
          >
            <span className="text-[25px] leading-none">‹</span>
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-[#182235]">{doctorName}</h1>
            <p className="text-[#707784] text-[13px] mt-1">View full doctor profile</p>
          </div>
        </div>

        {/* PROFILE HEADER */}
        <Section title="Contact Information">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-32 h-32 rounded-lg overflow-hidden shrink-0 bg-gray-200 flex items-center justify-center">
              {doctorPhoto ? (
                <img src={doctorPhoto} alt={doctorName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-1/2 h-1/2 text-gray-400" strokeWidth={1.5} />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className="inline-flex items-center gap-[5px] bg-[#edf5ff] text-[#2266c8] border border-[#d5e6ff] px-[9px] py-1 rounded-full text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2675df]" />
                  {doctorSpecialization}
                </span>
                <span className={doctorIsAvailable ? "text-[#0b955e]" : "text-[#9aa1ab]"} style={{ fontSize: "13px" }}>
                  {doctorIsAvailable ? "Available" : "Unavailable"}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <strong className="text-[#5f6672] block mb-1">Email</strong>
                  <span className="text-[#172033]">{val(doctorEmail)}</span>
                </div>
                <div>
                  <strong className="text-[#5f6672] block mb-1">Mobile No</strong>
                  <span className="text-[#172033]">{val(doctorPhone)}</span>
                </div>
                <div>
                  <strong className="text-[#5f6672] block mb-1">License No</strong>
                  <span className="text-[#172033]">{val(doctorLicenseNo)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <InfoCell icon={Cake} title="Date of Birth" value={doctorDOB} />
            <InfoCell icon={Cake} title="Age" value={doctorAge} />
            <InfoCell icon={VenusAndMars} title="Gender" value={doctorGender} />
            <InfoCell icon={Droplet} title="Blood Group" value={doctorBloodGroup} />
            <InfoCell icon={ShieldCheck} title="Experience" value={doctorExperience} />
          </div>
        </Section>

        {/* ABOUT / PERSONAL */}
        <Section title="Personal Information">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoCell icon={User} title="Nationality" value={val(doctorEmployee?.nationality)} />
            <InfoCell icon={Award} title="Marital Status" value={val(doctorEmployee?.marital_status)} />
            <InfoCell icon={IdCard} title="Aadhaar No" value={val(doctorEmployee?.aadhaar_no)} />
            <InfoCell icon={FileText} title="PAN No" value={val(doctorEmployee?.pan_no)} />
            <InfoCell icon={Stethoscope} title="Passport No" value={val(doctorEmployee?.passport_no)} />
            <InfoCell icon={Building2} title="Department" value={val(doctorDetail.doctorProfile?.specialization || doctorEmployee?.specialization)} />
            <InfoCell icon={Briefcase} title="Designation" value={val(doctorEmployee?.designation)} />
            <InfoCell icon={Award} title="Qualification" value={val(doctorQualification)} />
          </div>
          <BioSection title="Bio" value={doctorBio} />
        </Section>

        {/* DEPARTMENT & ROLE */}
        <Section title="Department & Role">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoCell icon={Stethoscope} title="Specialization" value={val(doctorSpecialization)} />
            <InfoCell icon={Award} title="Qualification" value={val(doctorQualification)} />
            <InfoCell icon={Briefcase} title="Experience" value={val(doctorExperience)} />
            <InfoCell icon={IdCard} title="Medical License No" value={val(doctorLicenseNo)} />
            <InfoCell icon={Cake} title="Joining Date" value={val(doctorEmployee?.joining_date)} />
          </div>
          <BranchesSection branches={activeBranches} />
        </Section>

        {/* CURRENT ADDRESS */}
        <Section title="Current Address">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoCell icon={MapPin} title="Address" value={val(doctorEmployee?.current_address)} span={2} />
            <InfoCell icon={MapPin} title="City" value={val(doctorEmployee?.employee_district)} />
            <InfoCell icon={MapPin} title="State" value={val(doctorEmployee?.employee_state)} />
            <InfoCell icon={MapPin} title="Area" value={val(doctorEmployee?.employee_area)} />
            <InfoCell icon={MapPin} title="Pincode" value={val(doctorEmployee?.employee_pincode)} />
          </div>
        </Section>

        {/* PERMANENT ADDRESS */}
        <Section title="Permanent Address">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoCell icon={MapPin} title="Address" value={val(doctorEmployee?.parmanent_address)} span={2} />
            <InfoCell icon={MapPin} title="Pincode" value={val((doctorEmployee as any)?.permanent_employee_pincode)} />
            <InfoCell icon={MapPin} title="City" value={val((doctorEmployee as any)?.permanent_employee_district)} />
            <InfoCell icon={MapPin} title="State" value={val((doctorEmployee as any)?.permanent_employee_state)} />
            <InfoCell icon={MapPin} title="Area" value={val((doctorEmployee as any)?.permanent_employee_area)} />
            
          </div>
        </Section>

        {/* EMERGENCY CONTACT */}
        <Section title="Emergency Contact">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoCell icon={User} title="Contact Name" value={val(doctorEmployee?.emergency_contact_name)} />
            <InfoCell icon={Phone} title="Relation" value={val(doctorEmployee?.emergency_contact_relationship)} />
            <InfoCell icon={Phone} title="Contact Number" value={val(doctorEmployee?.emergency_contact_number)} />
          </div>
        </Section>

        {/* IDENTITY DOCUMENTS */}
        <Section title="Identity Documents">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoCell icon={IdCard} title="Aadhaar No" value={val(doctorEmployee?.aadhaar_no)} />
            <InfoCell icon={FileText} title="PAN No" value={val(doctorEmployee?.pan_no)} />
            <InfoCell icon={FileText} title="Passport No" value={val(doctorEmployee?.passport_no)} />
          </div>
        </Section>
      </main>
    </div>
  );
}