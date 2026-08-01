import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { branchApi } from "@/api/branch.api";
import { getUser } from "@/utils/token";
import { setActiveBranchId } from "@/api/axios";

export const ALL_BRANCHES_VALUE = "__ALL_BRANCHES__";

export const HEAD_ADMIN_ROLE = "HEAD_ADMIN";
export const BRANCH_ADMIN_ROLE = "BRANCH_ADMIN";

const STORAGE_KEY = "hms_selected_branch_id";

export interface BranchFilterBranch {
  id: string;
  name: string;
  area: string;
  hospital_name: string;
}

interface BranchFilterContextValue {
  branches: BranchFilterBranch[];
  loading: boolean;
  error: string | null;
  selectedBranchId: string;
  selectedBranch: BranchFilterBranch | null;
  isAllBranches: boolean;
  userRole: string;
  isBranchAdmin: boolean;
  isHeadAdmin: boolean;
  selectBranch: (branchId: string) => void;
  refreshBranches: () => void;
  removeBranch: (branchId: string) => void;
}

const BranchFilterContext = createContext<BranchFilterContextValue | undefined>(undefined);

function readUserRole(): string {
  const user = getUser();
  return user?.role_type || user?.role || "";
}

function readAssignedBranchId(): string {
  const user = getUser();
  return user?.branch_id || "";
}

export function BranchFilterProvider({ children }: { children: ReactNode }) {
  const [branches, setBranches] = useState<BranchFilterBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchIdState] = useState<string>(() => {
    const role = readUserRole();
    if (role === BRANCH_ADMIN_ROLE) {
      const assigned = readAssignedBranchId();
      if (assigned) return assigned;
    }
    return localStorage.getItem(STORAGE_KEY) || ALL_BRANCHES_VALUE;
  });

  const userRole = readUserRole();
  const isBranchAdmin = userRole === BRANCH_ADMIN_ROLE;
  const isHeadAdmin = userRole === HEAD_ADMIN_ROLE;

  const syncBranchHeader = useCallback((branchId: string) => {
    if (branchId === ALL_BRANCHES_VALUE) {
      setActiveBranchId(null);
    } else {
      setActiveBranchId(branchId);
    }
  }, []);

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await branchApi.getAll();

      let branchList: any[] = [];
      if (response.data?.data) branchList = response.data.data as any[];
      else if (Array.isArray(response.data)) branchList = response.data as any[];
      else branchList = (response.data as any)?.branches || [];

      const mapped: BranchFilterBranch[] = branchList.map((item: any) => ({
        id: item.id || item.branch_id,
        name: item.name || item.branch_name || "Unnamed Branch",
        area: item.area || item.branch_area || "N/A",
        hospital_name: item.hospital_name || item.hospital?.name || "Dummy Hospital",
      }));

      const role = readUserRole();

      if (role === BRANCH_ADMIN_ROLE) {
        const assignedId = readAssignedBranchId();
        const assignedBranch = mapped.filter((b) => b.id === assignedId);
        setBranches(assignedBranch.length > 0 ? assignedBranch : mapped);
        setSelectedBranchIdState((prev) => {
          const target = assignedId || prev;
          syncBranchHeader(target);
          return target;
        });
      } else {
        setBranches(mapped);
        setSelectedBranchIdState((prev) => {
          if (prev !== ALL_BRANCHES_VALUE && mapped.some((b) => b.id === prev)) {
            syncBranchHeader(prev);
            return prev;
          }
          const user = getUser();
          if (!isHeadAdmin && user?.branch_id && mapped.some((b) => b.id === user.branch_id)) {
            syncBranchHeader(user.branch_id);
            return user.branch_id;
          }
          syncBranchHeader(ALL_BRANCHES_VALUE);
          return ALL_BRANCHES_VALUE;
        });
      }
    } catch (err: any) {
      console.error("Failed to fetch branches:", err);
      setError(err.message || "Failed to load branches");
    } finally {
      setLoading(false);
    }
  }, [syncBranchHeader]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    syncBranchHeader(selectedBranchId);
  }, [selectedBranchId, syncBranchHeader]);

  const selectBranch = useCallback(
    (branchId: string) => {
      if (isBranchAdmin) return;
      setSelectedBranchIdState(branchId);
      localStorage.setItem(STORAGE_KEY, branchId);
      syncBranchHeader(branchId);
    },
    [isBranchAdmin, syncBranchHeader],
  );

  const removeBranch = useCallback(
    (branchId: string) => {
      if (isBranchAdmin) return;
      setBranches((prev) => prev.filter((b) => b.id !== branchId));
      setSelectedBranchIdState((prev) => {
        const next = prev === branchId ? ALL_BRANCHES_VALUE : prev;
        syncBranchHeader(next);
        return next;
      });
    },
    [isBranchAdmin, syncBranchHeader],
  );

  const isAllBranches = selectedBranchId === ALL_BRANCHES_VALUE;
  const selectedBranch = isAllBranches
    ? null
    : branches.find((b) => b.id === selectedBranchId) ?? null;

  const value = useMemo<BranchFilterContextValue>(
    () => ({
      branches,
      loading,
      error,
      selectedBranchId,
      selectedBranch,
      isAllBranches,
      userRole,
      isBranchAdmin,
      isHeadAdmin,
      selectBranch,
      refreshBranches: fetchBranches,
      removeBranch,
    }),
    [
      branches, loading, error, selectedBranchId, selectedBranch,
      isAllBranches, userRole, isBranchAdmin, isHeadAdmin,
      selectBranch, fetchBranches, removeBranch,
    ],
  );

  return (
    <BranchFilterContext.Provider value={value}>
      {children}
    </BranchFilterContext.Provider>
  );
}

export function useBranchFilter(): BranchFilterContextValue {
  const ctx = useContext(BranchFilterContext);
  if (!ctx) {
    throw new Error("useBranchFilter must be used within a BranchFilterProvider");
  }
  return ctx;
}
