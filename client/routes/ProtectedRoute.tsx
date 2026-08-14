import { Navigate } from "react-router-dom";
import { getToken, remove } from "../utils/token";
import { useEffect, useState } from "react";
import api from "../api/axios";
import { usePermission } from "@/context/PermissionContext";
import { Loader2, RotateCcw } from "lucide-react";

interface Props {
  children: JSX.Element;
  permission?: string;
}

export default function ProtectedRoute({ children, permission }: Props) {
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const { permissions, loading: permissionsLoading, can, error, refetch } = usePermission();

  useEffect(() => {
    const checkToken = async () => {
      const token = getToken();

      if (!token) {
        setValid(false);
        setLoading(false);
        return;
      }

      try {
        await api.get("/auth/me");
        setValid(true);
      } catch (error) {
        remove();
        setValid(false);
      }

      setLoading(false);
    };

    checkToken();
  }, []);

  if (loading) {
    return null;
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
    return null;
  }

  if (permission && !can(permission)) {
    return <Navigate to="/403" replace />;
  }

  return children;
}
