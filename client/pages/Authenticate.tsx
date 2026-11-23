import { useState, useEffect, useRef, type KeyboardEvent, type ClipboardEvent, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { saveToken, saveUser } from "../utils/token";
import { toast } from "@/hooks/use-toast";
import api from "../api/axios";
import ElasticPulse from "@/components/ui/Elasticpulse";
import { usePermission } from "@/context/PermissionContext";
import { Logo } from "@/components/hms/Logo";
import {
  Smartphone,
  Mail,
  MessageCircle,
  Phone,
  KeyRound,
  ChevronRight,
  X,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import {
  getAvailableLoginMethods,
  resendLoginOtp,
  verifyCustomLoginFactor,
  type LoginMethodOption,
} from "@/api/twoFactor.api";

// ── Icons ────────────────────────────────────────────────────────────────────

function IconArrowRight() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path
        d="M7.25 14.5V12.889H12.889V1.611H7.25V0H12.889C13.332 0 13.711.158 14.027.473 14.342.789 14.5 1.168 14.5 1.611V12.889C14.5 13.332 14.342 13.711 14.027 14.027 13.711 14.342 13.332 14.5 12.889 14.5H7.25ZM5.639 11.278L4.531 10.11 6.585 8.056H0V6.444H6.585L4.531 4.39 5.639 3.222 9.667 7.25 5.639 11.278Z"
        fill="white"
      />
    </svg>
  );
}

function IconDevice() {
  return (
    <svg width="15" height="14" viewBox="0 0 16 14" fill="none">
      <path
        d="M0 14V0H8V3.111H16V14H0ZM1.6 12.444H6.4V10.889H1.6V12.444ZM1.6 9.333H6.4V7.778H1.6V9.333ZM1.6 6.222H6.4V4.667H1.6V6.222ZM1.6 3.111H6.4V1.556H1.6V3.111ZM8 12.444H14.4V4.667H8V12.444ZM9.6 7.778V6.222H12.8V7.778H9.6ZM9.6 10.889V9.333H12.8V10.889H9.6Z"
        fill="#727783"
      />
    </svg>
  );
}

// ── OTP Input ─────────────────────────────────────────────────────────────────

const OTP_LENGTH = 6;

