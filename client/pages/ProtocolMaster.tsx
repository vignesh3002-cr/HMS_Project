import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import {
  Plus,
  Search,
  Loader2,
  ChevronDown,
  MoreVertical,
  TrendingUp,
  FileText,
  CheckCircle2,
  Eye,
  Archive,
  RotateCcw,
  Trash2,
  Clock,
  CalendarDays,
  X,
  Filter,
} from "lucide-react";
import { format, differenceInDays, addYears } from "date-fns";
import { formatInBranchTimezone, getTodayInActiveTimezone } from "@/utils/timezone";
import HmsTable from "@/components/hms/HmsTable";
import { RefreshButton } from "@/components/hms/RefreshButton";
import { StatusBadge } from "@/components/hms/StatusBadge";
import ExportReport from "@/components/ui/ExportReport";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { useToast } from "@/hooks/use-toast";
import { usePermission } from "@/context/PermissionContext";
import { useNavigate, useLocation } from "react-router-dom";
import { downloadExportPdf } from "@/lib/exportPdf";
import { ToolbarFilter } from "@/components/ui/toolbar-filter";
import { useFilterPanel, useProtocolFilters } from "@/components/Filter";
import { filterDataByValues } from "@/components/Filter/utils";
import ProtocolPerformance from "@/components/hms/protocolPerformance";
import { KpiSection } from "@/components/hms/dashboard/KpiSection";
import type { KpiItem } from "@/components/hms/dashboard/kpi.types";
import {
  chemotherapyApi,
  type RegimenProtocol,
} from "@/api/chemotherapy.api";

type ProtocolStatus = "Active" | "Archive" | "Under Review" | "Draft";

interface ProtocolRow {
  protocol_id: string;
  name: string;
  cycle_days: number;
  status: ProtocolStatus;
  updated_by: string;
  updated_at: string;
  cancer_type: string;
  version: string;
  intent: string;
  review_date?: string | null;
  used_this_month?: number | null;
  patient_count?: number | null;
}




function toRow(p: RegimenProtocol): ProtocolRow {
  const multiCancers = (p.chemotherapy_protocol_cancers ?? [])
    .map((c) => c.cancer_types?.cancer_type)
    .filter(Boolean);
  const cancerTypeDisplay = multiCancers.length > 0
    ? Array.from(new Set(multiCancers)).join(", ")
    : (p.cancer_types?.cancer_type ?? "—");

  let status: ProtocolStatus = p.active_status === 1 ? "Active" : "Archive";
  if ((p as any).status === "Draft" || (p as any).is_draft) {
    status = "Draft";
  } else if ((p as any).status === "Under Review") {
    status = "Under Review";
  } else if ((p as any).status === "Archive" || (p as any).status === "Archived" || p.active_status === 0) {
    status = "Archive";
  } else if ((p as any).status === "Active" || p.active_status === 1) {
    status = "Active";
  }

  const updatedByRaw = (p as any).updated_by || (p as any).created_by;
  const updatedByDisplay = updatedByRaw && updatedByRaw !== "—" ? updatedByRaw : "—";

  const updatedDate = p.updated_at ?? p.created_at ?? new Date().toISOString();
  // Clinical Governance: only protocols with an explicit review date set in DB
  const rawReviewDate = (p as any).review_date ?? (p as any).next_review_date ?? null;
  const calculatedReviewDate = rawReviewDate && !isNaN(new Date(rawReviewDate).getTime())
    ? new Date(rawReviewDate).toISOString()
    : null;

  return {
    protocol_id: p.protocol_id,
    name: p.regimen_name,
    cycle_days: p.no_of_days,
    status,
    updated_by: updatedByDisplay,
    updated_at: updatedDate,
    cancer_type: cancerTypeDisplay,
    version: p.protocol_version ?? "v1",
    intent: p.treatment_intent ?? "—",
    review_date: calculatedReviewDate,
    used_this_month: typeof (p as any).used_this_month === "number" ? (p as any).used_this_month : null,
    patient_count: typeof (p as any).patient_count === "number" ? (p as any).patient_count : ((p as any).used_this_month ?? 0),
  };
}

