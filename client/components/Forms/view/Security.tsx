import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, KeyRound, Lock, Loader2, X } from "lucide-react";
import api from "@/api/axios";
import { getUser, saveUser } from "@/utils/token";
import { useToast } from "@/hooks/use-toast";
import { addAccountActivity } from "@/utils/accountActivity";

const inputCls =
  "w-full h-10 px-4 bg-white border border-gray-200 rounded-xl text-[13.5px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-[3px] focus:ring-blue-500/15 focus:border-blue-500 transition-all duration-200 disabled:bg-gray-50 disabled:text-gray-400";

const labelCls = "block text-[12.5px] font-semibold text-gray-700 mb-1.5";

function ChangeUsernameModal({
  currentUsername,
  onClose,
  onSuccess,
}: {
  currentUsername: string;
  onClose: () => void;
  onSuccess: (newUsername: string) => void;
}) {
  const { toast } = useToast();
  const [newUsername, setNewUsername] = useState("");
  const [confirmUsername, setConfirmUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newUsername.trim() || !confirmUsername.trim()) {
      toast({ title: "Missing fields", description: "Please fill in both fields.", variant: "destructive" });
      return;
    }
    if (newUsername !== confirmUsername) {
      toast({ title: "Usernames don't match", description: "New username and confirmation must match.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.patch("/auth/me/username", { newUsername: newUsername.trim() });
      if (res.data.success) {
        toast({ title: "Username updated", description: "Your username has been changed successfully." });
        addAccountActivity("Username updated", `Your username was changed to "${newUsername.trim()}".`);
        onSuccess(newUsername.trim());
      }
    } catch (err: any) {
      toast({
        title: "Failed to update username",
        description: err.response?.data?.message ?? err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-[#00488D]">
              <KeyRound className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-slate-800">Change Username</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className={labelCls}>Current Username</label>
            <input className={inputCls} value={currentUsername} disabled />
          </div>
          <div>
            <label className={labelCls}>New Username</label>
            <input
              className={inputCls}
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Enter new username"
              disabled={submitting}
            />
          </div>
          <div>
            <label className={labelCls}>Confirm New Username</label>
            <input
              className={inputCls}
              value={confirmUsername}
              onChange={(e) => setConfirmUsername(e.target.value)}
              placeholder="Re-enter new username"
              disabled={submitting}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/60">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-3.5 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#00488D] rounded-xl hover:bg-[#003A73] disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast({ title: "Missing fields", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "New password and confirmation must match.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.patch("/auth/me/password", { oldPassword, newPassword });
      if (res.data.success) {
        toast({ title: "Password updated", description: "Your password has been changed successfully." });
        addAccountActivity("Password updated", "Your password was changed successfully.");
        onClose();
      }
    } catch (err: any) {
      toast({
        title: "Failed to update password",
        description: err.response?.data?.message ?? err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-[#00488D]">
              <Lock className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-slate-800">Change Password</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className={labelCls}>Old Password</label>
            <input
              type="password"
              className={inputCls}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Enter current password"
              disabled={submitting}
            />
          </div>
          <div>
            <label className={labelCls}>New Password</label>
            <input
              type="password"
              className={inputCls}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              disabled={submitting}
            />
          </div>
          <div>
            <label className={labelCls}>Confirm New Password</label>
            <input
              type="password"
              className={inputCls}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              disabled={submitting}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/60">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-3.5 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#00488D] rounded-xl hover:bg-[#003A73] disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Security({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState(() => getUser()?.username || "");
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handleUsernameChanged = (newUsername: string) => {
    setUsername(newUsername);
    saveUser({ ...getUser(), username: newUsername });
    window.dispatchEvent(new Event("user-updated"));
    setShowUsernameModal(false);
  };

  return (
    <div className="mx-auto max-w-[800px]">
      <div className="flex items-center gap-3 mb-6">
        {!embedded && (
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div>
          <h1 className="text-lg font-bold text-[#0F172A] leading-tight">Security</h1>
          <p className="text-xs text-gray-500">Manage your login username and password.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#00488D]">
              <KeyRound className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Username</h3>
              <p className="text-xs text-gray-500 mt-0.5">{username || "—"}</p>
            </div>
          </div>
          <button
            onClick={() => setShowUsernameModal(true)}
            className="px-4 py-2 text-xs font-semibold text-[#00488D] border border-[#00488D] rounded-xl hover:bg-blue-50"
          >
            Change Username
          </button>
        </div>

        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#00488D]">
              <Lock className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Password</h3>
              <p className="text-xs text-gray-500 mt-0.5">••••••••</p>
            </div>
          </div>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="px-4 py-2 text-xs font-semibold text-[#00488D] border border-[#00488D] rounded-xl hover:bg-blue-50"
          >
            Change Password
          </button>
        </div>
      </div>

      {showUsernameModal && (
        <ChangeUsernameModal
          currentUsername={username}
          onClose={() => setShowUsernameModal(false)}
          onSuccess={handleUsernameChanged}
        />
      )}
      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
    </div>
  );
}
