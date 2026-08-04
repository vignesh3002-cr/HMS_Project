import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck, KeyRound, Building2, Stethoscope, ChevronRight, Loader2 } from "lucide-react";
import api from "@/api/axios";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<{ permissions: number; roles: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/permissions/matrix")
      .then((res) => {
        if (res.data.success) {
          setStats({
            permissions: res.data.data.permissions.length,
            roles: res.data.data.roles.length,
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    {
      title: "Permissions",
      description: "Grant or revoke access per role with the permission matrix",
      icon: ShieldCheck,
      accent: "bg-blue-50 text-[#00488D]",
      to: "/admin/permissions",
      stat: stats?.permissions,
    },
    {
      title: "Roles",
      description: "Manage role configurations, names and availability",
      icon: KeyRound,
      accent: "bg-violet-50 text-violet-700",
      to: "/admin/roles",
      stat: stats?.roles,
    },
    {
      title: "Departments",
      description: "View and manage hospital departments",
      icon: Building2,
      accent: "bg-emerald-50 text-emerald-700",
      to: "/departments",
    },
    {
      title: "Doctors",
      description: "Manage doctors and their schedules",
      icon: Stethoscope,
      accent: "bg-amber-50 text-amber-700",
      to: "/doctor",
    },
  ];

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-[#0F172A] leading-tight">Admin Center</h1>
          <p className="text-xs text-slate-500">System management hub</p>
        </div>
      </div>

      {loading && !stats ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 text-[#00488D] animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {cards.map((card) => (
            <button
              key={card.to}
              onClick={() => navigate(card.to)}
              className="group text-left bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md hover:border-[#00488D]/30 hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.accent}`}>
                  <card.icon className="w-5 h-5" />
                </span>
                {card.stat !== undefined && (
                  <span className="text-2xl font-bold text-slate-800 tabular-nums">{card.stat}</span>
                )}
              </div>
              <div className="flex items-center gap-1 text-sm font-bold text-slate-800">
                {card.title}
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#00488D] group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{card.description}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