const STATUS_OPTIONS: Array<"All" | ProtocolStatus> = [
  "All",
  "Active",
  "Archive",
  "Under Review",
  "Draft",
];

function ProtocolActionMenu({
  row,
  onView,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
}: {
  row: ProtocolRow;
  onView: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const { can } = usePermission();

  const canView = can("chemo.protocol.read") || can("chemo.protocol.manage");
  const canEdit = can("chemo.protocol.manage");
  const canDelete = can("chemo.protocol.manage");

  const placeMenu = () => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    // Anchor the dropdown to the button's bottom-right corner.
    setCoords({ top: rect.bottom + 4, left: rect.right - 176 });
  };

  useEffect(() => {
    if (!open) return;
    placeMenu();
    const handleOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleScroll = () => setOpen(false);
    const handleResize = () => setOpen(false);
    document.addEventListener("mousedown", handleOutside);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [open]);

  if (!canView && !canEdit && !canDelete) return null;

  const items: Array<{ label: string; onClick: () => void; danger?: boolean }> = [];
  if (canView) items.push({ label: "View Protocol", onClick: onView });
  if (canEdit) items.push({ label: "Edit Protocol", onClick: onEdit });
  if (canEdit && row.status !== "Archive") items.push({ label: "Archive Protocol", onClick: onArchive });
  if (canEdit && row.status === "Archive") items.push({ label: "Restore Protocol", onClick: onRestore });
  if (canDelete) items.push({ label: "Delete Protocol", onClick: onDelete, danger: true });

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-center p-1.5 border border-[#E5E7EB] rounded-md hover:border-[#00488D] transition-colors"
      >
        <MoreVertical className="w-4 h-4 text-[#6B7280]" />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", top: coords.top, left: coords.left, zIndex: 9999 }}
            className="w-44 bg-white border border-[#E5E7EB] rounded-md shadow-lg overflow-hidden"
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className={`flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-left transition-colors ${
                  item.danger
                    ? "text-red-600 hover:bg-red-50"
                    : "text-[#374151] hover:bg-[#F2F4F6]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}

export default function ProtocolMaster() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { can } = usePermission();

  const queryClient = useQueryClient();

  const {
    data: protocolRows = [],
    isLoading: loading,
    refetch: fetchProtocols,
  } = useQuery<ProtocolRow[]>({
    queryKey: ["protocol-master-list"],
    queryFn: async () => {
      const res = await chemotherapyApi.listRegimenProtocols({ include_inactive: true });
      const list = res.data?.data ?? [];
      return list.map(toRow);
    },
    staleTime: 10 * 60 * 1000, // 10 minutes cache
  });

  const [rowOverride, setRowOverride] = useState<ProtocolRow[] | null>(null);
  const rows = rowOverride ?? protocolRows;
  const setRows = (updater: React.SetStateAction<ProtocolRow[]>) => {
    setRowOverride((prev) => (typeof updater === "function" ? updater(prev ?? protocolRows) : updater));
  };

  // Dynamic in-memory update when returning from create/edit protocol without network egress
  useEffect(() => {
    const saved = (location.state as any)?.savedProtocol;
    if (saved) {
      const newRow = toRow(saved);
      setRows((prev) => {
        const exists = prev.some((p) => p.protocol_id === newRow.protocol_id);
        if (exists) {
          return prev.map((p) => (p.protocol_id === newRow.protocol_id ? { ...p, ...newRow } : p));
        }
        return [newRow, ...prev];
      });
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const [search, setSearch] = useState("");
  const { protocolFilterFields } = useProtocolFilters({ protocolRows: rows });
  const {
    values: filterValues,
    appliedValues,
    isOpen: isFilterOpen,
    setIsOpen: setIsFilterOpen,
    handleChange: handleFilterChange,
    handleApply: handleApplyFilter,
    handleClear: handleClearFilter,
    setAppliedFilter,
    removeAppliedFilter,
  } = useFilterPanel(protocolFilterFields);

  // Auto-apply traditional filter when navigating with ?protocol=<id>
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const protocolParam = params.get("protocol") || (location.state as any)?.filterProtocol;
    if (protocolParam) {
      setAppliedFilter("protocol", [protocolParam]);
      setCurrentPage(1);
    }
  }, [location.search, location.state]);

  const [sortField, setSortField] = useState("updated_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const bulkRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bulkRef.current && !bulkRef.current.contains(e.target as Node)) {
        setBulkOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.status === "Active").length;
    const archived = rows.filter((r) => r.status === "Archive").length;
    const underReview = rows.filter((r) => r.status === "Under Review").length;
    const draft = rows.filter((r) => r.status === "Draft").length;
    return { total: rows.length, active, archived, underReview, draft };
  }, [rows]);

  const usedThisMonth = useMemo(() => {
    let count = 0;
    let hasUsageData = false;
    for (const r of rows) {
      if (typeof r.used_this_month === "number") {
        hasUsageData = true;
        count += r.used_this_month;
      }
    }
    return { count, hasUsageData };
  }, [rows]);

  const dueForReview = useMemo(() => {
    const now = new Date();
    let count = 0;
    let hasReviewData = false;
    let overdueCount = 0;
    for (const r of rows) {
      if (r.review_date) {
        hasReviewData = true;
        const targetDate = new Date(r.review_date);
        if (!isNaN(targetDate.getTime()) && targetDate <= now) {
          count++;
          overdueCount++;
        }
      }
    }
    return { count, hasReviewData, overdueCount };
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    // Status filter: by default hide Archive unless "Archive" is explicitly selected in the status filter.
    if (!appliedValues.status || appliedValues.status.length === 0) {
      list = list.filter((r) => r.status !== "Archive");
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.protocol_id.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.cancer_type.toLowerCase().includes(q) ||
          r.intent.toLowerCase().includes(q) ||
          r.updated_by.toLowerCase().includes(q)
      );
    }
    list = filterDataByValues(list, appliedValues, protocolFilterFields);
    return list;
  }, [rows, search, appliedValues, protocolFilterFields]);

  const sortedData = useMemo(() => {
    const list = [...filtered];
    const dir = sortDirection === "asc" ? 1 : -1;
    list.sort((a, b) => {
      switch (sortField) {
        case "protocol_id":
          return a.protocol_id.localeCompare(b.protocol_id) * dir;
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "cycle_days":
          return (a.cycle_days - b.cycle_days) * dir;
        case "status":
          return a.status.localeCompare(b.status) * dir;
        case "updated_at":
          return (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()) * dir;
        default:
          return 0;
      }
    });
    return list;
  }, [filtered, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const totalRecords = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const currentRows = sortedData.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);
  const visibleStart = totalRecords === 0 ? 0 : (safePage - 1) * rowsPerPage + 1;
  const visibleEnd = Math.min(safePage * rowsPerPage, totalRecords);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = currentRows.length > 0 && currentRows.every((r) => selectedIds.has(r.protocol_id));

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) currentRows.forEach((r) => next.delete(r.protocol_id));
      else currentRows.forEach((r) => next.add(r.protocol_id));
      return next;
    });
  };

  const selectedRows = useMemo(
    () => sortedData.filter((r) => selectedIds.has(r.protocol_id)),
    [sortedData, selectedIds]
  );

  const handleBulkArchive = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const idsSet = new Set(ids);
    setRows((prev) => prev.map((p) => (idsSet.has(p.protocol_id) ? { ...p, status: "Archive" } : p)));
    try {
      await Promise.allSettled(ids.map((id) => chemotherapyApi.archiveRegimenProtocol(id)));
      queryClient.invalidateQueries({ queryKey: ["protocol-master-list"] });
      setSelectedIds(new Set());
      setBulkOpen(false);
      toast({
        title: "Protocols archived",
        description: `${ids.length} protocol${ids.length === 1 ? "" : "s"} moved to archive.`,
      });
    } catch (e: any) {
      toast({
        title: "Archiving failed",
        description: e.response?.data?.message ?? e.message,
        variant: "destructive",
      });
    }
  };

  const handleArchiveSingle = async (row: ProtocolRow) => {
    setRows((prev) => prev.map((p) => (p.protocol_id === row.protocol_id ? { ...p, status: "Archive" } : p)));
    try {
      await chemotherapyApi.archiveRegimenProtocol(row.protocol_id);
      queryClient.invalidateQueries({ queryKey: ["protocol-master-list"] });
      toast({
        title: "Protocol archived",
        description: `${row.name} has been moved to archive.`,
      });
    } catch (e: any) {
      toast({
        title: "Archive failed",
        description: e.response?.data?.message ?? e.message,
        variant: "destructive",
      });
    }
  };

  const handleRestoreSingle = async (row: ProtocolRow) => {
    setRows((prev) => prev.map((p) => (p.protocol_id === row.protocol_id ? { ...p, status: "Active" } : p)));
    try {
      await chemotherapyApi.restoreRegimenProtocol(row.protocol_id);
      queryClient.invalidateQueries({ queryKey: ["protocol-master-list"] });
      toast({
        title: "Protocol restored",
        description: `${row.name} is now active.`,
      });
    } catch (e: any) {
      toast({
        title: "Restore failed",
        description: e.response?.data?.message ?? e.message,
        variant: "destructive",
      });
    }
  };

  const handleBulkExport = () => {
    setBulkOpen(false);
    const count = selectedIds.size;
    if (count === 0) {
      toast({ title: "No protocols selected", variant: "destructive" });
      return;
    }
    handleExport("pdf");
  };

  const handleExport = (exportFormat: string) => {
    const source = selectedIds.size > 0 ? selectedRows : sortedData;
    if (exportFormat === "pdf") {
      downloadExportPdf({
        title: "Chemotherapy Protocols",
        subtitle: `${source.length} protocol${source.length === 1 ? "" : "s"} - exported on ${formatInBranchTimezone(new Date(), "dd/MM/yyyy HH:mm")}`,
        filename: `protocols-${getTodayInActiveTimezone()}.pdf`,
        columns: [
          { header: "Protocol ID", cell: (r: any) => r.protocol_id },
          { header: "Protocol Name", cell: (r: any) => r.name },
          { header: "Cancer Type", cell: (r: any) => r.cancer_type },
          { header: "Cycle Days", cell: (r: any) => r.cycle_days },
          { header: "Status", cell: (r: any) => r.status },
          { header: "Updated By", cell: (r: any) => r.updated_by },
          { header: "Updated At", cell: (r: any) => formatInBranchTimezone(new Date(r.updated_at), "dd/MM/yyyy") },
        ],
        rows: source,
      });
      toast({ title: "Export complete", description: "The PDF file has been downloaded." });
      return;
    }
    if (exportFormat !== "csv") return;
    try {
      const header = ["Protocol ID", "Protocol Name", "Cancer Type", "Cycle Days", "Status", "Updated By", "Updated At"];
      const lines = source.map((r) =>
        [
          r.protocol_id,
          r.name,
          r.cancer_type,
          r.cycle_days,
          r.status,
          r.updated_by,
          formatInBranchTimezone(new Date(r.updated_at), "dd/MM/yyyy"),
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      );
      const blob = new Blob([[header.join(","), ...lines].join("\n")], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `protocols-${getTodayInActiveTimezone()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Export complete", description: "The CSV file has been downloaded." });
    } catch {
      toast({ title: "Export failed", description: "Something went wrong while exporting.", variant: "destructive" });
    }
  };

  const handleNewProtocol = () => {
    navigate("/protocol/create");
  };

  const [deleteTarget, setDeleteTarget] = useState<ProtocolRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleView = (row: ProtocolRow) => navigate(`/protocol/view/${row.protocol_id}`);
  const handleEdit = (row: ProtocolRow) => navigate(`/protocol/edit/${row.protocol_id}`);
  const handleDelete = (row: ProtocolRow) => setDeleteTarget(row);
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      // Backend has no delete for regimen-protocol; try delete API, fallback to local archive
      try {
        await chemotherapyApi.deleteRegimenProtocol(deleteTarget.protocol_id);
      } catch {}
      setRows((prev) => prev.filter((r) => r.protocol_id !== deleteTarget.protocol_id));
      queryClient.invalidateQueries({ queryKey: ["protocol-master-list"] });
      toast({ title: "Protocol deleted", description: `${deleteTarget.name} has been removed.` });
      setDeleteTarget(null);
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.response?.data?.message ?? e.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper compute functions strictly for widgets
  const getRecent = (list: ProtocolRow[]) =>
    [...list].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 5);

  const getReviews = (list: ProtocolRow[]) => {
    const now = new Date();
    return list
      .filter((r) => {
        if (!r.review_date) return false;
        const d = new Date(r.review_date);
        return !isNaN(d.getTime());
      })
      .map((r) => {
        const d = new Date(r.review_date!);
        const diffDays = differenceInDays(d, now);
        let daysText = "Today";
        if (diffDays > 0) {
          daysText = `in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
        } else if (diffDays < 0) {
          daysText = `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} overdue`;
        }
        return {
          id: r.protocol_id,
          name: r.name,
          date: format(d, "dd MMM yyyy"),
          days: daysText,
          isOverdue: diffDays < 0,
        };
      })
      .sort((a, b) => (a.isOverdue === b.isOverdue ? 0 : a.isOverdue ? -1 : 1))
      .slice(0, 5);
  };

  // Reactive useState strictly for the widgets (lazy initialized from rows)
  const [recentlyUpdated, setRecentlyUpdated] = useState<ProtocolRow[]>(() => getRecent(rows));
  const [upcomingReviews, setUpcomingReviews] = useState<
    Array<{ id: string; name: string; date: string; days: string; isOverdue: boolean }>
  >(() => getReviews(rows));

  // Auto-update the widgets whenever protocol data is available or changes
  useEffect(() => {
    setRecentlyUpdated(getRecent(rows));
    setUpcomingReviews(getReviews(rows));
  }, [rows]);

  const activePercent = stats.total > 0 ? (stats.active / stats.total) * 100 : 0;
  const activePercentFormatted =
    activePercent % 1 === 0 ? `${activePercent}%` : `${parseFloat(activePercent.toFixed(2))}%`;

  /* KPI quick-filters: clicking a KPI card scopes the protocol list below to
     the bucket the KPI represents (same click-to-filter behaviour as the
     Dashboard KPI row / OrderMaster chemo orders quick-filter). */
  const handleKpiClick = (kpiId: string) => {
    switch (kpiId) {
      case "total-protocols":
        setAppliedFilter("status", undefined);
        break;
      case "active":
        setAppliedFilter("status", ["Active"]);
        break;
      case "archive":
        setAppliedFilter("status", ["Archive"]);
        break;
    }
  };

  const kpiItems: KpiItem[] = useMemo(
    () => [
      {
        id: "total-protocols",
        label: "Total Protocols",
        subLabel: "All protocols",
        value: stats.total,
        valueColor: "#004785",
        iconBg: "rgba(255, 255, 255, 0.40)",
        icon: <FileText className="w-[17px] h-[17px]" color="#004785" />,
        onClick: () => handleKpiClick("total-protocols"),
      },
      {
        id: "active",
        label: "Active",
        subLabel: `${activePercentFormatted} of total`,
        value: stats.active,
        valueColor: "#059669",
        iconBg: "rgba(255, 255, 255, 0.40)",
        icon: <CheckCircle2 className="w-[17px] h-[17px]" color="#059669" />,
        onClick: () => handleKpiClick("active"),
      },
      {
        id: "used-this-month",
        label: "Used This Month",
        subLabel: usedThisMonth.hasUsageData ? "This calendar month" : "No usage data tracked",
        value: usedThisMonth.count,
        valueColor: "#004785",
        iconBg: "rgba(255, 255, 255, 0.40)",
        icon: <TrendingUp className="w-[17px] h-[17px]" color="#004785" />,
      },
      {
        id: "due-for-review",
        label: "Due for Review",
        subLabel: dueForReview.hasReviewData
          ? dueForReview.overdueCount > 0
            ? `${dueForReview.overdueCount} overdue`
            : "Up to date"
          : "No review dates set",
        value: dueForReview.count,
        valueColor: "#F59E0B",
        iconBg: "rgba(255, 255, 255, 0.40)",
        icon: <Clock className="w-[17px] h-[17px]" color="#F59E0B" />,
      },
      {
        id: "archive",
        label: "Archive",
        subLabel: "Archived protocols",
        value: stats.archived,
        valueColor: "#DC2626",
        iconBg: "rgba(255, 255, 255, 0.40)",
        icon: <Archive className="w-[17px] h-[17px]" color="#DC2626" />,
        onClick: () => handleKpiClick("archive"),
      },
    ],
    [stats, activePercentFormatted, usedThisMonth, dueForReview, handleKpiClick]
  );

  return (
    <div className="flex w-full font-[Manrope,sans-serif] bg-[#F7F9FB] min-h-screen">
      <div className="flex flex-col flex-1 min-w-0">
        <main className="flex flex-col gap-6">

          {/* ==================== HEADER ==================== */}
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h1 className="hms-heading">Chemotherapy Protocols</h1>
              <p className="hms-subheading">Manage chemotherapy regimens, protocols and standard treatment plans across all cancer types.</p>
            </div>
            <div className="flex items-center gap-3">
              {can("report.export") && <ExportReport onExport={handleExport} />}
              {can("chemo.protocol.manage") && (
                <button
                  onClick={handleNewProtocol}
                  className="flex items-center gap-2 px-4 py-2 bg-[#004785] rounded-lg text-white text-xs font-semibold shadow-sm hover:bg-[#003a6b] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New Protocol
                </button>
              )}
            </div>
          </div>

          {/* ==================== STAT CARDS ==================== */}
          <KpiSection
            items={kpiItems}
            layout="grid"
            showHeader={false}
            showDatePicker={false}
            showShower={false}
            enableUsageTracking={false}
            enablePreferences={false}
          />

          {/* ==================== MAIN CARD ==================== */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col transition-all duration-300 hover:shadow-md">

            {/* ==================== TOOLBAR ==================== */}
            <div className="px-5 py-4 border-b border-[#E5E7EB] flex flex-wrap items-center justify-between gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search protocols, cancers, intent..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  className="pl-8 pr-3 py-1.5 bg-[#F2F4F6] text-xs text-[#191C1E] placeholder:text-[#6B7280] outline-none w-[180px] sm:w-[260px] rounded-md transition-all duration-200 focus:rounded-none focus:w-[260px] sm:focus:w-[320px] focus:ring-1 focus:ring-[#00488D]"
                />
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B7280]" />
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <ToolbarFilter
                  title="Filter Protocols"
                  fields={protocolFilterFields}
                  values={filterValues}
                  appliedValues={appliedValues}
                  onChange={handleFilterChange}
                  onApply={handleApplyFilter}
                  onClear={handleClearFilter}
                  open={isFilterOpen}
                  onOpenChange={setIsFilterOpen}
                />

                <RefreshButton onClick={fetchProtocols} isLoading={loading} />
              </div>
            </div>

            {/* ==================== BULK ACTIONS ==================== */}
            {selectedIds.size > 0 && (
              <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center gap-3 bg-[#F7F9FB]">
                <span className="text-sm font-semibold text-[#191C1E]">{selectedIds.size} selected</span>
                <div className="relative" ref={bulkRef}>
                  <button
                    onClick={() => setBulkOpen((o) => !o)}
                    className="flex items-center gap-2 px-3 py-1.5 border border-[#E5E7EB] bg-white rounded-lg text-xs font-semibold text-[#424752] shadow-sm hover:bg-[#F2F4F6] transition-colors"
                  >
                    Bulk Actions
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${bulkOpen ? "rotate-180" : ""}`} />
                  </button>
                  {bulkOpen && (
                    <div className="absolute left-0 mt-2 w-44 bg-white rounded-lg shadow-lg border border-[#E5E7EB] py-1 z-10 animate-slideDown">
                      <button
                        onClick={handleBulkExport}
                        className="flex items-center gap-2 w-full px-4 py-2 text-xs font-medium text-[#424752] hover:bg-[#F2F4F6] transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                        Export selected
                      </button>
                      <button
                        onClick={handleBulkArchive}
                        className="flex items-center gap-2 w-full px-4 py-2 text-xs font-medium text-[#B45309] hover:bg-[#F2F4F6] transition-colors"
                      >
                        <Archive className="w-4 h-4" />
                        Archive selected
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ==================== BODY ==================== */}
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-[#6B7280] text-sm">
                <Loader2 size={24} className="animate-spin text-[#00488D]" />
                Loading protocols...
              </div>
            ) : (
              <HmsTable
                scrollable={true}
                  columns={[
                  {
                    key: "select",
                    label: (
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        aria-label="Select all"
                        className="w-3.5 h-3.5 accent-[#004785] cursor-pointer"
                      />
                    ),
                    sortable: false,
                    className: "w-12 pl-5",
                    headerClassName: "w-12 pl-5",
                    render: (r: any) => (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(r.protocol_id)}
                        onChange={() => toggleSelect(r.protocol_id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-3.5 h-3.5 accent-[#004785] cursor-pointer"
                      />
                    ),
                  },
                  {
                    key: "protocol_id",
                    label: "Protocol ID",
                    sortable: true,
                    render: (r: any) => <span className="hms-id-text font-semibold">{r.protocol_id}</span>,
                  },
                  {
                    key: "name",
                    label: "Protocol Name",
                    sortable: true,
                    render: (r: any) => (
                      <div>
                        <div className="hms-name-text text-[#004785] group-hover:underline">{r.name}</div>
                        <div className="hms-id-text">{r.cancer_type} · {r.intent}</div>
                      </div>
                    ),
                  },
                  {
                    key: "cycle_days",
                    label: "Cycle Days",
                    sortable: true,
                    render: (r: any) => (
                      <span className="text-[#424752] text-sm font-semibold">{r.cycle_days}</span>
                    ),
                  },
                  {
                    key: "status",
                    label: "Status",
                    sortable: true,
                    render: (r: any) => <StatusBadge status={r.status} />,
                  },
                  {
                    key: "updated_at",
                    label: "Updated",
                    sortable: true,
                    render: (r: any) => {
                      const validDate = r.updated_at && !isNaN(new Date(r.updated_at).getTime());
                      return (
                        <div>
                          <div className="text-[#424752] text-sm font-medium">{r.updated_by}</div>
                          <div className="hms-id-text">
                            {validDate ? formatInBranchTimezone(new Date(r.updated_at), "MMM d, yyyy") : "—"}
                          </div>
                        </div>
                      );
                    },
                  },
                  {
                    key: "actions",
                    label: "Actions",
                    sortable: false,
                    className: "w-12 !whitespace-normal",
                    headerClassName: "w-12",
                    render: (r: any) => (
                      <div onClick={(e) => e.stopPropagation()}>
                        <ProtocolActionMenu
                          row={r as ProtocolRow}
                          onView={() => handleView(r as ProtocolRow)}
                          onEdit={() => handleEdit(r as ProtocolRow)}
                          onArchive={() => handleArchiveSingle(r as ProtocolRow)}
                          onRestore={() => handleRestoreSingle(r as ProtocolRow)}
                          onDelete={() => handleDelete(r as ProtocolRow)}
                        />
                      </div>
                    ),
                  },
                ]}
                data={currentRows}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                currentPage={safePage}
                totalPages={totalPages}
                totalRecords={totalRecords}
                rowsPerPage={rowsPerPage}
                visibleStart={visibleStart}
                visibleEnd={visibleEnd}
                onPageChange={(p) => { setCurrentPage(p); setBulkOpen(false); }}
                onRowsPerPageChange={(val) => { setRowsPerPage(val); setCurrentPage(1); }}
                rowsPerPageOptions={[5, 10, 20, 50]}
                emptyMessage="No protocols found matching the current filters."
                rowKey={(r: any) => String(r.protocol_id)}
                onRowClick={(row) => handleView(row as ProtocolRow)}
              />
            )}
          </div>

          {/* ==================== BOTTOM CARDS ==================== */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

            {/* PROTOCOL PERFORMANCE (Most Used Protocols with custom date range, bar/pie view & system share) */}
            <ProtocolPerformance
              compact
              onView={(p) => navigate(`/protocol/view/${p.protocol_id}`)}
            />

            {/* RECENTLY UPDATED */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#191C1E]">Recently Updated</h3>
                <Clock className="w-4 h-4 text-[#004785]" />
              </div>
              <div className="mt-4 flex flex-col gap-3">
                {recentlyUpdated.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[#6B7280]">
                    No protocols found.
                  </div>
                ) : (
                  recentlyUpdated.map((r) => {
                    const validDate = r.updated_at && !isNaN(new Date(r.updated_at).getTime());
                    return (
                      <div
                        key={r.protocol_id}
                        onClick={() => handleView(r)}
                        className="flex items-center justify-between gap-3 py-1.5 border-b border-[#F2F4F6] last:border-0 cursor-pointer group"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[#191C1E] group-hover:text-[#004785] truncate">
                            {r.name}
                          </div>
                          <div className="hms-id-text truncate">
                            {r.protocol_id}
                            {r.updated_by && r.updated_by !== "—" ? ` · by ${r.updated_by}` : ""}
                          </div>
                        </div>
                        <div className="flex items-center shrink-0">
                          <span className="text-[10px] font-semibold text-[#6B7280]">
                            {validDate ? formatInBranchTimezone(new Date(r.updated_at), "MMM d") : "—"}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* UPCOMING REVIEWS */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#191C1E]">Upcoming Reviews</h3>
                <CalendarDays className="w-4 h-4 text-[#004785]" />
              </div>
              <div className="mt-4 flex flex-col gap-3">
                {upcomingReviews.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[#6B7280]">
                    No upcoming reviews scheduled.
                  </div>
                ) : (
                  upcomingReviews.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => navigate(`/protocol/view/${r.id}`)}
                      className="flex items-center justify-between gap-3 py-1.5 border-b border-[#F2F4F6] last:border-0 cursor-pointer group"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#191C1E] group-hover:text-[#004785] truncate">
                          {r.name}
                        </div>
                        <div className="hms-id-text">{r.date}</div>
                      </div>
                      <span
                        className={`text-[10px] font-bold rounded-full px-2.5 py-1 whitespace-nowrap ${
                          r.isOverdue
                            ? "text-[#DC2626] bg-[#FEE2E2]"
                            : "text-[#B45309] bg-[#FEF3C7]"
                        }`}
                      >
                        {r.days}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          <ConfirmationDialog
            open={!!deleteTarget}
            type="danger"
            title="Delete Protocol?"
            description={deleteTarget ? `Protocol "${deleteTarget.name}" (${deleteTarget.protocol_id}) will be permanently deleted. This action cannot be undone.` : ""}
            confirmText="Delete"
            cancelText="Cancel"
            loading={isDeleting}
            onConfirm={confirmDelete}
            onCancel={() => setDeleteTarget(null)}
          />

        </main>
      </div>
    </div>
  );
}