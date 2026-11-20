import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import API from "@/api/axios";
import { hospitalApi } from "@/api/hospital.api";
import { useToast } from "@/hooks/use-toast";
import { getUser } from "@/utils/token";
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
import {
  UserPlus,
  Building2,
  Plus,
  Shield,
  Loader2,
  LayoutGrid,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SuperAdminForm = {
  username: string;
  password: string;
  email: string;
  first_name: string;
  last_name: string;
};

type HospitalForm = {
  hospital_name: string;
  hospital_address: string | null;
  contact_number: string | null;
  email_id: string | null;
  website_address: string | null;
  hospital_type: string | null;
  hospital_license_no: string | null;
  hospital_country: string | null;
  hospital_state: string | null;
  hospital_district: string | null;
  hospital_area: string | null;
  pincode: string | null;
  timezone: string | null;
};

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const user = getUser();
  if (!user || user.role_type !== "SYSTEM_OWNER") {
    navigate("/owner-login", { replace: true });
    return null;
  }

  const [activeTab, setActiveTab] = useState<"super-admin" | "hospital">("super-admin");

  // ---- Create Super Admin ----
  const [saForm, setSaForm] = useState<SuperAdminForm>({
    username: "",
    password: "",
    email: "",
    first_name: "",
    last_name: "",
  });

  const [saDialogOpen, setSaDialogOpen] = useState(false);

  const createSuperAdminMutation = useMutation({
    mutationFn: async (data: SuperAdminForm) => {
      const res = await API.post("/auth/create-super-admin", {
        username: data.username,
        password: data.password,
        email: data.email || null,
        first_name: data.first_name || null,
        last_name: data.last_name || null,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admins"] });
      toast({ title: "Success", description: "Super Admin created successfully" });
      setSaDialogOpen(false);
      setSaForm({ username: "", password: "", email: "", first_name: "", last_name: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create Super Admin",
        variant: "destructive",
      });
    },
  });

  const handleSaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSuperAdminMutation.mutate(saForm);
  };

  // ---- Create Hospital ----
  const [hospForm, setHospForm] = useState<HospitalForm>({
    hospital_name: "",
    hospital_address: "",
    contact_number: "",
    email_id: "",
    website_address: "",
    hospital_type: "",
    hospital_license_no: "",
    hospital_country: "India",
    hospital_state: "Tamil nadu",
    hospital_district: "Chennai",
    hospital_area: "Tambaram",
    pincode: "",
    timezone: "Asia/Kolkata",
  });

  const [hospDialogOpen, setHospDialogOpen] = useState(false);

  const createHospitalMutation = useMutation({
    mutationFn: (data: HospitalForm) => hospitalApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hospitals"] });
      toast({ title: "Success", description: "Hospital created successfully" });
      setHospDialogOpen(false);
      setHospForm({
        hospital_name: "",
        hospital_address: "",
        contact_number: "",
        email_id: "",
        website_address: "",
        hospital_type: "",
        hospital_license_no: "",
        hospital_country: "India",
        hospital_state: "Tamil nadu",
        hospital_district: "Chennai",
        hospital_area: "Tambaram",
        pincode: "",
        timezone: "Asia/Kolkata",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create Hospital",
        variant: "destructive",
      });
    },
  });

  const handleHospSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createHospitalMutation.mutate(hospForm);
  };

  // ---- Stats ----
  const { data: hospitalsData } = useQuery({
    queryKey: ["hospitals"],
    queryFn: async () => {
      const res = await hospitalApi.getAll(1, 100);
      return res.data?.data ?? [];
    },
  });

  const totalHospitals = hospitalsData?.length ?? 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Owner Dashboard</h1>
          <p className="text-slate-500 mt-1">
            Manage Super Admins and Hospitals across the system.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Shield className="w-3 h-3" />
          <span>Logged in as {user.username} (System Owner)</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Hospitals</p>
                <p className="text-3xl font-bold text-slate-900">{totalHospitals}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                <Building2 className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Create Super Admin Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Create Super Admin
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <p className="text-sm text-slate-500 mb-4">
              Create a Super Admin user who can manage Hospitals, Branches, and Users.
            </p>
            <Button
              onClick={() => setSaDialogOpen(true)}
              className="w-full gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Super Admin
            </Button>
          </CardContent>
        </Card>

        {/* Create Hospital Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Create Hospital
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <p className="text-sm text-slate-500 mb-4">
              Create a new hospital. Each hospital gets its own ID (HSPxxx) and can have multiple branches.
            </p>
            <Button
              onClick={() => setHospDialogOpen(true)}
              className="w-full gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Hospital
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Hospitals List */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Hospitals ({totalHospitals})</CardTitle>
        </CardHeader>
        <CardContent>
          {totalHospitals === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Building2 className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p>No hospitals yet. Create your first hospital above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-sm font-medium text-slate-500">
                    <th className="pb-3 px-4">Hospital ID</th>
                    <th className="pb-3 px-4">Name</th>
                    <th className="pb-3 px-4">Address</th>
                    <th className="pb-3 px-4">Contact</th>
                    <th className="pb-3 px-4">Timezone</th>
                  </tr>
                </thead>
                <tbody>
                  {hospitalsData?.map((h: any) => (
                    <tr key={h.hospital_id} className="border-b border-slate-100">
                      <td className="py-4 px-4 font-mono text-sm text-slate-600">{h.hospital_id}</td>
                      <td className="py-4 px-4 font-medium text-slate-900">{h.hospital_name}</td>
                      <td className="py-4 px-4 text-slate-600 max-w-xs truncate">{h.Hospital_address || "—"}</td>
                      <td className="py-4 px-4 text-slate-600">{h.contact_number || "—"}</td>
                      <td className="py-4 px-4 text-slate-600 text-sm font-mono">{h.timezone || "Asia/Kolkata"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Super Admin Dialog */}
      <Dialog open={saDialogOpen} onOpenChange={setSaDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Super Admin</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaSubmit}>
            <div className="space-y-4 p-4">
              <div>
                <Label htmlFor="sa_username">Username *</Label>
                <Input
                  id="sa_username"
                  value={saForm.username}
                  onChange={(e) => setSaForm({ ...saForm, username: e.target.value })}
                  placeholder="e.g., superadmin"
                  required
                />
              </div>
              <div>
                <Label htmlFor="sa_password">Password *</Label>
                <Input
                  id="sa_password"
                  type="password"
                  value={saForm.password}
                  onChange={(e) => setSaForm({ ...saForm, password: e.target.value })}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div>
                <Label htmlFor="sa_email">Email</Label>
                <Input
                  id="sa_email"
                  type="email"
                  value={saForm.email}
                  onChange={(e) => setSaForm({ ...saForm, email: e.target.value })}
                  placeholder="admin@hospital.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sa_first_name">First Name</Label>
                  <Input
                    id="sa_first_name"
                    value={saForm.first_name}
                    onChange={(e) => setSaForm({ ...saForm, first_name: e.target.value })}
                    placeholder="Super"
                  />
                </div>
                <div>
                  <Label htmlFor="sa_last_name">Last Name</Label>
                  <Input
                    id="sa_last_name"
                    value={saForm.last_name}
                    onChange={(e) => setSaForm({ ...saForm, last_name: e.target.value })}
                    placeholder="Admin"
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setSaDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createSuperAdminMutation.isPending}>
                {createSuperAdminMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  "Create Super Admin"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Hospital Dialog */}
      <Dialog open={hospDialogOpen} onOpenChange={setHospDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Hospital</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleHospSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              <div className="md:col-span-2">
                <Label htmlFor="hosp_name">Hospital Name *</Label>
                <Input
                  id="hosp_name"
                  value={hospForm.hospital_name}
                  onChange={(e) => setHospForm({ ...hospForm, hospital_name: e.target.value })}
                  placeholder="e.g., Apollo Hospital"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="hosp_address">Address</Label>
                <Input
                  id="hosp_address"
                  value={hospForm.hospital_address || ""}
                  onChange={(e) => setHospForm({ ...hospForm, hospital_address: e.target.value })}
                  placeholder="Full address"
                />
              </div>
              <div>
                <Label htmlFor="hosp_contact">Contact Number</Label>
                <Input
                  id="hosp_contact"
                  value={hospForm.contact_number || ""}
                  onChange={(e) => setHospForm({ ...hospForm, contact_number: e.target.value })}
                  placeholder="+91 XXXXXXXXXX"
                />
              </div>
              <div>
                <Label htmlFor="hosp_email">Email</Label>
                <Input
                  id="hosp_email"
                  type="email"
                  value={hospForm.email_id || ""}
                  onChange={(e) => setHospForm({ ...hospForm, email_id: e.target.value })}
                  placeholder="hospital@example.com"
                />
              </div>
              <div>
                <Label htmlFor="hosp_website">Website</Label>
                <Input
                  id="hosp_website"
                  value={hospForm.website_address || ""}
                  onChange={(e) => setHospForm({ ...hospForm, website_address: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <Label htmlFor="hosp_type">Type</Label>
                <Input
                  id="hosp_type"
                  value={hospForm.hospital_type || ""}
                  onChange={(e) => setHospForm({ ...hospForm, hospital_type: e.target.value })}
                  placeholder="e.g., Multi-specialty"
                />
              </div>
              <div>
                <Label htmlFor="hosp_license">License No</Label>
                <Input
                  id="hosp_license"
                  value={hospForm.hospital_license_no || ""}
                  onChange={(e) => setHospForm({ ...hospForm, hospital_license_no: e.target.value })}
                  placeholder="License number"
                />
              </div>
              <div>
                <Label htmlFor="hosp_pincode">Pincode</Label>
                <Input
                  id="hosp_pincode"
                  value={hospForm.pincode || ""}
                  onChange={(e) => setHospForm({ ...hospForm, pincode: e.target.value })}
                  placeholder="600001"
                />
              </div>
              <div>
                <Label htmlFor="hosp_timezone">Timezone</Label>
                <Input
                  id="hosp_timezone"
                  value={hospForm.timezone || "Asia/Kolkata"}
                  onChange={(e) => setHospForm({ ...hospForm, timezone: e.target.value })}
                  placeholder="Asia/Kolkata"
                />
              </div>
              <div>
                <Label htmlFor="hosp_country">Country</Label>
                <Input
                  id="hosp_country"
                  value={hospForm.hospital_country || "India"}
                  onChange={(e) => setHospForm({ ...hospForm, hospital_country: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="hosp_state">State</Label>
                <Input
                  id="hosp_state"
                  value={hospForm.hospital_state || "Tamil nadu"}
                  onChange={(e) => setHospForm({ ...hospForm, hospital_state: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="hosp_district">District</Label>
                <Input
                  id="hosp_district"
                  value={hospForm.hospital_district || "Chennai"}
                  onChange={(e) => setHospForm({ ...hospForm, hospital_district: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="hosp_area">Area</Label>
                <Input
                  id="hosp_area"
                  value={hospForm.hospital_area || "Tambaram"}
                  onChange={(e) => setHospForm({ ...hospForm, hospital_area: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setHospDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createHospitalMutation.isPending}>
                {createHospitalMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  "Create Hospital"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}