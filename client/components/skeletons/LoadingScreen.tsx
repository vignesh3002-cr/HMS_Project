import { Loader2 } from "lucide-react";

export function LoadingScreen({ message = "Loading dashboard..." }: { message?: string }) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F7F9FB] p-8">
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#00488D] flex items-center justify-center shadow-sm">
            <span className="text-white font-extrabold text-lg tracking-[-0.5px]">HMS</span>
          </div>
          <div className="text-left">
            <div className="text-[#00488D] font-extrabold text-base leading-none">HMS</div>
            <div className="text-[#64748B] text-[11px] font-semibold tracking-[0.5px]">admin portal</div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#00488D]" />
          <p className="text-sm font-semibold text-[#334155]">{message}</p>
          <p className="text-xs text-[#94A3B8]">Preparing your workspace...</p>
        </div>
      </div>
    </div>
  );
}

export function DashboardLoadingScreen() {
  return (
    <div className="min-h-screen w-full bg-[#F7F9FB] relative overflow-hidden">
      {/* Faded skeleton behind */}
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        <div className="p-6 pt-20">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8 mb-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-white border border-[#E5E7EB] shadow-sm animate-pulse" />
            ))}
          </div>
          <div className="h-96 rounded-xl bg-white border border-[#E5E7EB] shadow-sm animate-pulse" />
        </div>
      </div>
      {/* Center loader */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-xl border border-[#E5E7EB] p-8 flex flex-col items-center gap-4 min-w-[320px]">
          <div className="w-12 h-12 rounded-xl bg-[#00488D] flex items-center justify-center">
            <span className="text-white font-extrabold text-lg">HMS</span>
          </div>
          <Loader2 className="w-7 h-7 animate-spin text-[#00488D]" />
          <div className="text-center">
            <p className="text-sm font-bold text-[#1E293B]">Loading Admin Dashboard</p>
            <p className="text-xs text-[#64748B] mt-1">Fetching your data...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoadingScreen;
