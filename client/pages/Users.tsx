import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeeApi } from "@/api/employee.api";
import { hospitalApi } from "@/api/hospital.api";
import { branchApi } from "@/api/branch.api";
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
  Users,
  UserPlus,
  Shield,
  Loader2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type UserRecord = {
  user_id: string;
  username: string;
  role_type: string;
  role: string;
  employee_id: string | null;
  hospital_id: string | null;
  hospital_name: string | null;
  branch_id: string | null;
  branch_name: string | null;
  emp_status: boolean | null;
  user_status: number;
  created_at: string | null;
};

export default function UsersPage() {
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
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [selectedRole, setSelectedRole] = useState("BRANCH_ADMIN");
  const [selectedHospital, setSelectedHospital] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");

  const formState = {
    username: "",
    password: "",
    role_type: "BRANCH_ADMIN",
    employee_id: "",
    first_name: "",
    last_name: "",
    email: "",
    mobile_no: "",
    designation: "Branch Admin",
    department_id: "",
  };

  const [formData, setFormData] = useState(formState);

  const { data: usersData } = useQuery({
    queryKey: ["users-all"],
    queryFn: async () => {
      const res = await employeeApi.getAll({ limit: 200, page: 1 });
      return res.data?.data ?? [];
    },
  });

  const { data: hospitalsData } = useQuery({
    queryKey: ["hospitals-for-users"],
    queryFn: async () => {
      const res = await hospitalApi.getAll(1, 100);
      return res.data?.data ?? [];
    },
  });

  const { data: branchesData } = useQuery({
    queryKey: ["branches-for-users"],
    queryFn: async () => {
      const res = await branchApi.getAll();
      return res.data?.data ?? [];
    },
  });

  // Note: User creation/update requires a userApi which doesn't exist yet.
  // For now, the page is read-only - displaying users from employee data.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Not Available", description: "User creation/update requires backend API not yet implemented", variant: "destructive" });
  };

  const handleEdit = (userRecord: UserRecord) => {
    setEditingUser(userRecord);
    setFormData({
      username: userRecord.username,
      password: "",
      role_type: userRecord.role_type || "BRANCH_ADMIN",
      employee_id: userRecord.employee_id || "",
      first_name: "",
      last_name: "",
      email: "",
      mobile_no: "",
      designation: "Branch Admin",
      department_id: "",
    });
    setSelectedRole(userRecord.role_type || "BRANCH_ADMIN");
    setSelectedHospital(userRecord.hospital_id || "");
    setSelectedBranch(userRecord.branch_id || "");
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setEditingUser(null);
    resetForm();
    setSelectedRole("BRANCH_ADMIN");
    setSelectedHospital("");
    setSelectedBranch("");
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData(formState);
  };

  const filteredUsers = usersData?.filter((u: UserRecord) =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.hospital_name && u.hospital_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.branch_name && u.branch_name.toLowerCase().includes(searchTerm.toLowerCase()))
  ) ?? [];

  const roles = [
    { value: "SUPER_ADMIN", label: "Super Admin" },
    { value: "HEAD_ADMIN", label: "Head Admin" },
    { value: "BRANCH_ADMIN", label: "Branch Admin" },
    { value: "ADMIN", label: "Staff Admin" },
    { value: "DOCTOR", label: "Doctor" },
    { value: "NURSE", label: "Nurse" },
    { value: "PHARMACIST", label: "Pharmacist" },
    { value: "LAB_TECHNICIAN", label: "Lab Technician" },
    { value: "RECEPTIONIST", label: "Receptionist" },
    { value: "STAFF", label: "Staff" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-slate-500 mt-1">Manage system users and roles</p>
        </div>
        <Button onClick={handleNew} className="gap-2">
          <UserPlus className="w-4 h-4" />
          Add User
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <Input
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 text-left text-sm font-medium text-slate-500">
                  <th className="pb-3 px-4">User ID</th>
                  <th className="pb-3 px-4">Username</th>
                  <th className="pb-3 px-4">Role</th>
                  <th className="pb-3 px-4">Hospital</th>
                  <th className="pb-3 px-4">Branch</th>
                  <th className="pb-3 px-4">Status</th>
                  <th className="pb-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.user_id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-4 px-4 font-mono text-sm text-slate-600">{u.user_id}</td>
                    <td className="py-4 px-4 font-medium text-slate-900">{u.username}</td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-1 rounded-full text-xs font-medium
                        {u.role_type === 'SUPER_ADMIN' ? 'bg-red-100 text-red-700' :
                         u.role_type === 'HEAD_ADMIN' ? 'bg-orange-100 text-orange-700' :
                         u.role_type === 'BRANCH_ADMIN' ? 'bg-blue-100 text-blue-700' :
                         u.role_type === 'DOCTOR' ? 'bg-green-100 text-green-700' :
                         'bg-slate-100 text-slate-700'}">
                        {u.role_type}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-600">{u.hospital_name || "—"}</td>
                    <td className="py-4 px-4 text-slate-600">{u.branch_name || "—"}</td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.user_status === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {u.user_status === 0 ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(u)}
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Create New User"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 p-4">
              <div>
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="e.g., john_doe"
                  required
                  disabled={!!editingUser}
                />
              </div>

              <div>
                <Label htmlFor="password">{editingUser ? "New Password (leave blank to keep)" : "Password *"}</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? "••••••••" : "Enter password"}
                  required={!editingUser}
                />
              </div>

              <div>
                <Label htmlFor="role_type">Role *</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="hospital_id">Hospital</Label>
                <Select value={selectedHospital} onValueChange={setSelectedHospital}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select hospital" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— None —</SelectItem>
                    {hospitalsData?.map((h) => (
                      <SelectItem key={h.hospital_id} value={h.hospital_id}>{h.hospital_name} ({h.hospital_id})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="branch_id">Branch</Label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— None —</SelectItem>
                    {branchesData?.map((b: any) => (
                      <SelectItem key={b.branch_id} value={b.branch_id}>{b.branch_name} ({b.branch_id})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled>
                Not Available
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}