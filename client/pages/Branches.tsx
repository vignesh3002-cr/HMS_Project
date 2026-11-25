import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { branchApi, Branch } from "@/api/branch.api";
import { hospitalApi } from "@/api/hospital.api";
import { employeeApi } from "@/api/employee.api";
import { getUser } from "@/utils/token";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Edit2,
  Search,
  Building2,
  GitBranch,
  MapPin,
  Loader2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatInBranchTimezone, getTodayInActiveTimezone } from "@/utils/timezone";

// Extended branch type with all fields needed for the form
type BranchRecord = Branch & {
  branch_code: string;
  branch_type: string;
  branch_status: string;
  address: string | null;
  district: string | null;
  state_name: string | null;
  country: string | null;
  city: string | null;
  branch_email: string | null;
  emergency_no: string | null;
  branch_pincode: number | null;
  gst_no: string | null;
  pan_no: string | null;
  website_address: string | null;
  branch_license_no: string | null;
  total_beds: number | null;
  total_no_emp: string | null;
  fax_no: string | null;
  medical_services: string | null;
  branch_area: string | null;
  date_of_establish: string | null;
  timezone: string | null;
  hospital_id: string | null;
  hospital_name: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export default function Branches() {
  const navigate = useNavigate();
  const user = getUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  if (user?.role !== "SUPER_ADMIN" && user?.role_type !== "SUPER_ADMIN") {
    navigate("/dashboard");
    return null;
  }

  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchRecord | null>(null);
  const [selectedHospital, setSelectedHospital] = useState("");

  const formState = {
    branch_code: "",
    branch_name: "",
    branch_type: "Main",
    branch_email: "",
    emergency_number: "",
    address: "",
    district: "",
    state_name: "",
    country: "",
    city: "",
    timezone: "Asia/Kolkata",
    area: "",
    pincode: "",
    license_number: "",
    total_beds: "",
    total_no_emp: "",
    fax_no: "",
    medical_services: "",
    gst_no: "",
    pan_no: "",
    website_address: "",
    date_of_establish: "",
    hospital_id: "",
    admin_mode: "NEW" as "NEW" | "EXISTING",
    admin_user_id: "",
    admin: undefined as any,
  };

  const [formData, setFormData] = useState(formState);

  const { data: branchesData } = useQuery({
    queryKey: ["branches-all"],
    queryFn: async () => {
      const res = await branchApi.getAll();
      return res.data?.data ?? [];
    },
  });

  const { data: hospitalsData } = useQuery({
    queryKey: ["hospitals-for-branches"],
    queryFn: async () => {
      const res = await hospitalApi.getAll(1, 100);
      return res.data?.data ?? [];
    },
  });

  const { data: adminsData } = useQuery({
    queryKey: ["admins-for-branch"],
    queryFn: async () => {
      const res = await employeeApi.getAll({ roleType: "BRANCH_ADMIN", limit: 100, page: 1 });
      return res.data?.data?.data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => branchApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches-all"] });
      toast({ title: "Success", description: "Branch created successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.response?.data?.message || "Failed to create branch", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => branchApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches-all"] });
      toast({ title: "Success", description: "Branch updated successfully" });
      setIsDialogOpen(false);
      setEditingBranch(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.response?.data?.message || "Failed to update branch", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      pincode: formData.pincode ? Number(formData.pincode) : undefined,
      total_beds: formData.total_beds ? Number(formData.total_beds) : undefined,
      admin_mode: formData.admin_mode,
      admin_user_id: formData.admin_mode === "EXISTING" ? formData.admin_user_id : undefined,
      admin: formData.admin_mode === "NEW" ? formData.admin : undefined,
    };
    if (editingBranch) {
      updateMutation.mutate({ id: editingBranch.branch_id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (branch: BranchRecord) => {
    setEditingBranch(branch);
    setFormData({
      ...formState,
      branch_code: branch.branch_code,
      branch_name: branch.branch_name,
      branch_type: branch.branch_type,
      branch_email: branch.branch_email || "",
      emergency_number: branch.emergency_no || "",
      address: branch.address || "",
      district: branch.district || "",
      state_name: branch.state_name || "",
      country: branch.country || "",
      city: branch.city || "",
      timezone: branch.timezone || "Asia/Kolkata",
      area: branch.branch_area || "",
      pincode: branch.branch_pincode?.toString() || "",
      license_number: branch.branch_license_no || "",
      total_beds: branch.total_beds?.toString() || "",
      total_no_emp: branch.total_no_emp || "",
      fax_no: branch.fax_no || "",
      medical_services: branch.medical_services || "",
      gst_no: branch.gst_no || "",
      pan_no: branch.pan_no || "",
      website_address: branch.website_address || "",
      date_of_establish: branch.date_of_establish ? formatInBranchTimezone(new Date(branch.date_of_establish), "yyyy-MM-dd") : "",
      hospital_id: branch.hospital_id || "",
    });
    setSelectedHospital(branch.hospital_id);
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setEditingBranch(null);
    resetForm();
    setSelectedHospital(user?.hospital_id || "");
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData(formState);
  };

  const filteredBranches = branchesData?.filter((b: Branch) =>
    b.branch_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.branch_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.hospital_name && b.hospital_name.toLowerCase().includes(searchTerm.toLowerCase()))
  ) ?? [];

  const canCreateBranchForAnyHospital = user?.role === "SUPER_ADMIN" || user?.role_type === "SUPER_ADMIN";

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Branches</h1>
          <p className="text-slate-500 mt-1">Manage branches across hospitals</p>
        </div>
        <Button onClick={handleNew} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Branch
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <Input
          placeholder="Search branches..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Branches ({filteredBranches.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 text-left text-sm font-medium text-slate-500">
                  <th className="pb-3 px-4">Branch ID</th>
                  <th className="pb-3 px-4">Name</th>
                  <th className="pb-3 px-4">Hospital</th>
                  <th className="pb-3 px-4">City</th>
                  <th className="pb-3 px-4">Status</th>
                  <th className="pb-3 px-4">Timezone</th>
                  <th className="pb-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBranches.map((branch) => (
                  <tr key={branch.branch_id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-4 px-4 font-mono text-sm text-slate-600">{branch.branch_id}</td>
                    <td className="py-4 px-4 font-medium text-slate-900">{branch.branch_name}</td>
                    <td className="py-4 px-4 text-slate-600">{branch.hospital_name || "—"}</td>
                    <td className="py-4 px-4 text-slate-600 text-sm">{branch.city || "—"}</td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        Active
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-600 text-sm font-mono">
                      {branch.timezone || "Asia/Kolkata"}
                    </td>
                    <td className="py-4 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(branch as BranchRecord)}
                        className="text-slate-600 hover:text-blue-600"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBranch ? "Edit Branch" : "Create New Branch"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              <div className="md:col-span-2">
                <Label htmlFor="branch_name">Branch Name *</Label>
                <Input
                  id="branch_name"
                  value={formData.branch_name}
                  onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                  placeholder="e.g., Apollo Hospital - Tambaram"
                  required
                />
              </div>

              <div>
                <Label htmlFor="branch_code">Branch Code *</Label>
                <Input
                  id="branch_code"
                  value={formData.branch_code}
                  onChange={(e) => setFormData({ ...formData, branch_code: e.target.value })}
                  placeholder="e.g., APL-TAM"
                  required
                />
              </div>

              <div>
                <Label htmlFor="branch_type">Branch Type</Label>
                <Select value={formData.branch_type} onValueChange={(v) => setFormData({ ...formData, branch_type: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Main">Main</SelectItem>
                    <SelectItem value="Satellite">Satellite</SelectItem>
                    <SelectItem value="Clinic">Clinic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="hospital_id">Hospital *</Label>
                <Select value={selectedHospital || formData.hospital_id} onValueChange={(v) => { setSelectedHospital(v); setFormData({ ...formData, hospital_id: v }); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select hospital" />
                  </SelectTrigger>
                  <SelectContent>
                    {hospitalsData?.map((h) => (
                      <SelectItem key={h.hospital_id} value={h.hospital_id}>{h.hospital_name} ({h.hospital_id})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!canCreateBranchForAnyHospital && (
                  <p className="text-xs text-slate-500 mt-1">Locked to your hospital: {user?.hospital_name || user?.hospital_id}</p>
                )}
              </div>

              <div>
                <Label htmlFor="branch_email">Email</Label>
                <Input
                  id="branch_email"
                  type="email"
                  value={formData.branch_email}
                  onChange={(e) => setFormData({ ...formData, branch_email: e.target.value })}
                  placeholder="branch@example.com"
                />
              </div>

              <div>
                <Label htmlFor="emergency_number">Emergency Number</Label>
                <Input
                  id="emergency_number"
                  value={formData.emergency_number}
                  onChange={(e) => setFormData({ ...formData, emergency_number: e.target.value })}
                  placeholder="+91 XXXXXXXXXX"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Full address"
                />
              </div>

              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Chennai"
                />
              </div>

              <div>
                <Label htmlFor="district">District</Label>
                <Input
                  id="district"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  placeholder="Chennai"
                />
              </div>

              <div>
                <Label htmlFor="state_name">State</Label>
                <Input
                  id="state_name"
                  value={formData.state_name}
                  onChange={(e) => setFormData({ ...formData, state_name: e.target.value })}
                  placeholder="Tamil nadu"
                />
              </div>

              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="India"
                />
              </div>

              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  placeholder="Asia/Kolkata"
                />
              </div>

              <div>
                <Label htmlFor="area">Area</Label>
                <Input
                  id="area"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  placeholder="Tambaram"
                />
              </div>

              <div>
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  type="number"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  placeholder="600001"
                />
              </div>

              <div>
                <Label htmlFor="license_number">License Number</Label>
                <Input
                  id="license_number"
                  value={formData.license_number}
                  onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                  placeholder="License number"
                />
              </div>

              <div>
                <Label htmlFor="total_beds">Total Beds</Label>
                <Input
                  id="total_beds"
                  type="number"
                  value={formData.total_beds}
                  onChange={(e) => setFormData({ ...formData, total_beds: e.target.value })}
                  placeholder="100"
                />
              </div>

              <div>
                <Label htmlFor="total_no_emp">Total Employees</Label>
                <Input
                  id="total_no_emp"
                  value={formData.total_no_emp}
                  onChange={(e) => setFormData({ ...formData, total_no_emp: e.target.value })}
                  placeholder="50"
                />
              </div>

              <div>
                <Label htmlFor="gst_no">GST Number</Label>
                <Input
                  id="gst_no"
                  value={formData.gst_no}
                  onChange={(e) => setFormData({ ...formData, gst_no: e.target.value })}
                  placeholder="GSTIN"
                />
              </div>

              <div>
                <Label htmlFor="pan_no">PAN Number</Label>
                <Input
                  id="pan_no"
                  value={formData.pan_no}
                  onChange={(e) => setFormData({ ...formData, pan_no: e.target.value })}
                  placeholder="PAN"
                />
              </div>

              <div>
                <Label htmlFor="website_address">Website</Label>
                <Input
                  id="website_address"
                  value={formData.website_address}
                  onChange={(e) => setFormData({ ...formData, website_address: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <Label htmlFor="date_of_establish">Date of Establishment</Label>
                <Input
                  id="date_of_establish"
                  type="date"
                  value={formData.date_of_establish}
                  onChange={(e) => setFormData({ ...formData, date_of_establish: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="medical_services">Medical Services</Label>
                <Input
                  id="medical_services"
                  value={formData.medical_services}
                  onChange={(e) => setFormData({ ...formData, medical_services: e.target.value })}
                  placeholder="Cardiology, Neurology, Oncology"
                />
              </div>

              {/* Admin Mode Section */}
              <div className="md:col-span-2 border-t pt-4 mt-4">
                <h3 className="font-semibold text-slate-900 mb-3">Branch Admin</h3>
                <div>
                  <Label htmlFor="admin_mode">Admin Mode</Label>
                  <Select value={formData.admin_mode} onValueChange={(v) => setFormData({ ...formData, admin_mode: v as "NEW" | "EXISTING" })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select admin mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NEW">Create New Admin</SelectItem>
                      <SelectItem value="EXISTING">Assign Existing Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.admin_mode === "EXISTING" && (
                  <div className="mt-3">
                    <Label htmlFor="admin_user_id">Select Existing Admin *</Label>
                    <Select value={formData.admin_user_id} onValueChange={(v) => setFormData({ ...formData, admin_user_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select admin" />
                      </SelectTrigger>
                      <SelectContent>
                        {adminsData?.map((a: any) => (
                          <SelectItem key={a.employee_id} value={a.employee_id}>
                            {a.first_name} {a.last_name} ({a.employee_id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.admin_mode === "NEW" && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="admin_first_name">First Name *</Label>
                      <Input
                        id="admin_first_name"
                        value={formData.admin?.first_name || ""}
                        onChange={(e) => setFormData({ ...formData, admin: { ...formData.admin, first_name: e.target.value } })}
                        placeholder="John"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="admin_last_name">Last Name *</Label>
                      <Input
                        id="admin_last_name"
                        value={formData.admin?.last_name || ""}
                        onChange={(e) => setFormData({ ...formData, admin: { ...formData.admin, last_name: e.target.value } })}
                        placeholder="Doe"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="admin_email">Email *</Label>
                      <Input
                        id="admin_email"
                        type="email"
                        value={formData.admin?.email || ""}
                        onChange={(e) => setFormData({ ...formData, admin: { ...formData.admin, email: e.target.value } })}
                        placeholder="admin@example.com"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="admin_mobile">Mobile *</Label>
                      <Input
                        id="admin_mobile"
                        value={formData.admin?.mobile_no || ""}
                        onChange={(e) => setFormData({ ...formData, admin: { ...formData.admin, mobile_no: e.target.value } })}
                        placeholder="+91 XXXXXXXXXX"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="admin_username">Username *</Label>
                      <Input
                        id="admin_username"
                        value={formData.admin?.username || ""}
                        onChange={(e) => setFormData({ ...formData, admin: { ...formData.admin, username: e.target.value } })}
                        placeholder="john_doe"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="admin_password">Password *</Label>
                      <Input
                        id="admin_password"
                        type="password"
                        value={formData.admin?.password || ""}
                        onChange={(e) => setFormData({ ...formData, admin: { ...formData.admin, password: e.target.value } })}
                        placeholder="••••••••"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="admin_designation">Designation</Label>
                      <Input
                        id="admin_designation"
                        value={formData.admin?.designation || "Branch Admin"}
                        onChange={(e) => setFormData({ ...formData, admin: { ...formData.admin, designation: e.target.value } })}
                        placeholder="Branch Admin"
                      />
                    </div>
                    <div>
                      <Label htmlFor="admin_department">Department</Label>
                      <Input
                        id="admin_department"
                        value={formData.admin?.department_id || ""}
                        onChange={(e) => setFormData({ ...formData, admin: { ...formData.admin, department_id: e.target.value } })}
                        placeholder="Department ID"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  editingBranch ? "Update" : "Create"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}