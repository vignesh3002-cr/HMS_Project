import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Bed as BedIcon, Search, Lock, LockOpen, Loader2, Pencil } from "lucide-react";
import { ipdApi, type BedRecord, type WardRecord } from "@/api/ipd.api";
import { branchApi, type Branch } from "@/api/branch.api";
import { useBranchFilter } from "@/context/BranchFilterContext";
import { usePermission } from "@/context/PermissionContext";
import { useToast } from "@/hooks/use-toast";
import { FormDropdown } from "@/components/ui/form-dropdown";
import { RefreshButton } from "@/components/hms/RefreshButton";
import HmsTable, { type HmsColumn } from "@/components/hms/HmsTable";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { AddWardDialog } from "@/components/hms/AddWardDialog";
import { AddBedDialog } from "@/components/hms/AddBedDialog";

const STATUS_FILTERS = [
  { label: "All Statuses", value: "" },
  { label: "Available", value: "AVAILABLE" },
  { label: "Booked", value: "OCCUPIED" },
  { label: "Under Maintenance", value: "MAINTENANCE" },
];

type ActionTarget = "AVAILABLE" | "MAINTENANCE";

// Bordered pill, scoped to this page -- deliberately not routed through the
// shared StatusBadge component, since its tone classes are reused by many
// other statuses app-wide (e.g. "active", "scheduled") and adding a border
// there would change those unrelated badges too.
function BedStatusBadge({ status }: { status: string }) {
  if (status === "AVAILABLE") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F0FDF4] text-[#15803D] border border-emerald-100">
        <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
        Available
      </span>
    );
  }
  if (status === "OCCUPIED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#EFF6FF] text-[#1D4ED8] border border-blue-100">
        <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
        Booked
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FFFBEB] text-[#B45309] border border-amber-100">
      <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
      Maintenance
    </span>
  );
}

