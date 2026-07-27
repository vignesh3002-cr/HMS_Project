import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Building2, Loader2, Check, ShieldCheck } from "lucide-react";
import { branchApi, CurrentBranchAdmin } from "@/api/branch.api";
import { useToast } from "@/hooks/use-toast";
import { FormDropdown } from "@/components/ui/form-dropdown";
import { CountryStateCitySelect } from "@/components/ui/CountryStateCitySelect";

interface BranchFormData {
  branchCode: string;
  branchName: string;
  branchType: string;
  area: string;
  state: string;
  district: string;
  country: string;
  pincode: string;
  licenseNumber: string;
  emergencyNumber: string;
  email: string;
  address: string;
  dateOfEstablish: string;
  totalBeds: string;
  totalEmployees: string;
  faxNo: string;
  gstNo: string;
  panNo: string;
  websiteAddress: string;
  medicalServices: string;
}

const emptyFormData: BranchFormData = {
  branchCode: "",
  branchName: "",
  branchType: "",
  area: "",
  state: "",
  district: "",
  country: "",
  pincode: "",
  licenseNumber: "",
  emergencyNumber: "",
  email: "",
  address: "",
  dateOfEstablish: "",
  totalBeds: "",
  totalEmployees: "",
  faxNo: "",
  gstNo: "",
  panNo: "",
  websiteAddress: "",
  medicalServices: "",
};

const branchRequired: { key: keyof BranchFormData; label: string }[] = [
  { key: "branchCode", label: "Branch Code" },
  { key: "branchName", label: "Branch Name" },
  { key: "branchType", label: "Branch Type" },
  { key: "area", label: "Area" },
  { key: "state", label: "State" },
  { key: "district", label: "District" },
  { key: "country", label: "Country" },
  { key: "licenseNumber", label: "License Number" },
  { key: "emergencyNumber", label: "Emergency Number" },
  { key: "dateOfEstablish", label: "Date of Establish" },
  { key: "email", label: "Email" },
  { key: "address", label: "Address" },
  { key: "medicalServices", label: "Medical Services" },
  { key: "totalBeds", label: "Total Beds" },
  { key: "totalEmployees", label: "Total Employees" },
  { key: "gstNo", label: "GST No" },
  { key: "panNo", label: "PAN No" },
  { key: "pincode", label: "Pincode" },
  { key: "faxNo", label: "Fax Number" },
  { key: "websiteAddress", label: "Website Address" },
];

// ─── Shared style tokens — matches AddBranch.tsx / Addemployee.tsx conventions ─

const inputCls =
  "w-full h-10 px-4 bg-white border border-gray-200 rounded-xl text-[13.5px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-[3px] focus:ring-blue-500/15 focus:border-blue-500 transition-all duration-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed";

const labelCls = "block text-[12.5px] font-semibold text-gray-700 mb-1.5";

const Req = () => <span className="text-red-600 ml-0.5">*</span>;

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

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  return words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

