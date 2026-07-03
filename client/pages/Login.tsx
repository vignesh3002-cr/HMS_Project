import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/auth.api";
import { saveToken, saveUser } from "../utils/token";

export default function Login() {
  const navigate = useNavigate();
  const [rememberMe, setRememberMe] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

 const handleLogin = async (e: React.FormEvent) => {

    e.preventDefault();

    try {

        const response = await login(username, password);

        const { token, user, user_details } = response.data;

        saveToken(token);

        saveUser(user_details);

        localStorage.setItem(
            "user_info",
            JSON.stringify(user)
        );

        alert("Login Successful");

        navigate("/dashboard");

    } catch (error: any) {

        alert(
            error.response?.data?.message ||
            "Invalid Username or Password"
        );

    }

};

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-clinical-page-bg font-manrope">
      <div className="w-full max-w-5xl flex flex-col md:flex-row rounded-xl overflow-hidden shadow-[0_25px_50px_-12px_rgba(30,58,138,0.08)] border border-[rgba(194,198,212,0.10)]">
        <div className="bg-white flex flex-col justify-center w-full md:w-[468px] flex-shrink-0 p-8 md:p-10 relative">
          <div className="mb-7">
            <h1 className="text-[32px] leading-[30px] tracking-[-0.6px] font-extrabold text-clinical-blue mb-2">
              Welcome Back
            </h1>
            <p className="text-sm font-medium leading-5 text-clinical-body">
              Please sign in to your clinical environment.
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div className="flex flex-col gap-3">
              <label className="text-[14px] font-bold tracking-[0.9px] uppercase text-clinical-label leading-[13.5px]">
                Username
              </label>
              <div className="flex items-center rounded-[4px] bg-clinical-input-bg">
                <div className="flex items-center gap-[11px] flex-1 px-4 py-3 overflow-hidden">
                  <svg
                    width="16"
                    height="14"
                    viewBox="0 0 16 14"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="flex-shrink-0"
                  >
                    <path
                      d="M0 14V0H8V3.11111H16V14H0ZM1.6 12.4444H6.4V10.8889H1.6V12.4444ZM1.6 9.33333H6.4V7.77778H1.6V9.33333ZM1.6 6.22222H6.4V4.66667H1.6V6.22222ZM1.6 3.11111H6.4V1.55556H1.6V3.11111ZM8 12.4444H14.4V4.66667H8V12.4444ZM9.6 7.77778V6.22222H12.8V7.77778H9.6ZM9.6 10.8889V9.33333H12.8V10.8889H9.6Z"
                      fill="#727783"
                    />
                  </svg>
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

            <div className="flex flex-col gap-3">
              <label className="text-[14px] font-bold tracking-[0.9px] uppercase text-clinical-label leading-[13.5px]">
                Password
              </label>
              <div className="flex items-center rounded-[4px] bg-clinical-input-bg">
                <div className="flex items-center gap-3 flex-1 px-4 py-3 overflow-hidden">
                  <svg
                    width="14"
                    height="18"
                    viewBox="0 0 14 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="flex-shrink-0"
                  >
                    <path
                      d="M1.66667 17.5C1.20833 17.5 0.815972 17.3368 0.489583 17.0104C0.163195 16.684 0 16.2917 0 15.8333V7.5C0 7.04167 0.163195 6.6493 0.489583 6.32292C0.815972 5.99653 1.20833 5.83333 1.66667 5.83333H2.5V4.16667C2.5 3.01389 2.90625 2.03125 3.71875 1.21875C4.53125 0.40625 5.51389 0 6.66667 0C7.81944 0 8.80208 0.40625 9.61458 1.21875C10.4271 2.03125 10.8333 3.01389 10.8333 4.16667V5.83333H11.6667C12.125 5.83333 12.5174 5.99653 12.8437 6.32292C13.1701 6.6493 13.3333 7.04167 13.3333 7.5V15.8333C13.3333 16.2917 13.1701 16.684 12.8437 17.0104C12.5174 17.3368 12.125 17.5 11.6667 17.5H1.66667ZM1.66667 15.8333H11.6667V7.5H1.66667V15.8333ZM6.66667 13.3333C7.125 13.3333 7.51736 13.1701 7.84375 12.8437C8.17014 12.5174 8.33333 12.125 8.33333 11.6667C8.33333 11.2083 8.17014 10.816 7.84375 10.4896C7.51736 10.1632 7.125 10 6.66667 10C6.20833 10 5.81597 10.1632 5.48958 10.4896C5.16319 10.816 5 11.2083 5 11.6667C5 12.125 5.16319 12.5174 5.48958 12.8437C5.81597 13.1701 6.20833 13.3333 6.66667 13.3333ZM4.16667 5.83333H9.16667V4.16667C9.16667 3.47222 8.92361 2.88194 8.4375 2.39583C7.95139 1.90972 7.36111 1.66667 6.66667 1.66667C5.97222 1.66667 5.38194 1.90972 4.89583 2.39583C4.40972 2.88194 4.16667 3.47222 4.16667 4.16667V5.83333Z"
                      fill="#727783"
                    />
                  </svg>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="flex-1 bg-transparent text-xs font-medium outline-none border-none min-w-0 text-clinical-label/50 placeholder:text-clinical-label/50"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  className="relative w-[14px] h-[14px] flex-shrink-0 rounded-[2px] border border-[#C2C6D4] bg-white cursor-pointer"
                  onClick={() => setRememberMe(!rememberMe)}
                >
                  {rememberMe && (
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M2 7L5.5 10.5L12 3.5"
                        stroke="#00488D"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <span className="text-xs font-medium leading-4 text-clinical-body">Remember me</span>
              </label>
              <button type="button" className="text-xs font-bold leading-4 text-clinical-blue hover:underline">
                Forgot Password?
              </button>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                className="w-full flex items-center justify-between px-5 py-3 rounded-[4px] bg-gradient-to-br from-clinical-blue to-clinical-blue-mid shadow-[0_10px_15px_-3px_rgba(59,130,246,0.20),0_4px_6px_-4px_rgba(59,130,246,0.20)] hover:opacity-90 active:opacity-80 transition-opacity"
              >
                <span className="text-base font-bold leading-5 text-white">Login</span>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M7.25 14.5V12.8889H12.8889V1.61111H7.25V0H12.8889C13.3319 0 13.7112 0.157755 14.0267 0.473264C14.3422 0.788773 14.5 1.16806 14.5 1.61111V12.8889C14.5 13.3319 14.3422 13.7112 14.0267 14.0267C13.7112 14.3422 13.3319 14.5 12.8889 14.5H7.25ZM5.63889 11.2778L4.53125 10.1097L6.58542 8.05556H0V6.44444H6.58542L4.53125 4.39028L5.63889 3.22222L9.66667 7.25L5.63889 11.2778Z"
                    fill="white"
                  />
                </svg>
              </button>
            </div>
          </form>
        </div>

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
                    d="M2 20C1.45 20 0.979167 19.8042 0.5875 19.4125C0.195833 19.0208 0 18.55 0 18V6C0 5.45 0.195833 4.97917 0.5875 4.5875C0.979167 4.19583 1.45 4 2 4H6V2C6 1.45 6.19583 0.979167 6.5875 0.5875C6.97917 0.195833 7.45 0 8 0H12C12.55 0 13.0208 0.195833 13.4125 0.5875C13.8042 0.979167 14 1.45 14 2V4H18C18.55 4 19.0208 4.19583 19.4125 4.5875C19.8042 4.97917 20 5.45 20 6V18C20 18.55 19.8042 19.0208 19.4125 19.4125C19.0208 19.8042 18.55 20 18 20H2ZM2 18H18V6H2V18ZM8 4H12V2H8V4ZM9 13V16H11V13H14V11H11V8H9V11H6V13H9Z"
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
    </div>
  );
}
