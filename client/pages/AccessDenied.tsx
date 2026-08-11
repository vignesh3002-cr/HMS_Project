import { useNavigate, useLocation } from "react-router-dom";
import { Lock, Home, ArrowLeft } from "lucide-react";

export default function AccessDenied() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || "/dashboard";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F9FB] px-4">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <Lock className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-3xl font-bold text-[#191C1E] mb-2">Access Denied</h1>
        <p className="text-[#64748B] mb-8">
          You don't have permission to access this page. Please contact your administrator if you believe this is an error.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate(from)}
            className="flex items-center gap-2 px-4 py-2 bg-[#004785] rounded-lg text-white text-sm font-semibold shadow-sm hover:bg-[#003a6b] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 px-4 py-2 border border-[#E5E7EB] rounded-lg text-[#374151] text-sm font-semibold hover:bg-[#F2F4F6] transition-colors"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}