import { useEffect, useState } from "react";
import api from "@/api/axios";

export function usePermissions() {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = async () => {
    try {
      const res = await api.get("/permissions/my-permissions");
      if (res.data.success) {
        setPermissions(res.data.data || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
    const interval = setInterval(fetchPermissions, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const can = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  const canAny = (permissionList: string[]): boolean => {
    return permissionList.some((p) => permissions.includes(p));
  };

  const canAll = (permissionList: string[]): boolean => {
    return permissionList.every((p) => permissions.includes(p));
  };

  return {
    permissions,
    loading,
    error,
    can,
    canAny,
    canAll,
    refetch: fetchPermissions,
  };
}