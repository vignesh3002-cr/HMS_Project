import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { hospitalApi, HospitalRecord } from "@/api/hospital.api";
import { branchApi } from "@/api/branch.api";
import { employeeApi } from "@/api/employee.api";
import { getUser } from "@/utils/token";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "react-router-dom";
import {
  Building2,
  Users,
  UserPlus,
  GitBranch,
  ArrowRight,
} from "lucide-react";

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const user = getUser();

  // Role check - only SUPER_ADMIN can access
  if (user?.role !== "SUPER_ADMIN" && user?.role_type !== "SUPER_ADMIN") {
    navigate("/dashboard");
    return null;
  }

  const { data: hospitalsData } = useQuery({
    queryKey: ["hospitals-all"],
    queryFn: async () => {
      const res = await hospitalApi.getAll(1, 100);
      return res.data?.data ?? [];
    },
  });

  const { data: usersData } = useQuery({
    queryKey: ["users-all"],
    queryFn: async () => {
      const res = await employeeApi.getAll({ limit: 100, page: 1 });
      return res.data?.data ?? [];
    },
  });

  const { data: branchesData } = useQuery({
    queryKey: ["branches-all"],
    queryFn: async () => {
      const res = await branchApi.getAll();
      return res.data?.data ?? [];
    },
  });

  const totalHospitals = hospitalsData?.length ?? 0;
  const totalBranches = branchesData?.length ?? 0;
  const totalUsers = usersData?.length ?? 0;

  const stats = [
    {
      title: "Total Hospitals",
      value: totalHospitals,
      icon: Building2,
      color: "bg-blue-500",
      link: "/hospitals",
    },
    {
      title: "Total Branches",
      value: totalBranches,
      icon: GitBranch,
      color: "bg-green-500",
      link: "/branches",
    },
    {
      title: "Total Users",
      value: totalUsers,
      icon: Users,
      color: "bg-purple-500",
      link: "/users",
    },
    {
      title: "Active Hospitals",
      value: hospitalsData?.filter((h) => h.hospital_type !== "Inactive").length ?? 0,
      icon: Building2,
      color: "bg-orange-500",
      link: "/hospitals",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Super Admin Dashboard</h1>
          <p className="text-slate-500 mt-1">Multi-hospital management overview</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.title} to={stat.link} className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.color} text-white`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm text-slate-500">
                  <span>View details</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/hospitals" className="block">
          <Card className="border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="p-3 rounded-xl bg-blue-100 text-blue-600 w-fit mx-auto mb-3">
                <Building2 className="w-8 h-8" />
              </div>
              <h3 className="font-semibold text-slate-900">Create Hospital</h3>
              <p className="text-sm text-slate-500 mt-1">Add a new hospital to the system</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/branches" className="block">
          <Card className="border-2 border-dashed border-slate-200 hover:border-green-400 hover:bg-green-50 transition-all cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="p-3 rounded-xl bg-green-100 text-green-600 w-fit mx-auto mb-3">
                <GitBranch className="w-8 h-8" />
              </div>
              <h3 className="font-semibold text-slate-900">Create Branch</h3>
              <p className="text-sm text-slate-500 mt-1">Add a new branch under a hospital</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/users" className="block">
          <Card className="border-2 border-dashed border-slate-200 hover:border-purple-400 hover:bg-purple-50 transition-all cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="p-3 rounded-xl bg-purple-100 text-purple-600 w-fit mx-auto mb-3">
                <UserPlus className="w-8 h-8" />
              </div>
              <h3 className="font-semibold text-slate-900">Create User</h3>
              <p className="text-sm text-slate-500 mt-1">Add a new system user</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}