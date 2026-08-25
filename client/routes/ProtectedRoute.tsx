import { Navigate, useLocation } from "react-router-dom";
import { getToken, remove } from "../utils/token";
import { useEffect, useState } from "react";
import api from "../api/axios";
import { usePermission } from "@/context/PermissionContext";
import { Loader2, RotateCcw } from "lucide-react";
import { LoadingScreen, DashboardLoadingScreen } from "@/components/skeletons/LoadingScreen";
import { AdminDashboardSkeleton } from "@/components/skeletons/AdminDashboardSkeleton";

interface Props {
  children: JSX.Element;
  permission?: string;
}

let cachedAuth: { valid: boolean; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export default function ProtectedRoute({ children, permission }: Props) {
  const location = useLocation();
  const isFromLogin = (location.state as any)?.fromLogin === true || (() => { try { return sessionStorage.getItem("justLoggedIn") === "true"; } catch { return false; } })();

  const [loading, setLoading] = useState(() => {
    if (cachedAuth && Date.now() - cachedAuth.timestamp < CACHE_TTL) return false;
    return true;
  });
  const [valid, setValid] = useState(() => {
    if (cachedAuth && Date.now() - cachedAuth.timestamp < CACHE_TTL) return cachedAuth.valid;
    return false;
  });
  const { permissions, loading: permissionsLoading, can, error, refetch } = usePermission();

  useEffect(() => {
    // Clear justLoggedIn flag after first dashboard render (so in-app navs are not treated as login)
    if (isFromLogin) {
      const timer = setTimeout(() => {
        try { sessionStorage.removeItem("justLoggedIn"); } catch {}
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isFromLogin]);

  useEffect(() => {
    // If we have fresh cache, revalidate in background without blocking UI
    if (cachedAuth && Date.now() - cachedAuth.timestamp < CACHE_TTL) {
      const token = getToken();
      if (!token) {
        cachedAuth = { valid: false, timestamp: Date.now() };
        setValid(false);
        return;
      }
      // Background revalidation — only clear the token on actual 401,
      // not on transient failures (Render cold-start, network blips).
      api.get("/auth/me").then(() => {
        cachedAuth = { valid: true, timestamp: Date.now() };
        setValid(true);
      }).catch((err) => {
        if (err?.response?.status === 401) {
          remove();
          cachedAuth = { valid: false, timestamp: Date.now() };
          setValid(false);
        }
        // For non-401 errors (timeout, network, 5xx) keep the cached
        // auth so the user stays on the page — the next real API call
        // will surface the actual problem via the axios 401 interceptor.
      });
      return;
    }

    const checkToken = async () => {
      const token = getToken();
      if (!token) {
        cachedAuth = { valid: false, timestamp: Date.now() };
        setValid(false);
        setLoading(false);
        return;
      }
      try {
        await api.get("/auth/me");
        cachedAuth = { valid: true, timestamp: Date.now() };
        setValid(true);
      } catch (error) {
        if (error?.response?.status === 401) {
          remove();
          cachedAuth = { valid: false, timestamp: Date.now() };
          setValid(false);
        } else {
          // Transient failure (cold-start, timeout, network) — keep
          // the session alive so the user can interact with the app.
          cachedAuth = { valid: true, timestamp: Date.now() };
          setValid(true);
        }
      }
      setLoading(false);
    };
    checkToken();
  }, []);

  if (loading) {
    // Login redirect -> full loading screen with skeleton (as requested)
    if (isFromLogin || location.pathname === "/dashboard") {
      // For dashboard, show the full admin loading screen on first login
      // For in-app navigations that are not from login, cachedAuth would have prevented loading=true, so this only runs on cold load
      return <DashboardLoadingScreen />;
    }
    // For other protected pages, show inline skeleton inside layout context
    // If the route is inside AppLayout, this will appear as a small spinner within the layout, not a blank page
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-[#00488D]" />
      </div>
    );
  }

  if (!valid) {
    return <Navigate to="/" replace />;
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
          <RotateCcw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    );
  }

  if (permission && permissionsLoading) {
    // For dashboard, let the dashboard itself show its skeleton (keeps layout mounted)
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
