import { useState, useEffect, useRef, type KeyboardEvent, type ClipboardEvent, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { saveToken, saveUser } from "../utils/token";
import { toast } from "@/hooks/use-toast";
import api from "../api/axios";
import ElasticPulse from "@/components/ui/Elasticpulse";

// ── Icons ────────────────────────────────────────────────────────────────────

function IconStats() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M4 14H6V9H4V14ZM12 14H14V4H12V14ZM8 14H10V11H8V14ZM8 9H10V7H8V9ZM2 18C1.45 18 .979 17.804.588 17.413.196 17.021 0 16.55 0 16V2C0 1.45.196.979.588.588.979.196 1.45 0 2 0H16C16.55 0 17.021.196 17.413.588 17.804.979 18 1.45 18 2V16C18 16.55 17.804 17.021 17.413 17.413 17.021 17.804 16.55 18 16 18H2Z"
        fill="white"
      />
    </svg>
  );
}

function IconMedical() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M2 20C1.45 20 .979 19.804.588 19.413.196 19.021 0 18.55 0 18V6C0 5.45.196 4.979.588 4.588.979 4.196 1.45 4 2 4H6V2C6 1.45 6.196.979 6.588.588 6.979.196 7.45 0 8 0H12C12.55 0 13.021.196 13.413.588 13.804.979 14 1.45 14 2V4H18C18.55 4 19.021 4.196 19.413 4.588 19.804 4.979 20 5.45 20 6V18C20 18.55 19.804 19.021 19.413 19.413 19.021 19.804 18.55 20 18 20H2ZM2 18H18V6H2V18ZM8 4H12V2H8V4ZM9 13V16H11V13H14V11H11V8H9V11H6V13H9Z"
        fill="white"
      />
    </svg>
  );
}

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

// ── Sub-components ──────────────────────────────────────────────────────────

