import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hospitalApi, CreateHospitalPayload, UpdateHospitalPayload, HospitalRecord } from "@/api/hospital.api";
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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Edit2,
  Search,
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Loader2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

export default function Hospitals() {
  const navigate = useNavigate();
  const user = getUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Role check
  if (user?.role !== "SUPER_ADMIN" && user?.role_type !== "SUPER_ADMIN") {
    navigate("/dashboard");
    return null;
  }

  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHospital, setEditingHospital] = useState<HospitalRecord | null>(null);

  const formState: CreateHospitalPayload | UpdateHospitalPayload = {
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
  };

  const [formData, setFormData] = useState(formState);

  const { data: hospitalsData, isLoading } = useQuery({
    queryKey: ["hospitals"],
    queryFn: async () => {
      const res = await hospitalApi.getAll(1, 100);
      return res.data?.data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateHospitalPayload) => hospitalApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hospitals"] });
      toast({ title: "Success", description: "Hospital created successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.response?.data?.message || "Failed to create hospital", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateHospitalPayload }) => hospitalApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hospitals"] });
      toast({ title: "Success", description: "Hospital updated successfully" });
      setIsDialogOpen(false);
      setEditingHospital(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.response?.data?.message || "Failed to update hospital", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingHospital) {
      updateMutation.mutate({ id: editingHospital.hospital_id, data: formData as UpdateHospitalPayload });
    } else {
      createMutation.mutate(formData as CreateHospitalPayload);
    }
  };

  const handleEdit = (hospital: HospitalRecord) => {
    setEditingHospital(hospital);
    setFormData({
      hospital_name: hospital.hospital_name,
      hospital_address: hospital.Hospital_address || "",
      contact_number: hospital.contact_number || "",
      email_id: hospital.email_id || "",
      website_address: hospital.website_address || "",
      hospital_type: hospital.hospital_type || "",
      hospital_license_no: hospital.hospital_license_no || "",
      hospital_country: hospital.hospital_country || "India",
      hospital_state: hospital.hospital_state || "Tamil nadu",
      hospital_district: hospital.hospital_district || "Chennai",
      hospital_area: hospital.hospital_area || "Tambaram",
      pincode: hospital.pincode || "",
      timezone: hospital.timezone || "Asia/Kolkata",
    });
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setEditingHospital(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData(formState);
  };

  const filteredHospitals = hospitalsData?.filter((h) =>
    h.hospital_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.hospital_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (h.Hospital_address && h.Hospital_address.toLowerCase().includes(searchTerm.toLowerCase()))
  ) ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hospitals</h1>
          <p className="text-slate-500 mt-1">Manage hospitals in the system</p>
        </div>
        <Button onClick={handleNew} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Hospital
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <Input
          placeholder="Search hospitals..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Hospitals Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Hospitals ({filteredHospitals.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : filteredHospitals.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Building2 className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-lg">No hospitals found</p>
              <p className="text-sm">Click "Add Hospital" to create the first one</p>
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
                    <th className="pb-3 px-4">Location</th>
                    <th className="pb-3 px-4">Branches</th>
                    <th className="pb-3 px-4">Timezone</th>
                    <th className="pb-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHospitals.map((hospital) => (
                    <tr key={hospital.hospital_id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-4 px-4 font-mono text-sm text-slate-600">{hospital.hospital_id}</td>
                      <td className="py-4 px-4 font-medium text-slate-900">{hospital.hospital_name}</td>
                      <td className="py-4 px-4 text-slate-600 max-w-xs truncate">
                        {hospital.Hospital_address || "—"}
                      </td>
                      <td className="py-4 px-4 text-slate-600">
                        <div className="flex items-center gap-1 text-sm">
                          {hospital.contact_number && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              {hospital.contact_number}
                            </span>
                          )}
                          {hospital.email_id && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              {hospital.email_id}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-600 text-sm">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {hospital.hospital_district || "—"},{" "}
                          {hospital.hospital_state || "—"},{" "}
                          {hospital.hospital_country || "—"}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-600 text-center">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {hospital.branch_count ?? 0}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-600 text-sm font-mono">
                        {hospital.timezone || "Asia/Kolkata"}
                      </td>
                      <td className="py-4 px-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(hospital)}
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
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Hospital Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingHospital ? "Edit Hospital" : "Create New Hospital"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              <div className="md:col-span-2">
                <Label htmlFor="hospital_name">Hospital Name *</Label>
                <Input
                  id="hospital_name"
                  value={formData.hospital_name}
                  onChange={(e) => setFormData({ ...formData, hospital_name: e.target.value })}
                  placeholder="e.g., Apollo Hospital"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="hospital_address">Address</Label>
                <Input
                  id="hospital_address"
                  value={formData.hospital_address || ""}
                  onChange={(e) => setFormData({ ...formData, hospital_address: e.target.value })}
                  placeholder="Full address"
                />
              </div>

              <div>
                <Label htmlFor="contact_number">Contact Number</Label>
                <Input
                  id="contact_number"
                  value={formData.contact_number || ""}
                  onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                  placeholder="+91 XXXXXXXXXX"
                />
              </div>

              <div>
                <Label htmlFor="email_id">Email</Label>
                <Input
                  id="email_id"
                  type="email"
                  value={formData.email_id || ""}
                  onChange={(e) => setFormData({ ...formData, email_id: e.target.value })}
                  placeholder="hospital@example.com"
                />
              </div>

              <div>
                <Label htmlFor="website_address">Website</Label>
                <Input
                  id="website_address"
                  value={formData.website_address || ""}
                  onChange={(e) => setFormData({ ...formData, website_address: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <Label htmlFor="hospital_type">Type</Label>
                <Input
                  id="hospital_type"
                  value={formData.hospital_type || ""}
                  onChange={(e) => setFormData({ ...formData, hospital_type: e.target.value })}
                  placeholder="e.g., Multi-specialty, Cancer Center"
                />
              </div>

              <div>
                <Label htmlFor="hospital_license_no">License No</Label>
                <Input
                  id="hospital_license_no"
                  value={formData.hospital_license_no || ""}
                  onChange={(e) => setFormData({ ...formData, hospital_license_no: e.target.value })}
                  placeholder="License number"
                />
              </div>

              <div>
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  value={formData.pincode || ""}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  placeholder="600001"
                />
              </div>

              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={formData.timezone || "Asia/Kolkata"}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  placeholder="Asia/Kolkata"
                />
              </div>

              <div>
                <Label htmlFor="hospital_country">Country</Label>
                <Input
                  id="hospital_country"
                  value={formData.hospital_country || "India"}
                  onChange={(e) => setFormData({ ...formData, hospital_country: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="hospital_state">State</Label>
                <Input
                  id="hospital_state"
                  value={formData.hospital_state || "Tamil nadu"}
                  onChange={(e) => setFormData({ ...formData, hospital_state: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="hospital_district">District</Label>
                <Input
                  id="hospital_district"
                  value={formData.hospital_district || "Chennai"}
                  onChange={(e) => setFormData({ ...formData, hospital_district: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="hospital_area">Area</Label>
                <Input
                  id="hospital_area"
                  value={formData.hospital_area || "Tambaram"}
                  onChange={(e) => setFormData({ ...formData, hospital_area: e.target.value })}
                />
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
                  editingHospital ? "Update" : "Create"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}