interface OtpInputProps {
  values: string[];
  hasError: boolean[];
  inputRefs: React.RefObject<HTMLInputElement>[];
  onChange: (index: number, value: string) => void;
  onKeyDown: (index: number, e: KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (index: number, e: ClipboardEvent<HTMLInputElement>) => void;
}

function OtpInput({ values, hasError, inputRefs, onChange, onKeyDown, onPaste }: OtpInputProps) {
  return (
    <div className="flex gap-2.5 mb-5">
      {Array.from({ length: OTP_LENGTH }).map((_, i) => (
        <input
          key={i}
          ref={inputRefs[i]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          autoComplete="off"
          value={values[i]}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={(e) => onPaste(i, e)}
          onFocus={(e) => e.target.select()}
          className={[
            "w-14 h-14 rounded-[6px] text-center text-[22px] font-bold text-[#00488D] font-manrope outline-none transition-all duration-150",
            hasError[i]
              ? "bg-[#FFF0F0] border-[1.5px] border-[#e24b4a]"
              : values[i]
              ? "bg-[#EEF4FC] border-[1.5px] border-[#B5D4F4]"
              : "bg-[#F3F5FB] border-[1.5px] border-transparent focus:border-[#00488D] focus:bg-[#EEF4FC]",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const TIMER_START = 299;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function Authenticate() {
  const navigate = useNavigate();
  const { refetch: refetchPermissions } = usePermission();

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [errors, setErrors] = useState<boolean[]>(Array(OTP_LENGTH).fill(false));
  const [timeLeft, setTimeLeft] = useState(TIMER_START);
  const [isExpired, setIsExpired] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(() => sessionStorage.getItem("otpSent") !== "true");
  const [otpSent, setOtpSent] = useState(() => sessionStorage.getItem("otpSent") === "true");
  const [isLoading, setIsLoading] = useState(false);

  // Multi-Factor & Alternative Verification States
  const [authMode, setAuthMode] = useState<"EMAIL_OTP" | "TOTP" | "RECOVERY">("EMAIL_OTP");
  const [activeChannelLabel, setActiveChannelLabel] = useState<string>("your registered email");
  // Channel explicitly chosen in the "Choose verification method" modal.
  // null = the default delivery used by /auth/send-otp (email).
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [recoveryCode, setRecoveryCode] = useState<string>("");
  const [showMethodModal, setShowMethodModal] = useState<boolean>(false);
  const [availableMethods, setAvailableMethods] = useState<LoginMethodOption[]>([]);
  const [loadingMethods, setLoadingMethods] = useState<boolean>(false);

  const inputRefs = Array.from({ length: OTP_LENGTH }, () =>
    useRef<HTMLInputElement>(null)
  );

  // Send OTP on mount only if not already sent during login
  useEffect(() => {
    const checkOrSendOtp = async () => {
      const username = sessionStorage.getItem("pendingUsername");
      if (!username) {
        toast({
          title: "Session Expired",
          description: "No pending session found. Please login again.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      if (sessionStorage.getItem("otpSent") === "true") {
        setOtpSent(true);
        setIsSendingOtp(false);
        return;
      }

      try {
        await api.post("/auth/send-otp", { username });
        sessionStorage.setItem("otpSent", "true");
        setOtpSent(true);
        toast({ title: "OTP Sent", description: "Check your email for the 6-digit code" });
      } catch (error: any) {
        toast({
          title: "Failed to Send OTP",
          description: error.response?.data?.message || "Try again",
          variant: "destructive",
        });
      } finally {
        setIsSendingOtp(false);
      }
    };

    checkOrSendOtp();
  }, [navigate]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      setIsExpired(true);
      return;
    }
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timeLeft]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs[0].current?.focus();
  }, []);

  const focusBox = (index: number) => {
    if (index >= 0 && index < OTP_LENGTH) {
      inputRefs[index].current?.focus();
    }
  };

  const handleChange = (index: number, rawValue: string) => {
    const value = rawValue.replace(/\D/g, "");
    const char = value ? value[value.length - 1] : "";

    const next = [...digits];
    next[index] = char;
    setDigits(next);

    const nextErrors = [...errors];
    nextErrors[index] = false;
    setErrors(nextErrors);

    if (char && index < OTP_LENGTH - 1) {
      focusBox(index + 1);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      focusBox(index - 1);
    }
    if (e.key === "ArrowLeft" && index > 0) focusBox(index - 1);
    if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) focusBox(index + 1);
  };

  const handlePaste = (index: number, e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "");
    const next = [...digits];
    [...text].slice(0, OTP_LENGTH).forEach((ch, j) => {
      if (index + j < OTP_LENGTH) next[index + j] = ch;
    });
    setDigits(next);
    focusBox(Math.min(index + text.length, OTP_LENGTH - 1));
  };

  const handleVerify = async () => {
    const username = sessionStorage.getItem("pendingUsername");
    const rememberMe = sessionStorage.getItem("rememberMe") === "true";

    if (!username) {
      toast({ title: "Error", description: "Session expired. Please login again.", variant: "destructive" });
      navigate("/");
      return;
    }

    let code = digits.join("");
    if (authMode === "RECOVERY") {
      code = recoveryCode.trim();
      if (!code) {
        toast({ title: "Code required", description: "Please enter your emergency recovery code.", variant: "destructive" });
        return;
      }
    } else {
      if (code.length < OTP_LENGTH) {
        const nextErrors = digits.map((d) => !d);
        setErrors(nextErrors);
        const firstEmpty = digits.findIndex((d) => !d);
        focusBox(firstEmpty);
        setTimeout(() => setErrors(Array(OTP_LENGTH).fill(false)), 900);
        return;
      }
    }

    setIsLoading(true);

    try {
      let authPayload: any = null;

      if (authMode === "TOTP" || authMode === "RECOVERY") {
        authPayload = await verifyCustomLoginFactor(username, code, authMode);
      } else {
        const res = await api.post("/auth/verify-otp", { username, code, rememberMe });
        if (!res.data.success) throw new Error(res.data.message);
        authPayload = res.data.data;
      }

      if (authPayload) {
        const { token, user } = authPayload;

        try {
          localStorage.removeItem("permissions");
          localStorage.removeItem("userPermissions");
          sessionStorage.removeItem("permissions");
          sessionStorage.removeItem("userPermissions");
        } catch {}

        saveToken(token, rememberMe);
        saveUser(user, rememberMe);
        sessionStorage.removeItem("pendingUsername");
        sessionStorage.removeItem("otpSent");
        try {
          sessionStorage.setItem("justLoggedIn", "true");
        } catch {}

        try {
          await refetchPermissions();
        } catch {}

        const roleType = String(user?.role_type ?? "").trim().toUpperCase();
        if (roleType === "LAB_TECHNICIAN") {
          navigate("/lab/dashboard", { replace: true, state: { fromLogin: true } });
        } else {
          navigate("/dashboard", { replace: true, state: { fromLogin: true } });
        }
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || "Verification failed";
      toast({ title: "Verification Failed", description: msg, variant: "destructive" });
      setErrors(Array(OTP_LENGTH).fill(true));
      setTimeout(() => setErrors(Array(OTP_LENGTH).fill(false)), 900);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenTryAnotherWay = async () => {
    const username = sessionStorage.getItem("pendingUsername");
    if (!username) return;

    setShowMethodModal(true);
    setLoadingMethods(true);
    try {
      const data = await getAvailableLoginMethods(username);
      setAvailableMethods(data.methods || []);
    } catch {
      toast({ title: "Error", description: "Failed to load alternative verification methods", variant: "destructive" });
    } finally {
      setLoadingMethods(false);
    }
  };

  const handleSelectMethod = async (method: LoginMethodOption) => {
    const username = sessionStorage.getItem("pendingUsername");
    if (!username) return;

    setShowMethodModal(false);

    if (method.id === "TOTP") {
      setAuthMode("TOTP");
      setDigits(Array(OTP_LENGTH).fill(""));
      setErrors(Array(OTP_LENGTH).fill(false));
      setActiveChannelLabel("your Authenticator App");
      toast({ title: "Authenticator App", description: "Enter the 6-digit code from your app" });
      setTimeout(() => inputRefs[0].current?.focus(), 50);
      return;
    }

    if (method.id === "RECOVERY") {
      setAuthMode("RECOVERY");
      setRecoveryCode("");
      setActiveChannelLabel("your emergency recovery code");
      toast({ title: "Recovery Code", description: "Enter one of your 8-character backup codes" });
      return;
    }

    // OTP channels: PRIMARY_EMAIL, ALT_EMAIL, PRIMARY_MOBILE, ALT_MOBILE, SMS, WHATSAPP
    setAuthMode("EMAIL_OTP");
    setActiveChannel(method.id);
    setIsSendingOtp(true);
    try {
      const res = await resendLoginOtp(username, method.id as any);
      setDigits(Array(OTP_LENGTH).fill(""));
      setErrors(Array(OTP_LENGTH).fill(false));
      setTimeLeft(TIMER_START);
      setIsExpired(false);
      setOtpSent(true);
      setActiveChannelLabel(res.destination || method.label);
      toast({ title: "Code Dispatched", description: res.message });
    } catch (err: any) {
      toast({ title: "Failed to send code", description: err.response?.data?.message || err.message, variant: "destructive" });
    } finally {
      setIsSendingOtp(false);
      setTimeout(() => inputRefs[0].current?.focus(), 50);
    }
  };

  const handleResend = async (channelOverride?: string) => {
    const username = sessionStorage.getItem("pendingUsername");
    if (!username) {
      toast({ title: "Error", description: "Session expired. Please login again.", variant: "destructive" });
      navigate("/");
      return;
    }

    const channel = channelOverride ?? activeChannel;

    setIsSendingOtp(true);
    try {
      if (channel) {
        // Resend on the channel the user picked, so choosing "Primary Mobile"
        // never silently falls back to email.
        const res = await resendLoginOtp(username, channel as any);
        setActiveChannelLabel(res.destination || activeChannelLabel);
        toast({ title: "Code Dispatched", description: res.message });
      } else {
        await api.post("/auth/send-otp", { username });
        toast({ title: "OTP Resent", description: "Check your email for the new code" });
      }
      setDigits(Array(OTP_LENGTH).fill(""));
      setErrors(Array(OTP_LENGTH).fill(false));
      setTimeLeft(TIMER_START);
      setIsExpired(false);
      setOtpSent(true);
    } catch (error: any) {
      toast({ title: "Failed to Resend", description: error.response?.data?.message || "Try again", variant: "destructive" });
    } finally {
      setIsSendingOtp(false);
      setTimeout(() => inputRefs[0].current?.focus(), 50);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-clinical-page-bg font-manrope">
      <div className="w-full max-w-5xl flex flex-col md:flex-row rounded-xl overflow-hidden shadow-[0_25px_50px_-12px_rgba(30,58,138,0.08)] border border-[rgba(194,198,212,0.10)]">

        {/* ── LEFT: form panel ── */}
        <div className="bg-white flex flex-col justify-center w-full md:w-[468px] flex-shrink-0 p-8 md:p-10 relative">

          {/* Logo */}
          <div className="mb-6 -ml-2">
            <Logo className="h-16 sm:h-[72px] w-auto max-w-[320px]" iconPosition="left" />
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-[28px] leading-[1.15] tracking-[-0.5px] font-extrabold text-clinical-blue mb-2">
              {authMode === "RECOVERY"
                ? "Account Recovery"
                : authMode === "TOTP"
                ? "Authenticator App"
                : "Two-Step Verification"}
            </h1>
            <p className="text-sm font-medium leading-relaxed text-clinical-body max-w-[320px]">
              {authMode === "RECOVERY"
                ? "Enter one of your 8-character emergency backup recovery codes."
                : authMode === "TOTP"
                ? "Enter the 6-digit code from Google Authenticator, Microsoft Authenticator, or Bitwarden."
                : `Please enter the 6-digit code sent to ${activeChannelLabel}.`}
            </p>
          </div>

          {/* OTP / Recovery Input */}
          {isSendingOtp ? (
            <div className="flex flex-col items-center justify-center py-8">
              <ElasticPulse size={28} color="#00488D" />
              <p className="mt-3 text-sm font-medium text-clinical-body">
                Sending verification code...
              </p>
            </div>
          ) : (
            <>
              {authMode === "RECOVERY" ? (
                <div className="mb-5">
                  <input
                    type="text"
                    maxLength={10}
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                    placeholder="XXXX-XXXX"
                    autoFocus
                    className="w-full h-14 rounded-[6px] text-center text-xl font-bold font-mono tracking-widest text-[#00488D] bg-[#EEF4FC] border-[1.5px] border-[#B5D4F4] focus:outline-none focus:border-[#00488D] transition-all"
                  />
                  <p className="mt-2 text-center text-xs text-clinical-body">
                    Single-use emergency recovery code
                  </p>
                </div>
              ) : (
                <OtpInput
                  values={digits}
                  hasError={errors}
                  inputRefs={inputRefs}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                />
              )}

              {/* Timer (only for time-expiring OTPs) */}
              {authMode === "EMAIL_OTP" && (
                <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-[#9DA3AE] mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B5D4F4] inline-block" />
                  {isExpired ? (
                    <span className="text-[#e24b4a] font-semibold">Code expired</span>
                  ) : (
                    <>
                      Code expires in{" "}
                      <strong className="text-clinical-blue">{formatTime(timeLeft)}</strong>
                    </>
                  )}
                </div>
              )}

              {/* Verify button */}
              <div className="pt-1 mb-4">
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={isLoading || (authMode === "EMAIL_OTP" && isExpired)}
                  className="w-full flex items-center justify-between px-5 py-3 rounded-[4px] bg-gradient-to-br from-clinical-blue to-clinical-blue-mid shadow-[0_10px_15px_-3px_rgba(59,130,246,0.20),0_4px_6px_-4px_rgba(59,130,246,0.20)] hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex w-full justify-center">
                      <ElasticPulse size={20} color="white" />
                    </div>
                  ) : (
                    <>
                      <span className="text-base font-bold leading-5 text-white">
                        Verify Access
                      </span>
                      <IconArrowRight />
                    </>
                  )}
                </button>
              </div>

              {/* Action row: Resend on LEFT, Try another way on RIGHT */}
              <div className="flex items-center justify-between mb-4 px-1">
                {authMode === "EMAIL_OTP" ? (
                  <button
                    type="button"
                    onClick={() => handleResend()}
                    disabled={isLoading || isSendingOtp}
                    className="text-xs font-bold text-clinical-blue hover:underline disabled:opacity-50"
                  >
                    {isSendingOtp ? "Sending..." : "Resend Code"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("EMAIL_OTP");
                      setActiveChannel("PRIMARY_EMAIL");
                      handleResend("PRIMARY_EMAIL");
                    }}
                    className="text-xs font-bold text-clinical-blue hover:underline"
                  >
                    Send Email Code
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleOpenTryAnotherWay}
                  className="text-xs font-semibold text-clinical-body hover:text-clinical-blue transition-colors flex items-center gap-1"
                >
                  <span>Try another way</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Back to login */}
              <button
                type="button"
                onClick={() => {
                  sessionStorage.removeItem("pendingUsername");
                  sessionStorage.removeItem("otpSent");
                  navigate("/");
                }}
                className="flex items-center justify-center gap-2 text-xs font-medium text-clinical-body hover:text-clinical-label transition-colors w-full"
              >
                <IconDevice />
                Back to login
              </button>
            </>
          )}
        </div>

        {/* ── RIGHT: decorative panel ── */}
        <div className="hidden md:flex flex-col flex-1 relative overflow-hidden min-h-[500px] bg-clinical-blue-mid rounded-r-xl">
          <div className="absolute inset-0 bg-cover bg-center bg-[url('https://api.builder.io/api/v1/image/assets/TEMP/dece4f5090fd507e2497a4bba6b015b28dc29434?width=1022')]" />

          <div className="absolute inset-0 bg-gradient-to-br from-clinical-blue via-clinical-blue-mid/80 to-clinical-blue-mid/0" />

          <div className="relative z-10 flex flex-col justify-center gap-5 p-8 h-full">
            <div className="flex flex-col gap-4 p-6 rounded-lg border border-white/10 bg-white/[0.16] backdrop-blur-xl">
              <div className="w-fit p-[10px] rounded-[4px] bg-white/20 backdrop-blur-md">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
<path
                    d="M4 14H6V9H4V14ZM12 14H14V4H12V14ZM8 14H10V11H8V14ZM8 9H10V7H8V9ZM2 18C1.45 18 0.979167 17.8042 0.5875 17.4125C0.195833 17.0208 0 16.55 0 16V2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0H16C16.55 0 17.0208 0.195833 17.4125 0.5875C17.8042 0.979167 18 1.45 18 2V16C18 16.55 17.8042 17.0208 17.4125 17.4125C17.0208 17.8042 16.55 18 16 18H2Z"
                    fill="white"
                  />
                </svg>
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold leading-7 tracking-[-0.5px] text-white">Precision Administration</h2>
                <p className="text-sm font-medium text-clinical-blue-light leading-[22.75px]">
                  High-fidelity data visualization and editorial clarity for modern healthcare management.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4 p-6 rounded-lg border border-white/10 bg-white/[0.16] backdrop-blur-xl">
              <div className="w-fit p-[10px] rounded-[4px] bg-white/20 backdrop-blur-md">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path
                    d="M2 20C1.45 20 0.979167 19.8042 0.5875 19.4125C0.195833 19.0208 0 18.55 0 18V6C0 5.45 0.195833 4.97917 0.5875 4.5875C0.979167 4.19583 1.45 4 2 4H6V2C6 1.45 6.19583 0.979167 6.5875 0.5875C6.97917 0.195833 7.45 0 8 0H12C12.55 0 13.0208 0.195833 13.4125 0.5875C13.8042 0.979167 14 1.45 14 2V4H18C18.55 4 19.0208 4.195833 19.4125 4.5875C19.8042 4.97917 20 5.45 20 6V18C20 18.55 19.8042 19.0208 19.4125 19.4125C19.0208 19.8042 18.55 20 18 20H2ZM2 18H18V6H2V18ZM8 4H12V2H8V4ZM9 13V16H11V13H14V11H11V8H9V11H6V13H9Z"
                    fill="white"
                  />
                </svg>
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold leading-7 tracking-[-0.5px] text-white">Empowering Clinical Excellence</h2>
                <p className="text-sm font-medium text-clinical-blue-light leading-[22.75px]">
                  High-fidelity data visualization and editorial clarity for modern healthcare management.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Try Another Way Modal ── */}
      {showMethodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowMethodModal(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-[#00488D]">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Choose verification method</h3>
                  <p className="text-[11px] text-gray-500">Select an alternative way to prove your identity</p>
                </div>
              </div>
              <button
                onClick={() => setShowMethodModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-2.5 max-h-[420px] overflow-y-auto">
              {loadingMethods ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <ElasticPulse size={24} color="#00488D" />
                  <p className="mt-3 text-xs text-gray-500">Checking configured channels...</p>
                </div>
              ) : availableMethods.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-gray-200 text-center">
                  <p className="text-xs text-gray-500">No other methods configured yet.</p>
                  <p className="text-[11px] text-gray-400 mt-1">Configure 2FA, alternate email, or mobile in Settings &gt; Security.</p>
                </div>
              ) : (
                availableMethods.map((m) => {
                  let IconComp = Mail;
                  let iconBg = "bg-blue-50 text-blue-600";
                  if (m.id === "TOTP") {
                    IconComp = Smartphone;
                    iconBg = "bg-indigo-50 text-indigo-600";
                  } else if (m.id === "WHATSAPP") {
                    IconComp = MessageCircle;
                    iconBg = "bg-emerald-50 text-emerald-600";
                  } else if (m.id === "PRIMARY_MOBILE") {
                    IconComp = Phone;
                    iconBg = "bg-sky-50 text-sky-600";
                  } else if (m.id === "ALT_MOBILE") {
                    IconComp = Smartphone;
                    iconBg = "bg-violet-50 text-violet-600";
                  } else if (m.id === "SMS") {
                    IconComp = Phone;
                    iconBg = "bg-sky-50 text-sky-600";
                  } else if (m.id === "RECOVERY") {
                    IconComp = KeyRound;
                    iconBg = "bg-amber-50 text-amber-600";
                  }

                  return (
                    <button
                      key={m.id}
                      onClick={() => handleSelectMethod(m)}
                      className="w-full flex items-center justify-between p-3.5 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-900 group-hover:text-blue-700">
                            {m.label}
                          </div>
                          <div className="text-[11px] text-gray-500 line-clamp-1">
                            {m.description}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                    </button>
                  );
                })
              )}
            </div>

            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-end">
              <button
                onClick={() => setShowMethodModal(false)}
                className="px-4 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}