interface GlassCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function GlassCard({ icon, title, description }: GlassCardProps) {
  return (
    <div className="rounded-[10px] border border-white/15 bg-white/[0.12] backdrop-blur-xl p-6 flex flex-col gap-3.5">
      <div className="w-10 h-10 rounded-[6px] bg-white/20 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <h2 className="text-[17px] font-bold text-white tracking-[-0.3px] leading-[1.35] mb-1">
          {title}
        </h2>
        <p className="text-[13px] font-medium text-[rgba(180,210,245,0.9)] leading-[1.65]">
          {description}
        </p>
      </div>
    </div>
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

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [errors, setErrors] = useState<boolean[]>(Array(OTP_LENGTH).fill(false));
  const [timeLeft, setTimeLeft] = useState(TIMER_START);
  const [isExpired, setIsExpired] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(true);
  const [otpSent, setOtpSent] = useState(false);

  const inputRefs = Array.from({ length: OTP_LENGTH }, () =>
    useRef<HTMLInputElement>(null)
  );

  // Send OTP on mount
  useEffect(() => {
    const sendOtp = async () => {
      const username = sessionStorage.getItem("pendingUsername");
      if (!username) {
        toast({
          title: "Error",
          description: "No username found. Please login again.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      try {
        await api.post("/auth/send-otp", { username });
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

    sendOtp();
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
    const code = digits.join("");
    if (code.length < OTP_LENGTH) {
      const nextErrors = digits.map((d) => !d);
      setErrors(nextErrors);
      const firstEmpty = digits.findIndex((d) => !d);
      focusBox(firstEmpty);
      setTimeout(() => setErrors(Array(OTP_LENGTH).fill(false)), 900);
      return;
    }

    const username = sessionStorage.getItem("pendingUsername");
    if (!username) {
      toast({ title: "Error", description: "Session expired. Please login again.", variant: "destructive" });
      navigate("/");
      return;
    }

    try {
      const res = await api.post("/auth/verify-otp", { username, code });
      
      if (res.data.success) {
        const { token, user } = res.data.data;
        saveToken(token);
        saveUser(user);
        sessionStorage.removeItem("pendingUsername");
        navigate("/dashboard");
      } else {
        throw new Error(res.data.message);
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || "Invalid OTP";
      toast({ title: "Verification Failed", description: msg, variant: "destructive" });
      setErrors(Array(OTP_LENGTH).fill(true));
      setTimeout(() => setErrors(Array(OTP_LENGTH).fill(false)), 900);
    }
  };

  const handleResend = async () => {
    const username = sessionStorage.getItem("pendingUsername");
    if (!username) {
      toast({ title: "Error", description: "Session expired. Please login again.", variant: "destructive" });
      navigate("/");
      return;
    }

    setIsSendingOtp(true);
    try {
      await api.post("/auth/send-otp", { username });
      setDigits(Array(OTP_LENGTH).fill(""));
      setErrors(Array(OTP_LENGTH).fill(false));
      setTimeLeft(TIMER_START);
      setIsExpired(false);
      setOtpSent(true);
      toast({ title: "OTP Resent", description: "Check your email for the new code" });
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
          <span className="absolute top-7 left-10 text-[20px] font-extrabold text-clinical-blue tracking-[-0.5px]">
            HMS
          </span>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-[28px] leading-[1.15] tracking-[-0.5px] font-extrabold text-clinical-blue mb-2">
              Two-Step Verification
            </h1>
            <p className="text-sm font-medium leading-relaxed text-clinical-body max-w-[300px]">
              Please sign in to your clinical environment. We've sent a 6-digit
              code to your registered device.
            </p>
          </div>

          {/* OTP */}
          {isSendingOtp ? (
            <div className="flex flex-col items-center justify-center py-8">
              <ElasticPulse size={28} color="#00488D" />
              <p className="mt-3 text-sm font-medium text-clinical-body">Sending code to your email...</p>
            </div>
          ) : (
            <>
              <OtpInput
                values={digits}
                hasError={errors}
                inputRefs={inputRefs}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
              />

              {/* Timer */}
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

              {/* Verify button */}
              <div className="pt-1 mb-4">
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={isExpired}
                  className="w-full flex items-center justify-between px-5 py-3 rounded-[4px] bg-gradient-to-br from-clinical-blue to-clinical-blue-mid shadow-[0_10px_15px_-3px_rgba(59,130,246,0.20),0_4px_6px_-4px_rgba(59,130,246,0.20)] hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-base font-bold leading-5 text-white">
                    Verify Access
                  </span>
                  <IconArrowRight />
                </button>
              </div>

              {/* Resend */}
              <div className="text-center mb-3">
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-xs font-bold text-clinical-blue hover:underline"
                >
                  Resend Code
                </button>
              </div>

              {/* Alt method */}
              <button
                type="button"
                className="flex items-center justify-center gap-2 text-xs font-medium text-clinical-body hover:text-clinical-label transition-colors w-full"
              >
                <IconDevice />
                Use a different method
              </button>
            </>
          )}
        </div>

        {/* ── RIGHT: decorative panel ── */}
        <div className="hidden md:flex flex-col flex-1 relative overflow-hidden min-h-[500px] rounded-r-xl">

          {/* CSS-generated building background */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: "#0a3d6b",
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px),
                linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
              `,
              backgroundSize: "80px 80px, 80px 80px, 20px 20px, 20px 20px",
            }}
          />

          {/* Building silhouette */}
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{
              height: 320,
              background: "linear-gradient(to top, rgba(5,28,55,0.95) 0%, transparent 100%)",
            }}
          >
            {/* Centre tower */}
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2"
              style={{
                width: 160,
                height: 280,
                background: "rgba(6,38,72,0.85)",
                boxShadow:
                  "inset 12px 0 0 rgba(255,255,255,0.04), inset -12px 0 0 rgba(255,255,255,0.04)",
              }}
            />
            {/* Wing buildings */}
            <div
              className="absolute bottom-0 left-0 right-0"
              style={{
                height: 180,
                background: "rgba(8,44,82,0.80)",
                clipPath:
                  "polygon(0 100%,0 55%,18% 45%,30% 10%,42% 45%,58% 45%,70% 10%,82% 45%,100% 55%,100% 100%)",
              }}
            />
          </div>

          {/* Window glow dots */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                radial-gradient(ellipse 2px 3px at 50% 22%, rgba(180,220,255,0.55) 0%, transparent 100%),
                radial-gradient(ellipse 2px 3px at 50% 32%, rgba(180,220,255,0.40) 0%, transparent 100%),
                radial-gradient(ellipse 2px 3px at 44% 22%, rgba(180,220,255,0.45) 0%, transparent 100%),
                radial-gradient(ellipse 2px 3px at 56% 22%, rgba(180,220,255,0.45) 0%, transparent 100%),
                radial-gradient(ellipse 60px 40px at 25% 70%, rgba(255,200,80,0.08) 0%, transparent 100%),
                radial-gradient(ellipse 60px 40px at 75% 70%, rgba(255,200,80,0.08) 0%, transparent 100%)
              `,
            }}
          />

          {/* Sky gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(160deg, rgba(0,72,141,0.75) 0%, rgba(10,80,155,0.5) 40%, rgba(5,35,70,0.88) 100%)",
            }}
          />

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-center gap-5 p-8 h-full">
            {/* Step indicator */}
            <div className="flex gap-1.5 mb-1">
              <div className="h-1 w-3 rounded-full bg-white/55" />
              <div className="h-1 w-5 rounded-full bg-white/90" />
              <div className="h-1 w-3 rounded-full bg-white/25" />
            </div>

            <GlassCard
              icon={<IconStats />}
              title="Precision Administration"
              description="High-fidelity data visualization and editorial clarity for modern healthcare management."
            />

            <GlassCard
              icon={<IconMedical />}
              title="Empowering Clinical Excellence"
              description="High-fidelity data visualization and editorial clarity for modern healthcare management."
            />
          </div>
        </div>

      </div>
    </div>
  );
}