export default function EditBranch() {
  const navigate = useNavigate();
  const { id: branchId } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState<BranchFormData>(emptyFormData);
  const [currentAdmin, setCurrentAdmin] = useState<CurrentBranchAdmin | null>(null);

  // Fetch branch details on mount via GET /branch/:branchId, which returns
  // the full branch row (all columns) plus the currently-assigned admin
  // (current_admin, or null if the branch has none) — not just the subset
  // GET /branch (list) exposes.
  useEffect(() => {
    if (!branchId) return;

    branchApi
      .getById(branchId)
      .then((res) => {
        const branch = res.data?.data;

        if (branch) {
          setFormData((prev) => ({
            ...prev,
            branchCode: branch.branch_code || "",
            branchName: branch.branch_name || "",
            branchType: branch.branch_type || "",
            area: branch.branch_area || "",
            state: branch.state_name || "",
            district: branch.district || "",
            // Some existing branch rows have no country saved; every branch in
            // this system is in India, so default to that rather than leaving
            // the Country/State/District selector unable to resolve anything.
            country: branch.country || "India",
            pincode: branch.branch_pincode != null ? String(branch.branch_pincode) : "",
            licenseNumber: branch.branch_license_no || "",
            emergencyNumber: branch.emergency_no || "",
            email: branch.branch_email || "",
            address: branch.address || "",
            dateOfEstablish: branch.date_of_establish
              ? String(branch.date_of_establish).slice(0, 10)
              : "",
            totalBeds: branch.total_beds != null ? String(branch.total_beds) : "",
            totalEmployees: branch.total_no_emp || "",
            faxNo: branch.fax_no || "",
            gstNo: branch.gst_no || "",
            panNo: branch.pan_no || "",
            websiteAddress: branch.website_address || "",
            medicalServices: branch.medical_services || "",
          }));
          setCurrentAdmin(branch.current_admin ?? null);
        } else {
          toast({
            title: "Branch not found",
            description: "Could not find this branch.",
            variant: "destructive",
          });
        }
      })
      .catch(() => {
        toast({
          title: "Failed to load branch",
          description: "Could not fetch branch details.",
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
  }, [branchId, toast]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!branchId) return;

    const missing = branchRequired.find((f) => !formData[f.key].trim());
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
      const payload: any = {
        branch_code: formData.branchCode,
        branch_name: formData.branchName,
        branch_type: formData.branchType,
        email: formData.email,
        emergency_number: formData.emergencyNumber,
        address: formData.address,
        district: formData.district,
        state_name: formData.state,
        country: formData.country,
        area: formData.area,
        pincode: formData.pincode ? Number(formData.pincode) : undefined,
        license_number: formData.licenseNumber,
        total_beds: formData.totalBeds ? Number(formData.totalBeds) : undefined,
        total_no_emp: formData.totalEmployees || undefined,
        fax_no: formData.faxNo || undefined,
        gst_no: formData.gstNo || undefined,
        pan_no: formData.panNo || undefined,
        website_address: formData.websiteAddress || undefined,
        date_of_establish: formData.dateOfEstablish || undefined,
        medical_services: formData.medicalServices,
      };

      const response = await branchApi.update(branchId, payload);

      if (!response.data.success) {
        throw new Error(response.data.message);
      }

      toast({
        title: "Branch updated",
        description: `${formData.branchName} was updated successfully.`,
      });

      navigate(-1);
    } catch (error: any) {
      toast({
        title: "Failed to update branch",
        description:
          error.response?.data?.message ?? error.message ?? "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    toast({
      title: "Reset",
      description: "Please reload the page to reset to original values.",
      variant: "default",
    });
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
            <Building2 className="w-5 h-5" />
          </div>
          <h4 className="hms-heading text-gray-900 tracking-tight">Edit Branch</h4>
        </div>

        {/* ── Body ── */}
        <form onSubmit={handleSubmit} className="px-8 pt-7 pb-8">
          {/* ── Branch information ── */}
          <Section
            title="Branch information"
            sub="Core identity and licensing details for the branch."
          >
            <div className="grid grid-cols-3 gap-x-5 gap-y-[18px]">
              <div>
                <label className={labelCls}>Branch Code <Req /></label>
                <input
                  type="text"
                  name="branchCode"
                  placeholder="Enter Branch Code"
                  className={inputCls}
                  value={formData.branchCode}
                  disabled
                />
              </div>
              <div>
                <label className={labelCls}>Branch Name <Req /></label>
                <input
                  type="text"
                  name="branchName"
                  placeholder="Enter Branch Name"
                  className={inputCls}
                  value={formData.branchName}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Branch Type <Req /></label>
                <FormDropdown
                  name="branchType"
                  className={inputCls}
                  options={["Main", "Child"]}
                  value={formData.branchType}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, branchType: val }))}
                  placeholder="Select Branch Type"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className={labelCls}>License Number <Req /></label>
                <input
                  type="text"
                  name="licenseNumber"
                  placeholder="Enter License Number"
                  className={inputCls}
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Emergency Number <Req /></label>
                <input
                  type="text"
                  name="emergencyNumber"
                  placeholder="Enter Emergency Number"
                  className={inputCls}
                  value={formData.emergencyNumber}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Date of Establish <Req /></label>
                <input
                  type="date"
                  name="dateOfEstablish"
                  className={inputCls + " text-gray-500"}
                  value={formData.dateOfEstablish}
                  disabled
                />
              </div>

              <div>
                <label className={labelCls}>Email <Req /></label>
                <input
                  type="email"
                  name="email"
                  placeholder="Enter Email"
                  className={inputCls}
                  value={formData.email}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Fax Number <Req /></label>
                <input
                  type="text"
                  name="faxNo"
                  placeholder="Enter Fax Number"
                  className={inputCls}
                  value={formData.faxNo}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div className="col-span-3">
                <label className={labelCls}>Website Address <Req /></label>
                <input
                  type="text"
                  name="websiteAddress"
                  placeholder="Enter Website Address"
                  className={inputCls}
                  value={formData.websiteAddress}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
            </div>
          </Section>

          {/* ── Location ── */}
          <Section
            title="Location"
            sub="Country, state, district and residential details."
          >
            <div className="grid grid-cols-3 gap-x-5 gap-y-[18px]">
              <div className="col-span-3">
                <CountryStateCitySelect
                  country={formData.country}
                  state={formData.state}
                  district={formData.district}
                  onCountryChange={(country) => setFormData((prev) => ({ ...prev, country }))}
                  onStateChange={(state) => setFormData((prev) => ({ ...prev, state }))}
                  onDistrictChange={(district) => setFormData((prev) => ({ ...prev, district }))}
                  disabled={submitting}
                  required
                />
              </div>

              <div>
                <label className={labelCls}>Area <Req /></label>
                <input
                  type="text"
                  name="area"
                  placeholder="Enter Area"
                  className={inputCls}
                  value={formData.area}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Pincode <Req /></label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  name="pincode"
                  placeholder="Enter Pincode"
                  className={inputCls}
                  value={formData.pincode}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>

              <div className="col-span-3">
                <label className={labelCls}>Address <Req /></label>
                <input
                  type="text"
                  name="address"
                  placeholder="Enter Address"
                  className={inputCls}
                  value={formData.address}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
            </div>
          </Section>

          {/* ── Operational details ── */}
          <Section
            title="Operational details"
            sub="Capacity, registrations and the services offered."
          >
            <div className="grid grid-cols-3 gap-x-5 gap-y-[18px]">
              <div>
                <label className={labelCls}>Total Beds <Req /></label>
                <input
                  type="number"
                  name="totalBeds"
                  placeholder="Enter Total Beds"
                  className={inputCls}
                  value={formData.totalBeds}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Total Employees <Req /></label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  name="totalEmployees"
                  placeholder="Enter Total Employees"
                  className={inputCls}
                  value={formData.totalEmployees}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>GST No <Req /></label>
                <input
                  type="text"
                  name="gstNo"
                  placeholder="Enter GST Number"
                  className={inputCls}
                  value={formData.gstNo}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className={labelCls}>PAN No <Req /></label>
                <input
                  type="text"
                  name="panNo"
                  placeholder="Enter PAN Number"
                  className={inputCls}
                  value={formData.panNo}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Medical Services <Req /></label>
                <textarea
                  name="medicalServices"
                  rows={1}
                  placeholder="Enter Medical Services"
                  className={inputCls + " !h-10 pt-2 resize-none"}
                  value={formData.medicalServices}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
            </div>
          </Section>

          {/* ── Branch admin (read-only) ── */}
          <Section
            title="Branch admin"
            sub="The branch admin currently assigned to this branch — reassignment happens from the Add Branch / branch admin management screen, not here."
          >
            {currentAdmin ? (
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm flex-shrink-0 overflow-hidden">
                  {currentAdmin.employee_photo_URL ? (
                    <img
                      src={currentAdmin.employee_photo_URL}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getInitials(currentAdmin.full_name || currentAdmin.username || "?")
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span className="text-[13px] font-semibold text-gray-800">
                      Current Admin
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-[18px]">
                    <div>
                      <label className={labelCls}>Name</label>
                      <input className={inputCls} value={currentAdmin.full_name || "—"} disabled />
                    </div>
                    <div>
                      <label className={labelCls}>Employee ID</label>
                      <input className={inputCls} value={currentAdmin.employee_id ?? "—"} disabled />
                    </div>
                    <div>
                      <label className={labelCls}>Username</label>
                      <input className={inputCls} value={currentAdmin.username ?? "—"} disabled />
                    </div>
                    <div>
                      <label className={labelCls}>Email</label>
                      <input className={inputCls} value={currentAdmin.email ?? "—"} disabled />
                    </div>
                    <div>
                      <label className={labelCls}>Mobile</label>
                      <input className={inputCls} value={currentAdmin.mobile_no ?? "—"} disabled />
                    </div>
                    <div>
                      <label className={labelCls}>Assigned Since</label>
                      <input
                        className={inputCls}
                        value={
                          currentAdmin.assigned_date
                            ? new Date(currentAdmin.assigned_date).toLocaleDateString()
                            : "—"
                        }
                        disabled
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-gray-500 p-4 bg-gray-50 rounded-xl border border-gray-200">
                No branch admin is currently assigned to this branch.
              </p>
            )}
          </Section>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-4 pt-5 mt-1.5 border-t border-gray-100">
            <button
              type="button"
              onClick={handleReset}
              disabled={submitting}
              className="w-full sm:w-auto h-[42px] px-6 text-[13.5px] font-semibold text-gray-700 border border-gray-300 rounded-xl bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto h-[42px] px-6 text-[13.5px] font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating Branch…
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Update Branch
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
