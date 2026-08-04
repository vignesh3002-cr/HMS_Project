import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshButton } from "@/components/hms/RefreshButton";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  X,
} from "lucide-react";
import api from "@/api/axios";
import { cn } from "@/lib/utils";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";

interface Role {
  role_type: string;
  prefix: string | null;
  display_name: string | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  permission_count: number;
}

export default function RoleManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<{ role: Role; isActive: boolean } | null>(null);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await api.get("/roles");
      if (res.data.success) setRoles(res.data.data);
    } catch (err: any) {
      toast({
        title: "Failed to load roles",
        description: err.response?.data?.message ?? err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await api.patch(`/roles/${editing.role_type}`, {
        display_name: editing.display_name,
        description: editing.description,
        is_active: editing.is_active,
        sort_order: editing.sort_order,
      });
      if (res.data.success) {
        toast({ title: "Role updated", description: `${editing.role_type} saved successfully` });
        setEditing(null);
        fetchRoles();
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

  const handleToggleActive = async (role: Role, isActive: boolean) => {
    try {
      const res = await api.patch(`/roles/${role.role_type}`, { is_active: isActive });
      if (res.data.success) {
        toast({
          title: isActive ? "Role activated" : "Role deactivated",
          description: role.display_name || role.role_type,
        });
        fetchRoles();
      }
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err.response?.data?.message ?? err.message,
        variant: "destructive",
      });
    }
  };

  const activeCount = roles.filter((r) => r.is_active).length;

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-[#0F172A] leading-tight">Role Management</h1>
            <p className="text-xs text-slate-500">
              {loading ? "Loading roles..." : `${activeCount} of ${roles.length} roles active`}
            </p>
          </div>
        </div>
        <RefreshButton
          onClick={fetchRoles}
          isLoading={loading}
          title="Refresh"
        />
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-20 h-6 bg-slate-100 rounded-full animate-pulse" />
            ))}
          </div>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-slate-100">
              <div className="w-1/4 h-4 bg-slate-100 rounded-md animate-pulse" />
              <div className="w-1/6 h-4 bg-slate-100 rounded-md animate-pulse" />
              <div className="flex-1 h-4 bg-slate-50 rounded-md animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#F8FAFC]">
                <tr>
                  {["Role", "Role Type", "Prefix", "Permissions", "Status", ""].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roles.map((role) => (
                  <tr key={role.role_type} className={cn("hover:bg-slate-50 transition-colors", !role.is_active && "opacity-60")}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg",
                            role.is_active ? "bg-blue-50 text-[#00488D]" : "bg-slate-100 text-slate-400"
                          )}
                        >
                          <KeyRound className="w-4 h-4" />
                        </span>
                        <div>
                          <p className="text-[13px] font-semibold text-slate-800">
                            {role.display_name || role.role_type}
                          </p>
                          {role.description && (
                            <p className="text-[11px] text-slate-400">{role.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 text-[10px] font-mono font-semibold bg-slate-100 text-slate-600 rounded-md">
                        {role.role_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-500">
                      {role.prefix ?? (
                        <span className="text-slate-300 font-medium">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        {role.permission_count}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setToggleTarget({ role, isActive: !role.is_active })}
                        className={cn(
                          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
                          role.is_active ? "bg-emerald-500" : "bg-slate-300"
                        )}
                        title={role.is_active ? "Deactivate role" : "Activate role"}
                      >
                        <span
                          className={cn(
                            "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
                            role.is_active ? "translate-x-[19px]" : "translate-x-[3px]"
                          )}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setEditing(role)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-[#00488D] transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmationDialog
        open={!!toggleTarget}
        type={toggleTarget?.isActive ? "LockOpen" : "lock"}
        title={toggleTarget?.isActive ? "Activate Role" : "Deactivate Role"}
        description={
          toggleTarget
            ? `Are you sure you want to ${
                toggleTarget.isActive ? "activate" : "deactivate"
              } ${toggleTarget.role.display_name || toggleTarget.role.role_type}?`
            : ""
        }
        confirmText={toggleTarget?.isActive ? "Activate" : "Deactivate"}
        onConfirm={() => {
          if (!toggleTarget) return;
          handleToggleActive(toggleTarget.role, toggleTarget.isActive);
          setToggleTarget(null);
        }}
        onCancel={() => setToggleTarget(null)}
      />

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setEditing(null)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-[#00488D]">
                  <KeyRound className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Edit Role</h3>
                  <p className="text-[11px] text-slate-400">{editing.role_type}</p>
                </div>
              </div>
              <button
                onClick={() => setEditing(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Display Name
                </label>
                <input
                  value={editing.display_name ?? ""}
                  onChange={(e) => setEditing({ ...editing, display_name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00488D]/30 focus:border-[#00488D]"
                  placeholder="Role display name"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Description
                </label>
                <input
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00488D]/30 focus:border-[#00488D]"
                  placeholder="What this role is for"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={editing.sort_order}
                    onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00488D]/30 focus:border-[#00488D]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Status
                  </label>
                  <button
                    onClick={() => setEditing({ ...editing, is_active: !editing.is_active })}
                    className={cn(
                      "relative inline-flex h-8 w-14 items-center rounded-full transition-colors px-1",
                      editing.is_active ? "bg-emerald-500" : "bg-slate-300"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform",
                        editing.is_active ? "translate-x-6" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-200 bg-slate-50/60">
              <button
                onClick={() => setEditing(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#00488D] rounded-xl hover:bg-[#003A73] disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
