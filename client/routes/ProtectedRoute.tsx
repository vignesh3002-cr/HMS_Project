import { Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { usePermission } from "@/context/PermissionContext";
import { useAuth } from "@/context/AuthContext";
import { getToken } from "@/utils/token";
import { Loader2, RotateCcw } from "lucide-react";
import { LoadingScreen, DashboardLoadingScreen } from "@/components/skeletons/LoadingScreen";
import { AdminDashboardSkeleton } from "@/components/skeletons/AdminDashboardSkeleton";

interface Props {
  children: JSX.Element;
  permission?: string;
}

export default function ProtectedRoute({ children, permission }: Props) {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { permissions, loading: permissionsLoading, can, error, refetch } = usePermission();

  const token = getToken();

  const isFromLogin =
    (location.state as any)?.fromLogin === true ||
    (() => {
      try {
        return sessionStorage.getItem("justLoggedIn") === "true";
      } catch {
        return false;
      }
    })();

  // Clear justLoggedIn flag after first dashboard render (so in-app navs are not treated as login)
  useEffect(() => {
    if (isFromLogin) {
      const timer = setTimeout(() => {
        try {
          sessionStorage.removeItem("justLoggedIn");
        } catch {}
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isFromLogin]);

  // No token at all -> redirect to login immediately (synchronous, no loading screen)
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // Token exists but AuthContext hasn't validated yet (e.g. after login redirect).
  // Let children render; the axios 401 interceptor will handle expired tokens.
  if (!isAuthenticated) {
    return children;
  }

  if (permission && error && !permissionsLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
        <p className="text-sm font-semibold text-slate-700">Failed to load permissions</p>
        <p className="max-w-sm text-center text-xs text-slate-400">{error}</p>
        <button
          onClick={() => refetch()}
          className="mt-1 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Retry
        </button>
      </div>
    );
  }

  if (permission && permissionsLoading) {
    if (location.pathname === "/dashboard") {
      return children;
    }
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-[#00488D]" />
      </div>
    );
  }

  if (permission && !can(permission)) {
    return <Navigate to="/403" replace />;
  }

  return children;
}