export default function BedMaster() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedBranchId, isAllBranches } = useBranchFilter();
  const { can } = usePermission();
  // Ward and bed creation used to be separate routed pages (/ipd/wards/add,
  // /ipd/beds/add) guarded by their own permissions. Those pages are gone --
  // the inline AddWardDialog / AddBedDialog opened from this toolbar are now
  // the only creation entry points, so they carry the same permission gates
  // the routes used to enforce (ward.manage for wards, bed.manage for beds,
  // either of which admission.create also satisfies on the backend).
  const canManageWards = can("ward.manage") || can("admission.create");
  const canManageBeds = can("bed.manage") || can("admission.create");
  const canManage = canManageBeds;
  const [addWardOpen, setAddWardOpen] = useState(false);
  const [addBedOpen, setAddBedOpen] = useState(false);
  const [editWard, setEditWard] = useState<WardRecord | null>(null);
  const [editBed, setEditBed] = useState<BedRecord | null>(null);
  const [branchList, setBranchList] = useState<Branch[]>([]);

  // "Beds" (per-bed table) | "Wards" (per-ward occupancy overview).
  const [activeTab, setActiveTab] = useState<"beds" | "wards">("beds");
  const [wardSearch, setWardSearch] = useState("");
  const [wardSortField, setWardSortField] = useState("ward_name");
  const [wardSortDirection, setWardSortDirection] = useState<"asc" | "desc">("asc");
  const [wardPage, setWardPage] = useState(1);
  const [wardRowsPerPage, setWardRowsPerPage] = useState(10);

  const branchId = isAllBranches ? undefined : selectedBranchId;

  const [wards, setWards] = useState<WardRecord[]>([]);
  const [beds, setBeds] = useState<BedRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const [wardFilter, setWardFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const [sortField, setSortField] = useState("bed_number");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [actionBed, setActionBed] = useState<BedRecord | null>(null);
  const [actionTarget, setActionTarget] = useState<ActionTarget | null>(null);
  const [remarks, setRemarks] = useState("");
  const [submittingStatus, setSubmittingStatus] = useState(false);

  const fetchWards = () => {
    ipdApi
      .getWards(branchId)
      .then((res) => setWards(res.data?.data || []))
      .catch(() => setWards([]));
  };

  // Always fetches every bed in the branch (not just the currently-selected
  // ward) -- the Wards tab derives its per-ward occupancy counts from this
  // same array, so it would silently undercount every ward except the one
  // the Beds tab happens to be filtered to if this were ward-scoped. Ward
  // filtering for the Beds table itself happens client-side in
  // `filteredSorted` instead, alongside the existing status/search filters.
  const fetchBeds = () => {
    setLoading(true);
    ipdApi
      .getBeds(undefined, branchId)
      .then((res) => setBeds(res.data?.data || []))
      .catch(() => setBeds([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setWardFilter("");
  }, [branchId]);

  useEffect(fetchWards, [branchId]);
  useEffect(fetchBeds, [branchId]);

  useEffect(() => {
    branchApi
      .getAll()
      .then((res) => {
        if (res.data?.data) setBranchList(res.data.data);
        else if (Array.isArray(res.data)) setBranchList(res.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, search, wardFilter, branchId]);

  const filteredSorted = useMemo(() => {
    const rows = beds.filter((b) => {
      if (wardFilter && b.ward_id !== wardFilter) return false;
      if (statusFilter && b.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchesBed = b.bed_number?.toLowerCase().includes(q);
        const matchesWard = b.ward_master?.ward_name?.toLowerCase().includes(q);
        const matchesRemarks = b.remarks?.toLowerCase().includes(q);
        if (!matchesBed && !matchesWard && !matchesRemarks) return false;
      }
      return true;
    });

    return [...rows].sort((a, b) => {
      let av = "";
      let bv = "";
      if (sortField === "ward") {
        av = a.ward_master?.ward_name || "";
        bv = b.ward_master?.ward_name || "";
      } else if (sortField === "status") {
        av = a.status || "";
        bv = b.status || "";
      } else {
        av = a.bed_number || "";
        bv = b.bed_number || "";
      }
      const cmp = av.localeCompare(bv, undefined, { numeric: true });
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [beds, wardFilter, statusFilter, search, sortField, sortDirection]);

  const totalRecords = filteredSorted.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const visibleStart = totalRecords === 0 ? 0 : (safePage - 1) * rowsPerPage + 1;
  const visibleEnd = Math.min(safePage * rowsPerPage, totalRecords);
  const pageRows = filteredSorted.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const openAction = (bed: BedRecord, target: ActionTarget) => {
    setActionBed(bed);
    setActionTarget(target);
    setRemarks(bed.remarks || "");
  };

  const closeAction = () => {
    if (submittingStatus) return;
    setActionBed(null);
    setActionTarget(null);
    setRemarks("");
  };

  const confirmStatusChange = async () => {
    if (!actionBed || !actionTarget) return;
    try {
      setSubmittingStatus(true);
      const res = await ipdApi.updateBedStatus(actionBed.bed_id, {
        status: actionTarget,
        remarks: remarks.trim() || undefined,
      });
      if (res.data?.success) {
        toast({
          title: "Bed updated",
          description: `Bed ${actionBed.bed_number} marked as ${
            actionTarget === "AVAILABLE" ? "Available" : "Under Maintenance"
          }.`,
        });
        fetchBeds();
        setActionBed(null);
        setActionTarget(null);
        setRemarks("");
      }
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err?.response?.data?.message || err?.message || "Could not update bed status.",
        variant: "destructive",
      });
    } finally {
      setSubmittingStatus(false);
    }
  };

  // `beds` now always holds every bed in the branch (see fetchBeds), so these
  // header pills stay scoped to the current ward filter -- same as before --
  // by filtering on wardFilter alone here, independent of the status/search
  // filters that additionally narrow the table itself.
  const wardScopedBeds = useMemo(
    () => (wardFilter ? beds.filter((b) => b.ward_id === wardFilter) : beds),
    [beds, wardFilter],
  );

  const statusCounts = useMemo(
    () => ({
      available: wardScopedBeds.filter((b) => b.status === "AVAILABLE").length,
      occupied: wardScopedBeds.filter((b) => b.status === "OCCUPIED").length,
      maintenance: wardScopedBeds.filter((b) => b.status === "MAINTENANCE").length,
    }),
    [wardScopedBeds],
  );

  // Ward-level occupancy overview (the "Wards" tab) -- derived live from the
  // full, unfiltered bed list so it is always accurate regardless of the Beds
  // tab's ward/status/search filters, and never depends on ward_master's own
  // total_beds counter (which only tracks create/edit side effects).
  const wardStats = useMemo(() => {
    const counts = new Map<string, { available: number; occupied: number; maintenance: number }>();
    for (const b of beds) {
      if (!b.ward_id) continue;
      const entry = counts.get(b.ward_id) || { available: 0, occupied: 0, maintenance: 0 };
      if (b.status === "AVAILABLE") entry.available += 1;
      else if (b.status === "OCCUPIED") entry.occupied += 1;
      else if (b.status === "MAINTENANCE") entry.maintenance += 1;
      counts.set(b.ward_id, entry);
    }
    return wards.map((w) => {
      const c = counts.get(w.ward_id) || { available: 0, occupied: 0, maintenance: 0 };
      return { ward: w, ...c, total: c.available + c.occupied + c.maintenance };
    });
  }, [wards, beds]);

  const filteredSortedWards = useMemo(() => {
    const rows = wardStats.filter(({ ward }) => {
      if (!wardSearch) return true;
      const q = wardSearch.toLowerCase();
      return (
        ward.ward_name?.toLowerCase().includes(q) ||
        ward.ward_type?.toLowerCase().includes(q) ||
        ward.floor?.toLowerCase().includes(q)
      );
    });

    return [...rows].sort((a, b) => {
      let av = "";
      let bv = "";
      if (wardSortField === "ward_type") {
        av = a.ward.ward_type || "";
        bv = b.ward.ward_type || "";
      } else if (wardSortField === "floor") {
        av = a.ward.floor || "";
        bv = b.ward.floor || "";
      } else {
        av = a.ward.ward_name || "";
        bv = b.ward.ward_name || "";
      }
      const cmp = av.localeCompare(bv, undefined, { numeric: true });
      return wardSortDirection === "asc" ? cmp : -cmp;
    });
  }, [wardStats, wardSearch, wardSortField, wardSortDirection]);

  const wardTotalRecords = filteredSortedWards.length;
  const wardTotalPages = Math.max(1, Math.ceil(wardTotalRecords / wardRowsPerPage));
  const wardSafePage = Math.min(wardPage, wardTotalPages);
  const wardVisibleStart = wardTotalRecords === 0 ? 0 : (wardSafePage - 1) * wardRowsPerPage + 1;
  const wardVisibleEnd = Math.min(wardSafePage * wardRowsPerPage, wardTotalRecords);
  const wardPageRows = filteredSortedWards.slice(
    (wardSafePage - 1) * wardRowsPerPage,
    wardSafePage * wardRowsPerPage,
  );

  const handleWardSort = (field: string) => {
    if (wardSortField === field) {
      setWardSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setWardSortField(field);
      setWardSortDirection("asc");
    }
  };

  useEffect(() => {
    setWardPage(1);
  }, [wardSearch, activeTab]);

  const wardOptions = [
    { label: "All Wards", value: "" },
    ...wards.map((w) => ({ label: w.ward_name, value: w.ward_id })),
  ];

  const columns: HmsColumn<BedRecord>[] = [
    {
      key: "bed_number",
      label: "Bed",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <BedIcon className="w-3.5 h-3.5" />
          </span>
          <span className="font-semibold text-[#191C1E]">{row.bed_number}</span>
        </div>
      ),
    },
    {
      key: "ward",
      label: "Ward",
      render: (row) => <span className="text-[#374151]">{row.ward_master?.ward_name || "—"}</span>,
    },
    {
      key: "bed_type",
      label: "Type",
      sortable: false,
      render: (row) => <span className="text-[#6B7280]">{row.bed_type || "—"}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <BedStatusBadge status={row.status} />,
    },
    {
      key: "remarks",
      label: "Remarks",
      sortable: false,
      render: (row) => (
        <span className="text-[#6B7280] max-w-[220px] truncate block" title={row.remarks || undefined}>
          {row.remarks || "—"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      className: "text-right",
      headerClassName: "text-right",
      render: (row) => {
        if (!canManage) return <span className="text-[#9CA3AF] text-xs">—</span>;
        if (row.status === "OCCUPIED") {
          return <span className="text-[#9CA3AF] text-xs italic">In use</span>;
        }
        return (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => {
                setEditBed(row);
                setAddBedOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E7EB] bg-white text-[#374151] text-xs font-semibold hover:bg-[#F2F4F6] active:scale-[0.98] transition-all"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            {row.status === "MAINTENANCE" ? (
              <button
                onClick={() => openAction(row, "AVAILABLE")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D] text-xs font-semibold hover:bg-[#DCFCE7] active:scale-[0.98] transition-all"
              >
                <LockOpen className="w-3.5 h-3.5" /> Mark Available
              </button>
            ) : (
              <button
                onClick={() => openAction(row, "MAINTENANCE")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] text-[#B45309] text-xs font-semibold hover:bg-[#FEF3C7] active:scale-[0.98] transition-all"
              >
                <Lock className="w-3.5 h-3.5" /> Mark Maintenance
              </button>
            )}
          </div>
        );
      },
    },
  ];

  const wardColumns: HmsColumn<(typeof wardStats)[number]>[] = [
    {
      key: "ward_name",
      label: "Ward",
      render: (row) => (
        <div>
          <div className="font-semibold text-[#191C1E]">{row.ward.ward_name}</div>
          <div className="text-[11px] text-[#8C8D8F]">{row.ward.branch?.branch_name || "—"}</div>
        </div>
      ),
    },
    {
      key: "ward_type",
      label: "Type",
      render: (row) => <span className="text-[#6B7280]">{row.ward.ward_type || "—"}</span>,
    },
    {
      key: "floor",
      label: "Floor",
      render: (row) => <span className="text-[#6B7280]">{row.ward.floor || "—"}</span>,
    },
    {
      key: "tariff",
      label: "Tariff",
      sortable: false,
      render: (row) => (
        <span className="text-[#6B7280]">{row.ward.tariff != null ? `₹${row.ward.tariff}` : "—"}</span>
      ),
    },
    {
      key: "available",
      label: "Available",
      sortable: false,
      render: (row) => <span className="font-semibold text-[#15803D]">{row.available}</span>,
    },
    {
      key: "occupied",
      label: "Occupied",
      sortable: false,
      render: (row) => <span className="font-semibold text-[#1D4ED8]">{row.occupied}</span>,
    },
    {
      key: "maintenance",
      label: "Maintenance",
      sortable: false,
      render: (row) => <span className="font-semibold text-[#B45309]">{row.maintenance}</span>,
    },
    {
      key: "total",
      label: "Total Beds",
      sortable: false,
      render: (row) => <span className="font-semibold text-[#191C1E]">{row.total}</span>,
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      className: "text-right",
      headerClassName: "text-right",
      render: (row) =>
        canManageWards ? (
          <button
            onClick={() => {
              setEditWard(row.ward);
              setAddWardOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E7EB] bg-white text-[#374151] text-xs font-semibold hover:bg-[#F2F4F6] active:scale-[0.98] transition-all"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
        ) : (
          <span className="text-[#9CA3AF] text-xs">—</span>
        ),
    },
  ];

  return (
    <div className="flex w-full font-[Manrope,sans-serif] bg-[#F7F9FB] min-h-screen">
      <div className="flex flex-col flex-1 min-w-0 p-6 gap-6">
        {/* ==================== HEADER ==================== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#E5E7EB] bg-white hover:bg-[#F2F4F6] transition-colors text-[#374151] shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="hms-heading">Bed Master</h1>
              <p className="hms-subheading mt-1">
                Track bed availability across wards and put beds under maintenance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 bg-[#F0FDF4] text-[#15803D] px-3 py-1.5 rounded-full text-xs font-semibold border border-emerald-100/70 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" /> {statusCounts.available} Available
            </span>
            <span className="inline-flex items-center gap-1.5 bg-[#EFF6FF] text-[#1D4ED8] px-3 py-1.5 rounded-full text-xs font-semibold border border-blue-100/70 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" /> {statusCounts.occupied} Booked
            </span>
            <span className="inline-flex items-center gap-1.5 bg-[#FFFBEB] text-[#B45309] px-3 py-1.5 rounded-full text-xs font-semibold border border-amber-100/70 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" /> {statusCounts.maintenance} Maintenance
            </span>
          </div>
        </div>

        {/* ==================== TAB BAR ==================== */}
        <div className="inline-flex items-center gap-1 bg-[#E9EEF5] rounded-lg p-1 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("beds")}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeTab === "beds" ? "bg-white text-[#00488D] shadow-sm" : "text-[#5B6570] hover:text-[#00488D]"}`}
          >
            Beds
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("wards")}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeTab === "wards" ? "bg-white text-[#00488D] shadow-sm" : "text-[#5B6570] hover:text-[#00488D]"}`}
          >
            Wards
          </button>
        </div>

        {/* ==================== MAIN CARD ==================== */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col overflow-hidden transition-all duration-300 hover:shadow-md">
          {/* ==================== TOOLBAR ==================== */}
          <div className="px-5 py-4 border-b border-[#E5E7EB] flex flex-nowrap items-center justify-between gap-4 overflow-x-auto hide-scrollbar">
            <div className="flex items-center gap-3 shrink-0">
              <span className="bg-[#E6F0FF] text-[#00488D] px-2.5 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap">
                {activeTab === "beds" ? `Total Beds : ${totalRecords}` : `Total Wards : ${wardTotalRecords}`}
              </span>
            </div>

            {activeTab === "beds" ? (
              <div className="flex items-center gap-3 flex-nowrap shrink-0">
                <div className="relative shrink-0">
                  <input
                    type="text"
                    placeholder="Search bed, ward or remarks..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-[#F2F4F6] text-xs text-[#374151] placeholder:text-[#6B7280] outline-none w-[170px] rounded-md transition-all duration-200 focus:rounded-none focus:w-[220px] focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                </div>

                <FormDropdown
                  className="h-[34px] px-3 bg-white border border-[#E5E7EB] rounded-lg text-xs text-[#374151] w-[150px] shrink-0"
                  options={wardOptions}
                  value={wardFilter}
                  onValueChange={setWardFilter}
                  placeholder="All Wards"
                />

                <FormDropdown
                  className="h-[34px] px-3 bg-white border border-[#E5E7EB] rounded-lg text-xs text-[#374151] w-[170px] shrink-0"
                  options={STATUS_FILTERS}
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                  placeholder="All Statuses"
                />

                {canManageWards && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditWard(null);
                      setAddWardOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all duration-200 shadow-[0_2px_8px_rgba(37,99,235,0.2)] shrink-0 whitespace-nowrap"
                  >
                    <Plus className="w-3 h-3" /> Add Ward
                  </button>
                )}
                {canManageBeds && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditBed(null);
                      setAddBedOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all duration-200 shadow-[0_2px_8px_rgba(37,99,235,0.2)] shrink-0 whitespace-nowrap"
                  >
                    <Plus className="w-3 h-3" /> Add Bed
                  </button>
                )}
                <RefreshButton
                  onClick={() => {
                    fetchBeds();
                    fetchWards();
                  }}
                  isLoading={loading}
                  className="shrink-0"
                />
              </div>
            ) : (
              <div className="flex items-center gap-3 flex-nowrap shrink-0">
                <div className="relative shrink-0">
                  <input
                    type="text"
                    placeholder="Search ward, type or floor..."
                    value={wardSearch}
                    onChange={(e) => setWardSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-[#F2F4F6] text-xs text-[#374151] placeholder:text-[#6B7280] outline-none w-[170px] rounded-md transition-all duration-200 focus:rounded-none focus:w-[220px] focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                </div>

                {canManageWards && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditWard(null);
                      setAddWardOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all duration-200 shadow-[0_2px_8px_rgba(37,99,235,0.2)] shrink-0 whitespace-nowrap"
                  >
                    <Plus className="w-3 h-3" /> Add Ward
                  </button>
                )}
                <RefreshButton
                  onClick={() => {
                    fetchWards();
                    fetchBeds();
                  }}
                  isLoading={loading}
                  className="shrink-0"
                />
              </div>
            )}
          </div>

          {/* ==================== BODY ==================== */}
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-[#6B7280] text-sm">
              <Loader2 size={24} className="animate-spin text-[#00488D]" />
              {activeTab === "beds" ? "Loading beds..." : "Loading wards..."}
            </div>
          ) : activeTab === "beds" ? (
            <HmsTable
              columns={columns}
              data={pageRows}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              currentPage={safePage}
              totalPages={totalPages}
              totalRecords={totalRecords}
              rowsPerPage={rowsPerPage}
              visibleStart={visibleStart}
              visibleEnd={visibleEnd}
              onPageChange={setCurrentPage}
              onRowsPerPageChange={(v) => {
                setRowsPerPage(v);
                setCurrentPage(1);
              }}
              rowKey={(row) => row.bed_id}
              emptyMessage="No beds found for this filter. Try resetting the ward/status filter or clearing your search."
              minWidth="760px"
            />
          ) : (
            <HmsTable
              columns={wardColumns}
              data={wardPageRows}
              sortField={wardSortField}
              sortDirection={wardSortDirection}
              onSort={handleWardSort}
              currentPage={wardSafePage}
              totalPages={wardTotalPages}
              totalRecords={wardTotalRecords}
              rowsPerPage={wardRowsPerPage}
              visibleStart={wardVisibleStart}
              visibleEnd={wardVisibleEnd}
              onPageChange={setWardPage}
              onRowsPerPageChange={(v) => {
                setWardRowsPerPage(v);
                setWardPage(1);
              }}
              rowKey={(row) => row.ward.ward_id}
              emptyMessage="No wards found. Try clearing your search or add a new ward."
              minWidth="760px"
            />
          )}
        </div>
      </div>

      <ConfirmationDialog
        open={!!actionBed}
        title={actionTarget === "MAINTENANCE" ? "Mark Bed Under Maintenance" : "Mark Bed Available"}
        description={
          actionTarget === "MAINTENANCE"
            ? `Bed ${actionBed?.bed_number} will be taken out of service and won't be selectable for new admissions until it's marked available again.`
            : `Bed ${actionBed?.bed_number} will be marked available and selectable for new admissions.`
        }
        type={actionTarget === "MAINTENANCE" ? "lock" : "LockOpen"}
        confirmText={actionTarget === "MAINTENANCE" ? "Mark Maintenance" : "Mark Available"}
        loading={submittingStatus}
        onConfirm={confirmStatusChange}
        onCancel={closeAction}
      >
        {actionTarget === "MAINTENANCE" && (
          <div className="w-full text-left">
            <label className="block text-[12.5px] font-semibold text-gray-700 mb-1.5">
              Reason <span className="text-gray-400 text-[11px] font-normal ml-1">(optional)</span>
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Deep cleaning, equipment repair..."
              rows={3}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-[13.5px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-[3px] focus:ring-blue-500/15 focus:border-blue-500 transition-all duration-200"
            />
          </div>
        )}
      </ConfirmationDialog>

        <AddWardDialog
          open={addWardOpen}
          onOpenChange={(v) => {
            setAddWardOpen(v);
            if (!v) setEditWard(null);
          }}
          branches={branchList}
          defaultBranchId={branchId || ""}
          ward={editWard}
          onCreated={() => {
            setAddWardOpen(false);
            setEditWard(null);
            fetchWards();
            fetchBeds();
          }}
        />
        <AddBedDialog
          open={addBedOpen}
          onOpenChange={(v) => {
            setAddBedOpen(v);
            if (!v) setEditBed(null);
          }}
          branches={branchList}
          defaultBranchId={branchId || ""}
          defaultWardId={wardFilter || undefined}
          bed={editBed}
          onCreated={() => {
            setAddBedOpen(false);
            setEditBed(null);
            fetchBeds();
          }}
        />
      </div>
    );
  }
