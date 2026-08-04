import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  History,
  Loader2,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  X,
  Check,
} from "lucide-react";
import api from "@/api/axios";
import { getUser } from "@/utils/token";
import { cn } from "@/lib/utils";

interface Permission {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  is_active: boolean;
  roles: Array<{ role_type: string; granted: boolean }>;
}

interface RoleConfig {
  role_type: string;
  display_name: string | null;
  sort_order: number;
  is_active: boolean;
}

interface MatrixData {
  permissions: Permission[];
  roles: RoleConfig[];
}

interface AuditLog {
  id: number;
  role_type: string;
  permission_key: string;
  action: string;
  changed_by: string;
  changed_at: string;
}

const CATEGORY_ORDER = [
  "employee",
  "patient",
  "appointment",
  "encounter",
  "department",
  "branch",
  "doctor",
  "report",
  "system",
  "lab",
  "pharmacy",
];

const CATEGORY_COLORS: Record<string, string> = {
  employee: "bg-blue-50 text-blue-700",
  patient: "bg-emerald-50 text-emerald-700",
  appointment: "bg-violet-50 text-violet-700",
  encounter: "bg-cyan-50 text-cyan-700",
  department: "bg-orange-50 text-orange-700",
  branch: "bg-pink-50 text-pink-700",
  doctor: "bg-teal-50 text-teal-700",
  report: "bg-amber-50 text-amber-700",
  system: "bg-slate-100 text-slate-700",
  lab: "bg-indigo-50 text-indigo-700",
  pharmacy: "bg-rose-50 text-rose-700",
};

