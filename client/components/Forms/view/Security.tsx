import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Lock,
  Loader2,
  X,
  Smartphone,
  Mail,
  Phone,
  MessageCircle,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Download,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PhoneInput } from "@/components/ui/phone-input";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { addAccountActivity } from "@/utils/accountActivity";
import {
  getTwoFactorStatus,
  setupTotp,
  confirmTotp,
  disableTwoFactor,
  sendAlternateEmailOtp,
  confirmAlternateEmail,
  removeAlternateEmail,
  sendAlternateMobileOtp,
  confirmAlternateMobile,
  removeAlternateMobile,
  requestAddAlternateAuthOtp,
  verifyAddAlternateAuthOtp,
  updateSecurityPreferences,
  requestPasswordChangeOtp,
  verifyPasswordChangeOtp,
  finalizePasswordChange,
  type TwoFactorStatus,
  type TotpSetupData,
} from "@/api/twoFactor.api";

const inputCls =
  "w-full h-10 px-4 bg-white border border-gray-200 rounded-xl text-[13.5px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-[3px] focus:ring-blue-500/15 focus:border-blue-500 transition-all duration-200 disabled:bg-gray-50 disabled:text-gray-400";

const labelCls = "block text-[12.5px] font-semibold text-gray-700 mb-1.5";

// ── 1. Change Password Modal (3-Phase Flow) ──────────────────────────────────

