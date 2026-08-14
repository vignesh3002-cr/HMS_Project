import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import api from "@/api/axios";

interface PermissionContextType {
  permissions: string[];
  loading: boolean;
  error: string | null;
  can: (permission: string) => boolean;
  canAny: (permissionList: string[]) => boolean;
  canAll: (permissionList: string[]) => boolean;
  refetch: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | null>(null);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = async () => {
    try {
      const res = await api.get("/permissions/my-permissions");
      if (res.data.success) {
        setPermissions(res.data.data || []);
        setError(null);
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

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        loading,
        error,
        can,
        canAny,
        canAll,
        refetch: fetchPermissions,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermission() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error("usePermission must be used within a PermissionProvider");
  }
  return context;
}

export function useCan(permission: string): boolean {
  const { can, loading } = usePermission();
  return loading ? false : can(permission);
}

export function useCanAny(permissionList: string[]): boolean {
  const { canAny, loading } = usePermission();
  return loading ? false : canAny(permissionList);
}

export function useCanAll(permissionList: string[]): boolean {
  const { canAll, loading } = usePermission();
  return loading ? false : canAll(permissionList);
}