export default function PermissionMatrix() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [matrix, setMatrix] = useState<MatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<
    Array<{ role_type: string; permission_key: string; grant: boolean }>
  >([]);
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState("");

  const isAllowed = useMemo(() => {
    const user = getUser();
    return user?.role === "HEAD_ADMIN" || user?.role === "SUPER_ADMIN";
  }, []);

  useEffect(() => {
    if (!isAllowed) {
      toast({
        title: "Access Denied",
        description: "Only Head Admin can manage permissions.",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }
    fetchMatrix();
  }, [isAllowed, navigate, toast]);

  const fetchMatrix = async () => {
    setLoading(true);
    try {
      const res = await api.get("/permissions/matrix");
      if (res.data.success) setMatrix(res.data.data);
    } catch (err: any) {
      toast({
        title: "Failed to load permissions",
        description: err.response?.data?.message ?? err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (permissionKey: string, roleType: string, currentGranted: boolean) => {
    const newGrant = !currentGranted;
    setPendingChanges((prev) => {
      const filtered = prev.filter(
        (c) => !(c.role_type === roleType && c.permission_key === permissionKey)
      );
      return [...filtered, { role_type: roleType, permission_key: permissionKey, grant: newGrant }];
    });
  };

  const handleSave = async () => {
    if (pendingChanges.length === 0) return;
    setSaving(true);
    try {
      const res = await api.post("/permissions/bulk", { updates: pendingChanges });
      if (res.data.success) {
        toast({ title: "Saved", description: "Permissions updated successfully" });
        setPendingChanges([]);
        fetchMatrix();
      }
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: err.response?.data?.message ?? err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRevert = () => {
    setPendingChanges([]);
    fetchMatrix();
  };

  const searchedPermissions = useMemo(() => {
    if (!matrix) return {};
    const grouped = (matrix.permissions ?? []).reduce((acc, perm) => {
      if (!acc[perm.category]) acc[perm.category] = [];
      acc[perm.category].push(perm);
      return acc;
    }, {} as Record<string, Permission[]>);
    if (!search.trim()) return grouped;
    const q = search.toLowerCase();
    const filtered: Record<string, Permission[]> = {};
    for (const [cat, perms] of Object.entries(grouped)) {
      const match = perms.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.key.toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q)
      );
      if (match.length) filtered[cat] = match;
    }
    return filtered;
  }, [search, matrix]);

  if (loading) {
    return <MatrixSkeleton />;
  }

  const roles = matrix?.roles ?? [];
  const filteredRoles = selectedRole === "all" ? roles : roles.filter((r) => r.role_type === selectedRole);

  const categories = CATEGORY_ORDER.filter((cat) => searchedPermissions[cat]?.length);

  const visibleCategories = categories.filter(
    (cat) => selectedCategory === "all" || cat === selectedCategory
  );
  const hasResults = visibleCategories.some((cat) => searchedPermissions[cat]?.length);

  return (
    <div className="mx-auto max-w-[1200px]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-[#0F172A] leading-tight">Permission Matrix</h1>
            <p className="text-xs text-slate-500">Grant or revoke permissions per role</p>
          </div>
        </div>
        <button
          onClick={() => setAuditOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <History className="w-3.5 h-3.5" />
          Audit Log
        </button>
      </div>

      {/* Search + Role chips */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search permissions..."
            className="w-64 pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00488D]/30 focus:border-[#00488D]"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setSelectedRole("all")}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-full transition-colors",
              selectedRole === "all"
                ? "bg-[#00488D] text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            )}
          >
            All Roles
          </button>
          {roles.map((role) => (
            <button
              key={role.role_type}
              onClick={() => setSelectedRole(role.role_type)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-full transition-colors",
                selectedRole === role.role_type
                  ? "bg-[#00488D] text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              )}
            >
              {role.display_name || role.role_type}
            </button>
          ))}
        </div>
      </div>

      {/* Pending changes bar */}
      {pendingChanges.length > 0 && (
        <div className="sticky top-0 z-20 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-white text-[10px] font-bold">
              {pendingChanges.length}
            </span>
            pending change{pendingChanges.length > 1 ? "s" : ""} — review before saving
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRevert}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-white border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Revert
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Category pills */}
      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        <button
          onClick={() => setSelectedCategory("all")}
          className={cn(
            "px-3 py-1 text-[11px] font-semibold rounded-full transition-colors",
            selectedCategory === "all"
              ? "bg-slate-800 text-white"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          )}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "px-3 py-1 text-[11px] font-semibold capitalize rounded-full transition-colors",
              selectedCategory === cat
                ? "bg-slate-800 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Matrix table */}
      {hasResults ? (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
          <div className="max-h-[calc(100vh-320px)] overflow-auto slim-scrollbar">
            <table className="w-full border-separate border-spacing-0 text-left">
              <thead className="sticky top-0 z-20 bg-[#F8FAFC]">
                <tr>
                  <th className="sticky left-0 top-0 z-30 w-[280px] min-w-[280px] max-w-[280px] bg-[#F8FAFC] px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200 shadow-[2px_0_4px_-2px_rgba(15,23,42,0.08)]">
                    Permission
                  </th>
                  {filteredRoles.map((role) => {
                    const grantedCount = (matrix?.permissions ?? []).filter((p) =>
                      p.roles.some((r) => r.role_type === role.role_type && r.granted)
                    ).length;
                    return (
                      <th
                        key={role.role_type}
                        className="min-w-[110px] px-2 py-3 text-center border-b border-slate-200"
                      >
                        <div className="text-[11px] font-bold text-slate-700">
                          {role.display_name || role.role_type}
                        </div>
                        <div className="text-[10px] font-medium text-slate-400 mt-0.5">
                          {grantedCount}/{matrix?.permissions.length ?? 0}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {visibleCategories.map((category) => {
                  const perms = searchedPermissions[category] ?? [];
                  if (perms.length === 0) return null;
                  return (
                    <Fragment key={category}>
                      <tr className="bg-slate-100">
                        <td className="sticky left-0 z-10 w-[280px] min-w-[280px] max-w-[280px] bg-slate-100 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 shadow-[2px_0_4px_-2px_rgba(15,23,42,0.06)]">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full",
                              CATEGORY_COLORS[category] ?? "bg-slate-100 text-slate-700"
                            )}
                          >
                            {category}
                            <span className="text-[10px] font-semibold text-slate-500">
                              {perms.length}
                            </span>
                          </span>
                        </td>
                        {filteredRoles.length > 0 && (
                          <td colSpan={filteredRoles.length} className="bg-slate-100 border-b border-slate-200" />
                        )}
                      </tr>
                      {perms.map((perm) => {
                        const rowPending = pendingChanges.some((c) => c.permission_key === perm.key);
                        return (
                          <tr key={perm.id} className="group hover:bg-blue-50/40 transition-colors">
                            <td className="sticky left-0 z-10 w-[280px] min-w-[280px] max-w-[280px] bg-white group-hover:bg-blue-50 px-4 py-3 border-b border-slate-100 group-hover:border-blue-100 shadow-[2px_0_4px_-2px_rgba(15,23,42,0.06)] transition-colors">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-[13px] font-semibold text-slate-800 break-words">
                                    {perm.name}
                                  </p>
                                  {rowPending && (
                                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-600 bg-amber-100 rounded px-1 py-0.5">
                                      <span className="w-1 h-1 rounded-full bg-amber-500" />
                                      Changed
                                    </span>
                                  )}
                                </div>
                                {perm.description && (
                                  <p className="text-[11px] text-slate-500 leading-relaxed break-words">
                                    {perm.description}
                                  </p>
                                )}
                              </div>
                            </td>
                            {filteredRoles.map((role) => {
                              const rolePerm = perm.roles.find((r) => r.role_type === role.role_type);
                              const granted = rolePerm?.granted ?? false;
                              const pending = pendingChanges.find(
                                (c) => c.role_type === role.role_type && c.permission_key === perm.key
                              );
                              const effectiveGrant = pending ? pending.grant : granted;
                              const isPending = !!pending;

                              return (
                                <td
                                  key={role.role_type}
                                  className="px-2 py-3 text-center border-b border-slate-100"
                                >
                                  <div className="flex items-center justify-center">
                                    <Toggle
                                      checked={effectiveGrant}
                                      pending={isPending}
                                      onChange={() => handleToggle(perm.key, role.role_type, effectiveGrant)}
                                    />
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm py-16 flex flex-col items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            <Search className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-700">No permissions found</p>
          <p className="text-xs text-slate-400">Try adjusting your search or category filter</p>
        </div>
      )}

      {/* Data source legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] text-slate-500">
        <span className="font-bold uppercase tracking-wider text-slate-400">Data source</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Live from database — permissions, roles, grants &amp; audit log
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          Static in this page — category order &amp; category colors
        </span>
      </div>

      {/* Audit log modal */}
      {auditOpen && (
        <AuditLogModal onClose={() => setAuditOpen(false)} />
      )}
    </div>
  );
}

function Toggle({
  checked,
  pending,
  onChange,
}: {
  checked: boolean;
  pending?: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      title={checked ? "Revoke" : "Grant"}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00488D] focus-visible:ring-offset-2",
        checked ? "bg-emerald-500" : "bg-slate-300",
        pending && "ring-2 ring-amber-400 ring-offset-1"
      )}
    >
      <span
        className={cn(
          "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[19px]" : "translate-x-[3px]"
        )}
      />
    </button>
  );
}

function AuditLogModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAudit = async () => {
      setLoading(true);
      try {
        const res = await api.get("/permissions/audit", { params: { limit: 200 } });
        if (res.data.success) setLogs(res.data.data);
      } catch (err: any) {
        toast({
          title: "Failed to load audit log",
          description: err.response?.data?.message ?? err.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchAudit();
  }, [toast]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-[#00488D]">
              <History className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Permission Audit Log</h3>
              <p className="text-[11px] text-slate-400">Recent grant / revoke activity</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-auto slim-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="w-6 h-6 text-[#00488D] animate-spin" />
              <p className="text-xs text-slate-400">Loading audit history...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <ShieldCheck className="w-8 h-8 text-slate-300" />
              <p className="text-sm text-slate-500">No audit logs found</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="sticky top-0 z-10 bg-[#F8FAFC]">
                <tr>
                  {["Role", "Permission", "Action", "Changed By", "Time"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-semibold text-slate-700">{log.role_type}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-[11px] font-mono text-slate-600">{log.permission_key}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full",
                          log.action === "GRANTED"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        )}
                      >
                        {log.action === "GRANTED" ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">{log.changed_by}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">
                      {new Date(log.changed_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function MatrixSkeleton() {
  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-200 animate-pulse" />
          <div>
            <div className="w-48 h-5 bg-slate-200 rounded-md animate-pulse" />
            <div className="w-64 h-3 bg-slate-100 rounded-md mt-1.5 animate-pulse" />
          </div>
        </div>
        <div className="w-24 h-9 bg-slate-200 rounded-xl animate-pulse" />
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="w-16 h-6 bg-slate-100 rounded-full animate-pulse" />
          ))}
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-slate-100">
            <div className="w-1/4 h-4 bg-slate-100 rounded-md animate-pulse" />
            <div className="w-1/6 h-4 bg-slate-100 rounded-md animate-pulse" />
            <div className="flex-1 h-4 bg-slate-50 rounded-md animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
