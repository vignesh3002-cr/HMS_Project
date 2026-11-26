import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import API from "@/api/axios";
import { toast } from "@/hooks/use-toast";
import { saveToken, saveUser } from "@/utils/token";
import { Logo } from "@/components/hms/Logo";

export default function OwnerLogin() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!username.trim() || !password.trim()) {
      toast({
        title: "Missing Credentials",
        description: "Please enter username and password",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const res = await API.post("/auth/login", {
        username: username.trim(),
        password,
        rememberMe,
      });

      if (!res.data.success) {
        throw new Error(res.data.message || "Login failed");
      }

      const payload = res.data?.data ?? {};
      const token = payload.token;
      const user = payload.user ?? null;

      if (!token) {
        throw new Error("Login succeeded but no authentication token was returned.");
      }
      if (!user) {
        throw new Error("Login succeeded but no user information was returned.");
      }

      const roleType = String(user.role_type ?? "").trim().toUpperCase();
      if (roleType !== "SYSTEM_OWNER") {
        throw new Error("Access denied. This login is for System Owner only.");
      }

      saveToken(token, rememberMe);
      saveUser(user, rememberMe);

      toast({
        title: "Welcome, System Owner",
        description: `Logged in as ${user.username}`,
      });

      navigate("/owner-dashboard", { replace: true });
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Login failed";

      toast({
        title: "Login Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-clinical-page-bg font-manrope">
      <div className="w-full max-w-md flex flex-col justify-center rounded-xl overflow-hidden shadow-[0_25px_50px_-12px_rgba(30,58,138,0.08)] border border-[rgba(194,198,212,0.10)] p-8 md:p-10">
        <div className="mb-7">
          <div className="mb-4 -ml-2">
            <Logo className="h-20 w-auto max-w-[360px]" iconPosition="left" />
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">System Owner Login</h2>
          <p className="text-sm text-slate-500">
            Sign in to the system owner portal to manage Super Admins and Hospitals.
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          {/* Username */}
          <div className="flex flex-col gap-3">
            <label className="text-[14px] font-bold tracking-[0.9px] uppercase text-slate-600 leading-[13.5px]">
              Username
            </label>
            <div className="flex items-center rounded-[4px] bg-clinical-input-bg">
              <div className="flex items-center gap-[11px] flex-1 px-4 py-3 overflow-hidden">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  className="flex-1 bg-transparent text-xs font-medium outline-none border-none min-w-0 text-clinical-label placeholder:text-clinical-label/50"
                />
              </div>
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-3">
            <label className="text-[14px] font-bold tracking-[0.9px] uppercase text-slate-600 leading-[13.5px]">
              Password
            </label>
            <div className="flex items-center rounded-[4px] bg-clinical-input-bg">
              <div className="flex items-center gap-3 flex-1 px-4 py-3 overflow-hidden">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="flex-1 bg-transparent text-xs font-medium outline-none border-none min-w-0 text-clinical-label/50 placeholder:text-clinical-label/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m15 18-.722-3.25" />
                      <path d="M2 8a10.645 10.645 0 0 0 20 0" />
                      <path d="m20 15-1.726-2.05" />
                      <path d="m4 15 1.726-2.05" />
                      <path d="m9 18 .722-3.25" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                className="relative w-[14px] h-[14px] flex-shrink-0 rounded-[2px] border border-[#C2C6D4] bg-white cursor-pointer"
                onClick={() => setRememberMe(!rememberMe)}
              >
                {rememberMe && (
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7L5.5 10.5L12 3.5" stroke="#00488D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="text-xs font-medium leading-4 text-clinical-body">Remember me</span>
            </label>
          </div>

          {/* Login Button */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center px-5 py-3 rounded-[4px] bg-gradient-to-br from-clinical-blue to-clinical-blue-mid shadow-[0_10px_15px_-3px_rgba(59,130,246,0.20),0_4px_6px_-4px_rgba(59,130,246,0.20)] hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex w-full justify-center">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 2 5.373 2 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : (
                <span className="text-base font-bold leading-5 text-white">Sign In</span>
              )}
            </button>
          </div>

          <p className="text-xs text-center text-slate-400 mt-4">
            System Owner portal — create Super Admins and Hospitals.
          </p>
        </form>
      </div>
    </div>
  );
}