function ChangePasswordModal({
  status,
  onClose,
}: {
  status: TwoFactorStatus | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [phase, setPhase] = useState<"OLD_PASSWORD" | "VERIFY_OTP" | "NEW_PASSWORD">("OLD_PASSWORD");

  const [oldPassword, setOldPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [selectedChannel, setSelectedChannel] = useState<string | undefined>(undefined);
  const [channelDestination, setChannelDestination] = useState<string>("");
  const [availableChannels, setAvailableChannels] = useState<Array<{ id: string; label: string; destination: string }>>([]);
  const [showChannelPicker, setShowChannelPicker] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // Phase 1: Enter Old Password & Click "Get OTP"
  const handleGetOtp = async (channelOverride?: string) => {
    if (!oldPassword.trim()) {
      toast({ title: "Required", description: "Please enter your current password", variant: "destructive" });
      return;
    }

    const channel = channelOverride || selectedChannel;
    setSubmitting(true);
    try {
      const res = await requestPasswordChangeOtp(oldPassword, channel);
      if (res.success) {
        setChannelDestination(res.destination);
        setAvailableChannels(res.availableChannels || []);
        setSelectedChannel(res.currentChannel || channel);
        setPhase("VERIFY_OTP");
        setCooldown(60);
        setShowChannelPicker(false);
        toast({ title: "OTP Sent", description: res.message });
      }
    } catch (err: any) {
      toast({
        title: "Password check failed",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Phase 2: Verify OTP
  const handleVerifyOtp = async () => {
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      toast({ title: "Invalid OTP", description: "Please enter the 6-digit verification code", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await verifyPasswordChangeOtp(otpCode.trim());
      if (res.success) {
        setPhase("NEW_PASSWORD");
        toast({ title: "Identity Verified", description: "You may now set your new password." });
      }
    } catch (err: any) {
      toast({
        title: "Verification Failed",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Phase 3: Finalize New Password
  const handleFinalize = async () => {
    if (!newPassword || !confirmPassword) {
      toast({ title: "Missing fields", description: "Please fill in both new password fields.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Weak password", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "New password and confirmation must match.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await finalizePasswordChange(oldPassword, newPassword);
      if (res.success) {
        toast({ title: "Password Updated", description: "Your password has been changed successfully." });
        addAccountActivity("Password updated", "Your password was changed successfully.");
        onClose();
      }
    } catch (err: any) {
      toast({
        title: "Failed to update password",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-[#00488D]">
              <Lock className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Change Password</h3>
              <p className="text-[11px] text-gray-500">
                {phase === "OLD_PASSWORD" && "Step 1: Enter your current password"}
                {phase === "VERIFY_OTP" && "Step 2: Enter verification code"}
                {phase === "NEW_PASSWORD" && "Step 3: Choose your new password"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Phase 1: Old Password */}
          {phase === "OLD_PASSWORD" && (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Current Password</label>
                <input
                  type="password"
                  className={inputCls}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter your current password"
                  autoFocus
                  disabled={submitting}
                />
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                For security, an OTP will be sent to your configured default destination (
                {status?.defaultLoginMethod?.includes("MOBILE")
                  ? (status?.defaultLoginMethod === "SECONDARY_MOBILE" ? status?.maskedAlternateMobile : status?.maskedPrimaryMobile) || "registered mobile"
                  : (status?.defaultLoginMethod === "SECONDARY_EMAIL" ? status?.maskedAlternateEmail : status?.maskedPrimaryEmail) || "registered email"}
                ) to verify your request.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleGetOtp()}
                  disabled={submitting || !oldPassword}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#00488D] rounded-xl hover:bg-[#003A73] transition disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Get OTP
                </button>
              </div>
            </div>
          )}

          {/* Phase 2: Enter OTP with Resend & Try another way */}
          {phase === "VERIFY_OTP" && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 leading-relaxed">
                Verification code sent to <strong>{channelDestination || (status?.defaultLoginMethod?.includes("MOBILE") ? (status?.defaultLoginMethod === "SECONDARY_MOBILE" ? status?.maskedAlternateMobile : status?.maskedPrimaryMobile) : (status?.defaultLoginMethod === "SECONDARY_EMAIL" ? status?.maskedAlternateEmail : status?.maskedPrimaryEmail))}</strong>.
              </div>

              <div>
                <label className={labelCls}>6-Digit OTP</label>
                <input
                  type="text"
                  maxLength={6}
                  inputMode="numeric"
                  className={`${inputCls} text-center font-bold tracking-widest text-base font-mono`}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••"
                  autoFocus
                  disabled={submitting}
                />
              </div>

              {/* Action row: Resend on LEFT, Try another way on RIGHT */}
              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => handleGetOtp()}
                  disabled={submitting || cooldown > 0}
                  className="font-semibold text-[#00488D] hover:underline disabled:opacity-50"
                >
                  {cooldown > 0 ? `Resend Code (${cooldown}s)` : "Resend Code"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowChannelPicker(!showChannelPicker)}
                  className="font-semibold text-gray-600 hover:text-[#00488D] flex items-center gap-1 transition"
                >
                  <span>Try another way</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Alternative Channels Picker Drawer */}
              {showChannelPicker && (
                <div className="p-3 rounded-xl border border-gray-200 bg-gray-50/70 space-y-2 animate-in fade-in duration-150">
                  <p className="text-[11px] font-semibold text-gray-700">Choose alternative destination:</p>
                  <div className="space-y-1.5">
                    {availableChannels.map((ch) => (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => handleGetOtp(ch.id)}
                        disabled={submitting}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-xs border text-left transition ${
                          selectedChannel === ch.id
                            ? "border-blue-500 bg-blue-50 text-blue-900 font-semibold"
                            : "border-gray-200 bg-white hover:border-blue-200 hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        <span>{ch.label} ({ch.destination})</span>
                        {selectedChannel === ch.id && <Check className="w-3.5 h-3.5 text-blue-600" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={submitting || otpCode.length !== 6}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#00488D] rounded-xl hover:bg-[#003A73] transition disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Verify OTP
                </button>
              </div>
            </div>
          )}

          {/* Phase 3: New Password */}
          {phase === "NEW_PASSWORD" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Identity verified. Enter your new password below.</span>
              </div>

              <div>
                <label className={labelCls}>New Password</label>
                <input
                  type="password"
                  className={inputCls}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoFocus
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

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleFinalize}
                  disabled={submitting || !newPassword || !confirmPassword}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#00488D] rounded-xl hover:bg-[#003A73] transition disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save New Password
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 2. Authenticator App (TOTP) Setup Modal ──────────────────────────────────

function SetupTotpModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState<"QR" | "RECOVERY">("QR");
  const [setupData, setSetupData] = useState<TotpSetupData | null>(null);
  const [confirmCode, setConfirmCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  useEffect(() => {
    setupTotp()
      .then((data) => setSetupData(data))
      .catch((err) => {
        toast({ title: "Failed to setup 2FA", description: err.message, variant: "destructive" });
        onClose();
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCopyKey = () => {
    if (!setupData?.secret) return;
    navigator.clipboard.writeText(setupData.secret);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleDownloadCodes = () => {
    if (!recoveryCodes.length) return;

    const content = [
      "HMS — Two-Factor Authentication Recovery Codes",
      "Each code can be used only once. Store this file somewhere safe.",
      "",
      ...recoveryCodes,
      "",
      `Generated: ${new Date().toLocaleString()}`,
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "hms-recovery-codes.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  // Closing before the recovery codes are shown is harmless; once they are on
  // screen the user must acknowledge that they would be lost.
  const requestClose = () => {
    if (step === "RECOVERY") {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirm = async () => {
    if (!setupData?.secret || confirmCode.trim().length !== 6) {
      toast({ title: "Invalid code", description: "Enter 6-digit code from your app", variant: "destructive" });
      return;
    }

    setConfirming(true);
    try {
      const res = await confirmTotp(setupData.secret, confirmCode.trim());
      if (res.success) {
        setRecoveryCodes(res.recoveryCodes || []);
        setStep("RECOVERY");
        toast({ title: "2FA Enabled", description: "Save your emergency recovery codes." });
      }
    } catch (err: any) {
      toast({
        title: "Invalid Verification Code",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={requestClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Smartphone className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Set Up Authenticator App</h3>
              <p className="text-[11px] text-gray-500">
                {step === "QR" ? "Scan QR code or enter secret key" : "Save your recovery codes"}
              </p>
            </div>
          </div>
          <button onClick={requestClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#00488D]" />
              <p className="text-xs text-gray-500">Generating secure key...</p>
            </div>
          ) : step === "QR" ? (
            <div className="space-y-4">
              <div className="flex justify-center p-3 bg-white border border-gray-200 rounded-2xl shadow-sm">
                {setupData?.qrDataUrl ? (
                  <img src={setupData.qrDataUrl} alt="2FA QR Code" className="w-48 h-48" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-xs text-gray-400">QR Unavailable</div>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-600 mb-1.5 text-center">
                  Scan this QR code in Google Authenticator, Microsoft Authenticator, or Bitwarden.
                </p>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="font-mono text-xs font-semibold text-gray-800 tracking-wider flex-1 truncate select-all px-1">
                    {setupData?.secret}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyKey}
                    className="p-1.5 rounded-lg hover:bg-white text-gray-500 hover:text-gray-900 text-xs font-semibold border border-transparent hover:border-gray-200 transition"
                  >
                    {copiedKey ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className={labelCls}>Enter 6-digit code from app</label>
                <input
                  type="text"
                  maxLength={6}
                  inputMode="numeric"
                  className={`${inputCls} text-center font-bold tracking-widest text-base font-mono`}
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••"
                  disabled={confirming}
                />
              </div>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={confirming || confirmCode.length !== 6}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#00488D] rounded-xl hover:bg-[#003A73] transition disabled:opacity-50"
              >
                {confirming && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Verify & Activate 2FA
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                <p className="font-bold flex items-center gap-1.5 mb-1">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  Save your recovery codes
                </p>
                <p className="leading-relaxed">
                  If you lose access to your phone or authenticator app, these one-time codes are the only way to recover access to your account.
                </p>
              </div>

              <div className="relative">
                <div className="grid grid-cols-2 gap-2 p-3 pr-14 bg-gray-50 rounded-xl border border-gray-200 font-mono text-xs font-bold text-gray-800 text-center">
                  {recoveryCodes.map((code, idx) => (
                    <div key={idx} className="p-1.5 bg-white rounded-lg border border-gray-200">
                      {code}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleDownloadCodes}
                  title="Download recovery codes (.txt)"
                  aria-label="Download recovery codes"
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
                >
                  {copiedCodes ? <Check className="w-4 h-4 text-emerald-600" /> : <Download className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="w-full px-4 py-2 text-xs font-semibold text-white bg-[#00488D] rounded-xl hover:bg-[#003A73]"
              >
                Save
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmationDialog
        open={showCloseConfirm}
        type="warning"
        title="Exit without saving recovery codes?"
        description="Your recovery codes are shown only once. If you close this window without saving them, you will lose the only way to recover your account if you lose access to your phone or authenticator app."
        confirmText="Exit Anyway"
        cancelText="Go Back"
        onConfirm={() => {
          setShowCloseConfirm(false);
          onClose();
        }}
        onCancel={() => setShowCloseConfirm(false)}
      />
    </div>
  );
}

// ── 3. Alternate Email Modal (2-Step Verification) ───────────────────────────

function AlternateEmailModal({
  currentEmail,
  onClose,
  onSuccess,
}: {
  currentEmail: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [email, setEmail] = useState(currentEmail || "");
  const [authCode, setAuthCode] = useState("");
  const [newCode, setNewCode] = useState("");
  const [step, setStep] = useState<"INPUT" | "AUTHORIZE_DEFAULT" | "VERIFY_NEW">("INPUT");
  const [authDestination, setAuthDestination] = useState("");
  const [authDefaultMethod, setAuthDefaultMethod] = useState("");
  const [makeDefault, setMakeDefault] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleStart = async () => {
    if (!email.trim() || !email.includes("@")) {
      toast({
        title: "Valid email required",
        description: "Please enter a valid secondary email.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await requestAddAlternateAuthOtp();
      if (res.authorized) {
        const emailRes = await sendAlternateEmailOtp(email.trim());
        setStep("VERIFY_NEW");
        toast({ title: "OTP Sent", description: emailRes.message });
      } else {
        setAuthDestination(res.destination);
        setAuthDefaultMethod(res.defaultMethod || "");
        setStep("AUTHORIZE_DEFAULT");
        toast({ title: "Authorization Required", description: res.message });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAuthorizeDefault = async () => {
    if (authCode.trim().length !== 6) {
      toast({
        title: "Code required",
        description: "Enter 6-digit authorization code from your default channel",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await verifyAddAlternateAuthOtp(authCode.trim());
      const emailRes = await sendAlternateEmailOtp(email.trim());
      setStep("VERIFY_NEW");
      toast({ title: "Authorized", description: `Verification code sent to ${email}.` });
    } catch (err: any) {
      toast({
        title: "Authorization Failed",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmNew = async () => {
    if (newCode.trim().length !== 6) {
      toast({
        title: "Code required",
        description: "Enter 6-digit verification code from your alternate email",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await confirmAlternateEmail(email.trim(), newCode.trim());
      if (res.success) {
        if (makeDefault) {
          try {
            await updateSecurityPreferences({ defaultLoginMethod: "SECONDARY_EMAIL" });
          } catch (prefErr) {
            console.error("Failed to set alternate email as default:", prefErr);
          }
        }
        toast({ title: "Alternate Email Saved", description: res.message });
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      toast({
        title: "Verification Failed",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-[#00488D]">
              <Mail className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Alternate Email</h3>
              <p className="text-[11px] text-gray-500">
                {step === "INPUT" && "Backup destination for login & recovery OTPs"}
                {step === "AUTHORIZE_DEFAULT" && "Step 1 of 2: Authorize with your default channel"}
                {step === "VERIFY_NEW" && "Step 2 of 2: Confirm new alternate email"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {step === "INPUT" && (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Secondary Email Address</label>
                <input
                  type="email"
                  className={inputCls}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. personal.email@gmail.com"
                  autoFocus
                  disabled={submitting}
                />
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Before adding a new alternate email, an authorization code will be sent to your existing default security channel.
              </p>
              <button
                type="button"
                onClick={handleStart}
                disabled={submitting || !email.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#00488D] rounded-xl hover:bg-[#003A73] transition disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Send Authorization Code
              </button>
            </div>
          )}

          {step === "AUTHORIZE_DEFAULT" && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed flex items-center gap-2">
                {authDefaultMethod.includes("MOBILE") ? (
                  <Smartphone className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <Mail className="w-4 h-4 text-blue-600 flex-shrink-0" />
                )}
                <span>
                  Authorization code sent to your default security destination (<strong>{authDestination}</strong>).
                </span>
              </div>

              <div>
                <label className={labelCls}>Enter 6-digit Authorization Code</label>
                <input
                  type="text"
                  maxLength={6}
                  inputMode="numeric"
                  className={`${inputCls} text-center font-bold tracking-widest text-base font-mono`}
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••"
                  autoFocus
                  disabled={submitting}
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={submitting}
                  className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-50"
                >
                  Resend Code
                </button>
                <button
                  type="button"
                  onClick={() => setStep("INPUT")}
                  disabled={submitting}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Change Email
                </button>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep("INPUT")}
                  className="px-3 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleAuthorizeDefault}
                  disabled={submitting || authCode.length !== 6}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#00488D] rounded-xl hover:bg-[#003A73] transition disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Authorize &amp; Continue
                </button>
              </div>
            </div>
          )}

          {step === "VERIFY_NEW" && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 leading-relaxed">
                Verification code sent to <strong>{email}</strong>. Enter code to complete verification.
              </div>
              <div>
                <label className={labelCls}>Enter 6-digit Code</label>
                <input
                  type="text"
                  maxLength={6}
                  inputMode="numeric"
                  className={`${inputCls} text-center font-bold tracking-widest text-base font-mono`}
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••"
                  autoFocus
                  disabled={submitting}
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 select-none">
                <input
                  type="checkbox"
                  checked={makeDefault}
                  onChange={(e) => setMakeDefault(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Set as default OTP destination upon verification</span>
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep("INPUT")}
                  className="px-3 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmNew}
                  disabled={submitting || newCode.length !== 6}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#00488D] rounded-xl hover:bg-[#003A73] transition disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Verify &amp; Save
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 4. Alternate Mobile Modal (2-Step Verification) ──────────────────────────

function AlternateMobileModal({
  currentMobile,
  onClose,
  onSuccess,
}: {
  currentMobile: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [mobile, setMobile] = useState(currentMobile || "");
  const [authCode, setAuthCode] = useState("");
  const [newCode, setNewCode] = useState("");
  const [step, setStep] = useState<"INPUT" | "AUTHORIZE_DEFAULT" | "VERIFY_NEW">("INPUT");
  const [authDestination, setAuthDestination] = useState("");
  const [authDefaultMethod, setAuthDefaultMethod] = useState("");
  const [makeDefault, setMakeDefault] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleStart = async () => {
    if (!mobile.trim() || mobile.trim().length < 8) {
      toast({
        title: "Valid mobile required",
        description: "Please enter a valid phone number.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await requestAddAlternateAuthOtp();
      if (res.authorized) {
        const mobRes = await sendAlternateMobileOtp(mobile.trim(), false);
        setStep("VERIFY_NEW");
        toast({ title: "OTP Sent", description: mobRes.message });
      } else {
        setAuthDestination(res.destination);
        setAuthDefaultMethod(res.defaultMethod || "");
        setStep("AUTHORIZE_DEFAULT");
        toast({ title: "Authorization Required", description: res.message });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAuthorizeDefault = async () => {
    if (authCode.trim().length !== 6) {
      toast({
        title: "Code required",
        description: "Enter 6-digit authorization code from your default channel",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await verifyAddAlternateAuthOtp(authCode.trim());
      const mobRes = await sendAlternateMobileOtp(mobile.trim(), false);
      setStep("VERIFY_NEW");
      toast({ title: "Authorized", description: `Verification code sent to ${mobile}.` });
    } catch (err: any) {
      toast({
        title: "Authorization Failed",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmNew = async () => {
    if (newCode.trim().length !== 6) {
      toast({
        title: "Code required",
        description: "Enter 6-digit verification code from your alternate mobile",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await confirmAlternateMobile(mobile.trim(), newCode.trim());
      if (res.success) {
        if (makeDefault) {
          try {
            await updateSecurityPreferences({ defaultLoginMethod: "SECONDARY_MOBILE" });
          } catch (prefErr) {
            console.error("Failed to set alternate mobile as default:", prefErr);
          }
        }
        toast({ title: "Alternate Mobile Saved", description: res.message });
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      toast({
        title: "Verification Failed",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-[#00488D]">
              <Phone className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Alternate Mobile Number</h3>
              <p className="text-[11px] text-gray-500">
                {step === "INPUT" && "Secondary mobile for SMS / WhatsApp codes"}
                {step === "AUTHORIZE_DEFAULT" && "Step 1 of 2: Authorize with your default channel"}
                {step === "VERIFY_NEW" && "Step 2 of 2: Confirm new alternate mobile"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {step === "INPUT" && (
            <div className="space-y-4">
              <div>
                <PhoneInput
                  label="Secondary Mobile Number"
                  value={mobile}
                  onChange={setMobile}
                  defaultCountry="in"
                  required
                  disabled={submitting}
                />
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Before adding a new alternate mobile number, an authorization code will be sent to your existing default security channel.
              </p>
              <button
                type="button"
                onClick={handleStart}
                disabled={submitting || !mobile.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#00488D] rounded-xl hover:bg-[#003A73] transition disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Send Authorization Code
              </button>
            </div>
          )}

          {step === "AUTHORIZE_DEFAULT" && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed flex items-center gap-2">
                {authDefaultMethod.includes("MOBILE") ? (
                  <Smartphone className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <Mail className="w-4 h-4 text-blue-600 flex-shrink-0" />
                )}
                <span>
                  Authorization code sent to your default security destination (<strong>{authDestination}</strong>).
                </span>
              </div>

              <div>
                <label className={labelCls}>Enter 6-digit Authorization Code</label>
                <input
                  type="text"
                  maxLength={6}
                  inputMode="numeric"
                  className={`${inputCls} text-center font-bold tracking-widest text-base font-mono`}
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••"
                  autoFocus
                  disabled={submitting}
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={submitting}
                  className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-50"
                >
                  Resend Code
                </button>
                <button
                  type="button"
                  onClick={() => setStep("INPUT")}
                  disabled={submitting}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Change Number
                </button>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep("INPUT")}
                  className="px-3 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleAuthorizeDefault}
                  disabled={submitting || authCode.length !== 6}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#00488D] rounded-xl hover:bg-[#003A73] transition disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Authorize &amp; Continue
                </button>
              </div>
            </div>
          )}

          {step === "VERIFY_NEW" && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 leading-relaxed">
                Verification code sent to <strong>{mobile}</strong>. Enter code to complete verification.
              </div>
              <div>
                <label className={labelCls}>Enter 6-digit Code</label>
                <input
                  type="text"
                  maxLength={6}
                  inputMode="numeric"
                  className={`${inputCls} text-center font-bold tracking-widest text-base font-mono`}
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••"
                  autoFocus
                  disabled={submitting}
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 select-none">
                <input
                  type="checkbox"
                  checked={makeDefault}
                  onChange={(e) => setMakeDefault(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Set as default OTP destination upon verification</span>
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep("INPUT")}
                  className="px-3 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmNew}
                  disabled={submitting || newCode.length !== 6}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#00488D] rounded-xl hover:bg-[#003A73] transition disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Verify &amp; Save
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 5. Main Security Component ───────────────────────────────────────────────

export default function Security({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showTotpModal, setShowTotpModal] = useState(false);
  const [showAltEmailModal, setShowAltEmailModal] = useState(false);
  const [showAltMobileModal, setShowAltMobileModal] = useState(false);

  const [disablingTotp, setDisablingTotp] = useState(false);
  const [updatingPref, setUpdatingPref] = useState(false);

  const fetchStatus = async () => {
    try {
      const data = await getTwoFactorStatus();
      setStatus(data);
    } catch (err: any) {
      toast({ title: "Failed to load security settings", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleDisable2Fa = async () => {
    const password = prompt("Enter your current password to turn off Two-Factor Authentication:");
    if (!password) return;

    setDisablingTotp(true);
    try {
      const res = await disableTwoFactor(password);
      if (res.success) {
        toast({ title: "2FA Disabled", description: res.message });
        addAccountActivity("2FA Disabled", "Two-factor authentication was deactivated.");
        fetchStatus();
      }
    } catch (err: any) {
      toast({ title: "Failed to disable 2FA", description: err.response?.data?.message || err.message, variant: "destructive" });
    } finally {
      setDisablingTotp(false);
    }
  };

  const handleSetDefaultMethod = async (
    method: "PRIMARY_EMAIL" | "SECONDARY_EMAIL" | "PRIMARY_MOBILE" | "SECONDARY_MOBILE"
  ) => {
    if (method === "SECONDARY_EMAIL" && !status?.alternateEmailVerified) {
      toast({
        title: "Verification required",
        description: "Please verify your secondary email before setting it as default.",
        variant: "destructive",
      });
      return;
    }
    if (method === "SECONDARY_MOBILE" && !status?.alternateMobileVerified) {
      toast({
        title: "Verification required",
        description: "Please verify your secondary mobile number before setting it as default.",
        variant: "destructive",
      });
      return;
    }
    if (method === "PRIMARY_MOBILE" && !status?.primaryMobile) {
      toast({
        title: "No mobile on file",
        description: "No primary mobile number found in your employee profile.",
        variant: "destructive",
      });
      return;
    }

    setUpdatingPref(true);
    try {
      await updateSecurityPreferences({ defaultLoginMethod: method });
      toast({
        title: "Default Destination Updated",
        description: `Default OTP destination set to ${method.replace("_", " ").toLowerCase()}.`,
      });
      await fetchStatus();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setUpdatingPref(false);
    }
  };

  const isPrimaryEmailDefault =
    status?.defaultLoginMethod === "PRIMARY_EMAIL" || status?.defaultLoginMethod === "EMAIL";
  const isSecondaryEmailDefault =
    status?.defaultLoginMethod === "SECONDARY_EMAIL" || status?.defaultLoginMethod === "ALT_EMAIL";
  const isPrimaryMobileDefault =
    status?.defaultLoginMethod === "PRIMARY_MOBILE";
  const isSecondaryMobileDefault =
    status?.defaultLoginMethod === "SECONDARY_MOBILE" || status?.defaultLoginMethod === "ALT_MOBILE";

  const handleRemoveAltEmail = async () => {
    if (!confirm("Are you sure you want to remove your alternate email?")) return;
    try {
      await removeAlternateEmail();
      toast({ title: "Removed", description: "Alternate email removed." });
      fetchStatus();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleRemoveAltMobile = async () => {
    if (!confirm("Are you sure you want to remove your alternate mobile number?")) return;
    try {
      await removeAlternateMobile();
      toast({ title: "Removed", description: "Alternate mobile removed." });
      fetchStatus();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="mx-auto max-w-[840px] pb-12 font-manrope">
      {/* Page Header */}
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
          <h1 className="text-lg font-bold text-[#0F172A] leading-tight">Security &amp; Authentication</h1>
          <p className="text-xs text-gray-500">
            Manage your password, two-factor authentication, backup channels, and OTP delivery preferences.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* ── CARD 1: Password ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#00488D]">
                <Lock className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Password</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Secured with multi-factor verification (Current password + OTP required).
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="px-4 py-2 text-xs font-semibold text-[#00488D] border border-blue-200 bg-blue-50/50 rounded-xl hover:bg-blue-100/60 transition"
            >
              Change Password
            </button>
          </div>
        </div>

        {/* ── CARD 2: Two-Factor Authentication (TOTP / Authenticator App) ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-gray-900">Two-Factor Authentication (2FA)</h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      status?.isEnabled
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {status?.isEnabled ? "Active" : "Disabled"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Require a 6-digit code from Google Authenticator, Microsoft Authenticator, or Bitwarden on login.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {status?.isEnabled ? (
                <>
                  <button
                    onClick={() => setShowTotpModal(true)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
                  >
                    Reconfigure
                  </button>
                  <button
                    onClick={handleDisable2Fa}
                    disabled={disablingTotp}
                    className="px-3.5 py-1.5 text-xs font-semibold text-red-600 border border-red-200 bg-red-50/40 rounded-xl hover:bg-red-50 transition disabled:opacity-50"
                  >
                    Turn Off
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowTotpModal(true)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#00488D] rounded-xl hover:bg-[#003A73] transition shadow-sm"
                >
                  Set Up Authenticator
                </button>
              )}
            </div>
          </div>

          {status?.isEnabled && (
            <div className="p-6 bg-slate-50/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 text-gray-700">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <span>
                  Emergency Recovery Codes: <strong>{status?.remainingRecoveryCodes ?? 0} of 8 remaining</strong>
                </span>
              </div>
              <span className="text-[11px] text-gray-500">
                Single-use backup codes for lost device recovery
              </span>
            </div>
          )}
        </div>

        {/* ── CARD 3: Email Channels & Preferred Target ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3.5">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#00488D]">
                <Mail className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Email Channels &amp; Delivery Target</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Configure primary and backup email addresses and choose where OTPs are dispatched.
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {/* Primary Email */}
            <div className="p-6 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-900">Primary Email (Work)</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700">
                    Official Record
                  </span>
                  {isPrimaryEmailDefault && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-[#00488D] border border-blue-200">
                      Default OTP Channel
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono text-gray-600 mt-1">
                  {status?.primaryEmail || "No work email registered"}
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="defaultOtpMethod"
                  checked={isPrimaryEmailDefault}
                  onChange={() => handleSetDefaultMethod("PRIMARY_EMAIL")}
                  disabled={updatingPref}
                  className="w-4 h-4 text-[#00488D] focus:ring-blue-500"
                />
                <span className="text-xs font-semibold text-gray-700">
                  {isPrimaryEmailDefault ? "Default OTP" : "Make Default"}
                </span>
              </label>
            </div>

            {/* Alternate Email */}
            <div className="p-6 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-900">Secondary Email (Alternate)</span>
                  {status?.alternateEmailVerified ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Verified
                    </span>
                  ) : status?.alternateEmail ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700">
                      Pending Verification
                    </span>
                  ) : null}
                  {isSecondaryEmailDefault && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-[#00488D] border border-blue-200">
                      Default OTP Channel
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono text-gray-600 mt-1">
                  {status?.alternateEmail || "Not configured"}
                </p>
              </div>

              <div className="flex items-center gap-4">
                {status?.alternateEmail ? (
                  <>
                    <label className={`flex items-center gap-2 ${!status?.alternateEmailVerified ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                      <input
                        type="radio"
                        name="defaultOtpMethod"
                        checked={isSecondaryEmailDefault}
                        onChange={() => handleSetDefaultMethod("SECONDARY_EMAIL")}
                        disabled={updatingPref || !status?.alternateEmailVerified}
                        className="w-4 h-4 text-[#00488D] focus:ring-blue-500 disabled:opacity-50"
                      />
                      <span className="text-xs font-semibold text-gray-700">
                        {isSecondaryEmailDefault ? "Default OTP" : "Make Default"}
                      </span>
                    </label>
                    <button
                      onClick={() => setShowAltEmailModal(true)}
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      Change
                    </button>
                    <button
                      onClick={handleRemoveAltEmail}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setShowAltEmailModal(true)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-[#00488D] border border-blue-200 rounded-xl hover:bg-blue-50 transition"
                  >
                    Add Alternate Email
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── CARD 4: Mobile & WhatsApp Channels & Routing ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3.5">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <MessageCircle className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Mobile Channels</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Manage the primary and alternate mobile numbers used for SMS one-time codes.
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {/* WhatsApp Delivery Channel Toggle */}
            <div className="p-6 flex items-center justify-between bg-emerald-50/20">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <MessageCircle className="w-4 h-4" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-gray-900">Deliver Mobile OTPs via WhatsApp</h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
                      Coming soon
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Not available yet — mobile codes are currently delivered by SMS.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-not-allowed opacity-60">
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => undefined}
                  disabled
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Primary Mobile */}
            <div className="p-6 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-900">Primary Mobile</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
                    Profile Record
                  </span>
                  {isPrimaryMobileDefault && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Default OTP Channel
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono text-gray-600 mt-1">
                  {status?.primaryMobile || "No mobile number on file"}
                </p>
              </div>

              <label className={`flex items-center gap-2 ${!status?.primaryMobile ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                <input
                  type="radio"
                  name="defaultOtpMethod"
                  checked={isPrimaryMobileDefault}
                  onChange={() => handleSetDefaultMethod("PRIMARY_MOBILE")}
                  disabled={updatingPref || !status?.primaryMobile}
                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
                />
                <span className="text-xs font-semibold text-gray-700">
                  {isPrimaryMobileDefault ? "Default OTP" : "Make Default"}
                </span>
              </label>
            </div>

            {/* Alternate Mobile */}
            <div className="p-6 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-900">Secondary Mobile (Alternate)</span>
                  {status?.alternateMobileVerified ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Verified
                    </span>
                  ) : status?.alternateMobile ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700">
                      Pending Verification
                    </span>
                  ) : null}
                  {isSecondaryMobileDefault && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Default OTP Channel
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono text-gray-600 mt-1">
                  {status?.alternateMobile || "Not configured"}
                </p>
              </div>

              <div className="flex items-center gap-4">
                {status?.alternateMobile ? (
                  <>
                    <label className={`flex items-center gap-2 ${!status?.alternateMobileVerified ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                      <input
                        type="radio"
                        name="defaultOtpMethod"
                        checked={isSecondaryMobileDefault}
                        onChange={() => handleSetDefaultMethod("SECONDARY_MOBILE")}
                        disabled={updatingPref || !status?.alternateMobileVerified}
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
                      />
                      <span className="text-xs font-semibold text-gray-700">
                        {isSecondaryMobileDefault ? "Default OTP" : "Make Default"}
                      </span>
                    </label>
                    <button
                      onClick={() => setShowAltMobileModal(true)}
                      className="text-xs font-semibold text-emerald-600 hover:underline"
                    >
                      Change
                    </button>
                    <button
                      onClick={handleRemoveAltMobile}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setShowAltMobileModal(true)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200 rounded-xl hover:bg-emerald-50 transition"
                  >
                    Add Alternate Mobile
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showPasswordModal && (
        <ChangePasswordModal status={status} onClose={() => setShowPasswordModal(false)} />
      )}
      {showTotpModal && (
        <SetupTotpModal
          onClose={() => setShowTotpModal(false)}
          onSuccess={() => {
            fetchStatus();
            addAccountActivity("2FA Configured", "Authenticator app was activated.");
          }}
        />
      )}
      {showAltEmailModal && (
        <AlternateEmailModal
          currentEmail={status?.alternateEmail ?? null}
          onClose={() => setShowAltEmailModal(false)}
          onSuccess={fetchStatus}
        />
      )}
      {showAltMobileModal && (
        <AlternateMobileModal
          currentMobile={status?.alternateMobile ?? null}
          onClose={() => setShowAltMobileModal(false)}
          onSuccess={fetchStatus}
        />
      )}
    </div>
  );
}
