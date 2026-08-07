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
// Distinct from ALL_BRANCHES_VALUE - a restricted role (Branch Admin/Staff
// Admin) with no valid active branch assignment lands here, never in "all
// branches" mode. Consumers checking isAllBranches must not treat this as
// unrestricted access.
export const NO_BRANCH_VALUE = "__NO_BRANCH__";

export const HEAD_ADMIN_ROLE = "HEAD_ADMIN";
export const BRANCH_ADMIN_ROLE = "BRANCH_ADMIN";
export const STAFF_ADMIN_ROLE = "ADMIN";

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
  isStaffAdmin: boolean;
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
    // A restricted role with no assignment yet must never fall through to
    // localStorage/ALL_BRANCHES_VALUE - that key can hold a stale value
    // left over from a previous, differently-scoped user on this browser.
    if (role === BRANCH_ADMIN_ROLE || role === STAFF_ADMIN_ROLE) {
      const assigned = readAssignedBranchId();
      return assigned || NO_BRANCH_VALUE;
    }
    return localStorage.getItem(STORAGE_KEY) || ALL_BRANCHES_VALUE;
  });

  const userRole = readUserRole();
  const isBranchAdmin = userRole === BRANCH_ADMIN_ROLE;
  const isStaffAdmin = userRole === STAFF_ADMIN_ROLE;
  const isHeadAdmin = userRole === HEAD_ADMIN_ROLE;

  const syncBranchHeader = useCallback((branchId: string) => {
    // Neither "all branches" nor "no valid assignment" is a real branch id -
    // send no x-branch-id header for either, so the backend's branchScope
    // resolves access purely from the authenticated user's own mappings
    // (and correctly 403s a no-assignment user) rather than being handed a
    // literal sentinel string as if it were a branch to look up.
    if (branchId === ALL_BRANCHES_VALUE || branchId === NO_BRANCH_VALUE) {
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

      if (role === BRANCH_ADMIN_ROLE || role === STAFF_ADMIN_ROLE) {
        // Never fall back to the full branch list here - a restricted role
        // with no match (missing/stale assignment) must see zero branches,
        // not every branch. Falling back to `mapped` was the actual "sees
        // all branches" security-adjacent bug.
        const assignedId = readAssignedBranchId();
        const assignedBranch = mapped.filter((b) => b.id === assignedId);
        setBranches(assignedBranch);
        const target = assignedId || NO_BRANCH_VALUE;
        setSelectedBranchIdState(target);
        syncBranchHeader(target);
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
      if (isBranchAdmin || isStaffAdmin) return;
      setSelectedBranchIdState(branchId);
      localStorage.setItem(STORAGE_KEY, branchId);
      syncBranchHeader(branchId);
    },
    [isBranchAdmin, isStaffAdmin, syncBranchHeader],
  );

  const removeBranch = useCallback(
    (branchId: string) => {
      if (isBranchAdmin || isStaffAdmin) return;
      setBranches((prev) => prev.filter((b) => b.id !== branchId));
      setSelectedBranchIdState((prev) => {
        const next = prev === branchId ? ALL_BRANCHES_VALUE : prev;
        syncBranchHeader(next);
        return next;
      });
    },
    [isBranchAdmin, isStaffAdmin, syncBranchHeader],
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
      isStaffAdmin,
      isHeadAdmin,
      selectBranch,
      refreshBranches: fetchBranches,
      removeBranch,
    }),
    [
      branches, loading, error, selectedBranchId, selectedBranch,
      isAllBranches, userRole, isBranchAdmin, isStaffAdmin, isHeadAdmin,
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
