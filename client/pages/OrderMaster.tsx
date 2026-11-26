import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Search,
  Loader2,
  MoreVertical,
  FileText,
  CheckCircle2,
  Clock,
  CalendarDays,
  HeartPulse,
  UserRound,
} from "lucide-react";
import { format } from "date-fns";
import { formatInBranchTimezone, getTodayInActiveTimezone } from "@/utils/timezone";
import HmsTable from "@/components/hms/HmsTable";
import { RefreshButton } from "@/components/hms/RefreshButton";
import { StatusBadge } from "@/components/hms/StatusBadge";
import ExportReport from "@/components/ui/ExportReport";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { ToolbarFilter } from "@/components/ui/toolbar-filter";
import { useFilterPanel, useOrderFilters } from "@/components/Filter";
import { filterDataByValues } from "@/components/Filter/utils";
import { DiscontinuePlanDialog } from "@/components/chemo/DiscontinuePlanDialog";
import { useToast } from "@/hooks/use-toast";
import { usePermission } from "@/context/PermissionContext";
import { useBranchFilter } from "@/context/BranchFilterContext";
import { useNavigate, useLocation } from "react-router-dom";
import { downloadExportPdf } from "@/lib/exportPdf";
import { getUser } from "@/utils/token";
import { chemotherapyApi, type ChemoPlan } from "@/api/chemotherapy.api";
import CycleProgressChart from "@/components/hms/cycleProgressChart";
import { KpiSection } from "@/components/hms/dashboard/KpiSection";
import type { KpiItem } from "@/components/hms/dashboard/kpi.types";
import {
  CLOSED_PLAN_STATUSES,
  avatarFor,
  fmtDate,
  getCycleProgress,
  getInitials,
  getStatusSnapshot,
  getUpcomingCycles,
  isOpenPlan,
  isOverdue,
  isTodayIso,
  orderStatusOf,
  summarizeCycles,
  toTime,
  upcomingDateOf,
  type OrderStatus,
} from "./orderMasterCycles";

/* Admin-portal roles see Orders read-only: they can view/export a plan but
   never change its status (Discontinue is hidden for them). Same role list
   the rest of the app uses for "admin" screens. */
const ADMIN_ROLES = ["HEAD_ADMIN", "SUPER_ADMIN", "SYSTEM_ADMIN", "ADMIN", "BRANCH_ADMIN"];

interface OrderRow {
  plan_id: string;
  /* The plan's own treatment_start_date -- used by the Start Date column and
     by the Upcoming Cycles rule (future start wins over next-cycle date). */
  start_date: string;
  patient_id: string;
  patient_name: string;
  patient_initials: string;
  patient_avatar_color: string;
  patient_avatar_bg: string;
  /* Filter-only fields -- none of these is a column. */
  intent: string;
  branch: string;
  branch_id?: string;
  oncologist: string;
  diagnosis: string;
  protocol: string;
  protocol_code: string;
  /* Cycle/Day column: the cycle + day the plan is actually on, and the
     completed / planned cycle count as its own line. */
  cycle_label: string;
  cycles_label: string;
  cycle_progress: number;
  next_cycle_date: string;
  raw_status: string;
  status: OrderStatus;
  is_open: boolean;
}

/* Avatar / cycle / date / status helpers live in ./orderMasterCycles - a
   co-located module (like consultation/doseCalculation.ts) so the maths is
   unit-tested in orderMasterCycles.spec.ts without mounting this page. */

function OrderActionMenu({
  onView,
  onExport,
  onPharmacySlip,
  onDiscontinue,
  showDiscontinue,
}: {
  onView: () => void;
  onExport: () => void;
  onPharmacySlip: () => void;
  onDiscontinue: () => void;
  showDiscontinue: boolean;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const { can } = usePermission();

  const canView = can("chemo.plan.read") || can("chemo.plan.update");

  if (!canView && !can("report.export")) return null;

  const placeMenu = () => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
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

  const items: Array<{ label: string; onClick: () => void; danger?: boolean }> = [];
  if (canView) items.push({ label: "View Order", onClick: onView });
  if (canView) items.push({ label: "Pharmacy Slip", onClick: onPharmacySlip });
  if (showDiscontinue) items.push({ label: "Discontinue", onClick: onDiscontinue, danger: true });
  if (can("report.export")) items.push({ label: "Export Order", onClick: onExport });

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label="Order actions"
        onClick={(e) => {
          // The whole row opens the order; the kebab must not.
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="flex items-center justify-center p-1.5 border border-[#E5E7EB] rounded-md hover:border-[#00488D] transition-colors"
      >
        <MoreVertical className="w-4 h-4 text-[#6B7280]" />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            // The menu is portalled to document.body, but React still bubbles
            // its events through the component tree -- without this, clicking
            // an item reaches the row's onClick and navigates away instead of
            // running the action.
            onClick={(e) => e.stopPropagation()}
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

export default function OrderMaster() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { can } = usePermission();
  const currentUser = getUser();
  const currentRole = String(currentUser?.role_type ?? currentUser?.role ?? "").toUpperCase();
  const isAdminView = ADMIN_ROLES.includes(currentRole);

  const { selectedBranchId, isAllBranches, branches } = useBranchFilter();
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [sortField, setSortField] = useState("start_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [newOrderOpen, setNewOrderOpen] = useState(false);

  const [discontinueOpen, setDiscontinueOpen] = useState(false);
  const [discontinueRow, setDiscontinueRow] = useState<OrderRow | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Load every page (the backend caps a page at 100) so statuses, tabs,
      // stats and exports stay correct for rows beyond the first page. The
      // cap is a guard against an infinite loop on a bad total, not a volume
      // assumption.
      const PAGE_LIMIT = 100;
      const MAX_PAGES = 20;
      const plans: ChemoPlan[] = [];
      let page = 1;
      let total = 0;

      do {
        const res = await chemotherapyApi.listPlans({ limit: PAGE_LIMIT, page });
        const batch = res.data?.data ?? [];
        total = res.data?.pagination?.total ?? batch.length;
        plans.push(...batch);
        if (batch.length < PAGE_LIMIT) break;
        page += 1;
      } while (page <= MAX_PAGES);

      const mapped: OrderRow[] = plans.map((p: ChemoPlan) => {
        const cycles = summarizeCycles(p);
        const patient =
          p.patient_bio_data?.patient_first_name && p.patient_bio_data?.patient_last_name
            ? `${p.patient_bio_data.patient_first_name} ${p.patient_bio_data.patient_last_name}`
            : "—";
        const protocolName = p.regimen_name ?? p.protocol_name ?? "—";
        const code = p.regimen_code ?? p.chemotherapy_regimen_protocol?.regimen_code ?? "";
        const avatar = avatarFor(p.patient_id || p.chemotherapy_plan_id);
        const rawStatus = (p.treatment_status ?? "PLANNED").toUpperCase();

        const oncologist =
          [p.employees?.first_name, p.employees?.last_name]
            .filter(Boolean)
            .join(" ")
            .trim() || "—";
        const diagnosis =
          [p.cancer_type, p.cancer_subtype, p.cancer_stage]
            .filter(Boolean)
            .join(" · ") || "—";

        return {
          plan_id: p.chemotherapy_plan_id,
          // The plan's own start date. created_at is deliberately NOT a
          // fallback here: it is the record's creation timestamp, which would
          // make a future-dated plan look like it already started.
          start_date: p.treatment_start_date ?? "",
          patient_id: p.patient_id,
          patient_name: patient,
          patient_initials: getInitials(patient),
          patient_avatar_color: avatar.avatarColor,
          patient_avatar_bg: avatar.initBg,
          intent: p.treatment_intent ?? "—",
          branch: p.branch?.branch_name ?? "—",
          branch_id: p.branch_id ?? "",
          oncologist,
          diagnosis,
          protocol: protocolName,
          protocol_code: code,
          cycle_label: cycles.cycleLabel,
          cycles_label: cycles.cyclesLabel,
          cycle_progress: cycles.progress,
          next_cycle_date: cycles.nextCycleDate,
          raw_status: rawStatus,
          status: orderStatusOf(rawStatus),
          is_open: !CLOSED_PLAN_STATUSES.includes(rawStatus),
        };
      });

      setRows(mapped);
      if (total > plans.length) {
        // Never fail silently: if the cap stopped us early, the page shows a
        // subset and says so instead of quietly under-counting.
        toast({
          title: "Showing a partial list",
          description: `Loaded ${plans.length} of ${total} plans. Narrow the filters to see the rest.`,
        });
      }
    } catch (e: any) {
      setRows([]);
      // Surface the backend's own message: a failed fetch is otherwise
      // indistinguishable from a genuine empty result, so a 400 renders as
      // "No orders found" and hides the real cause entirely.
      toast({
        title: "Failed to load chemo orders",
        description: e?.response?.data?.message ?? e?.message ?? "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOrders();
  }, [selectedBranchId, isAllBranches]);

  // ---- Filters -----------------------------------------------------------
  const { orderFilterFields } = useOrderFilters({ orderRows: rows });
  const {
    values: filterValues,
    appliedValues,
    isOpen: isFilterOpen,
    setIsOpen: setIsFilterOpen,
    handleChange: handleFilterChange,
    handleApply: handleFilterApply,
    handleClear: handleFilterClear,
    setAppliedFilter,
  } = useFilterPanel(orderFilterFields);

  const location = useLocation();

  // Auto-apply traditional filter when navigating with ?patient=<name> or ?protocol=<code>
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const patientParam = params.get("patient") || (location.state as any)?.filterPatient;
    const protocolParam = params.get("protocol") || (location.state as any)?.filterProtocol;
    if (patientParam) {
      setAppliedFilter("patient", [patientParam]);
      setCurrentPage(1);
    } else if (protocolParam) {
      setAppliedFilter("protocol", [protocolParam]);
      setCurrentPage(1);
    }
  }, [location.search, location.state]);

  const handleApplyFilter = () => {
    handleFilterApply();
    setCurrentPage(1);
  };

  const handleClearFilter = () => {
    handleFilterClear();
    setCurrentPage(1);
  };

  /* KPI quick-filters: clicking a KPI card sets applied filters directly
     inside the filter engine (like ProtocolMaster), updating the active count
     badge on the Filter button and pre-selecting options in the popover. */
  const handleKpiClick = (kpiId: string) => {
    switch (kpiId) {
      case "total-plans":
        setAppliedFilter("status", undefined);
        setAppliedFilter("cycleAlert", undefined);
        break;
      case "active-chemo-orders":
        setAppliedFilter("status", ["Scheduled", "In Progress"]);
        setAppliedFilter("cycleAlert", undefined);
        break;
      case "patients-under-treatment":
        setAppliedFilter("status", ["In Progress"]);
        setAppliedFilter("cycleAlert", undefined);
        break;
      case "orders-due-today":
        setAppliedFilter("cycleAlert", ["dueToday"]);
        setAppliedFilter("status", undefined);
        break;
      case "delayed":
        setAppliedFilter("cycleAlert", ["delayed"]);
        setAppliedFilter("status", undefined);
        break;
    }
    setCurrentPage(1);
  };

  const stats = useMemo(() => {
    const statusCounts = new Map<OrderStatus, number>();
    rows.forEach((r) => {
      const s = orderStatusOf(r.raw_status);
      statusCounts.set(s, (statusCounts.get(s) ?? 0) + 1);
    });
    const active =
      (statusCounts.get("In Progress") ?? 0) + (statusCounts.get("Scheduled") ?? 0);
    const patients = new Set(
      rows
        .filter((r) => orderStatusOf(r.raw_status) === "In Progress")
        .map((r) => r.patient_id)
    ).size;
    const dueToday = rows.filter((r) => isTodayIso(r.next_cycle_date)).length;
    // Only open plans can be late; completed/cancelled courses are not.
    const delayed = rows.filter(
      (r) => isOverdue(r.next_cycle_date) && r.is_open
    ).length;
    const total = rows.length;
    const completed = statusCounts.get("Completed") ?? 0;
    return { total, active, patients, dueToday, delayed, completed };
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows;

    if (!isAllBranches && selectedBranchId) {
      list = list.filter(
        (r) =>
          r.branch_id === selectedBranchId ||
          (r.branch && r.branch !== "—" && branches.some((b) => b.id === selectedBranchId && b.name === r.branch))
      );
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.patient_id.toLowerCase().includes(q) ||
          r.patient_name.toLowerCase().includes(q) ||
          r.protocol.toLowerCase().includes(q) ||
          r.protocol_code.toLowerCase().includes(q) ||
          r.intent.toLowerCase().includes(q) ||
          r.oncologist.toLowerCase().includes(q) ||
          r.diagnosis.toLowerCase().includes(q)
      );
    }

    if (appliedValues.cycleAlert?.includes("dueToday")) {
      list = list.filter((r) => isTodayIso(r.next_cycle_date));
    }
    if (appliedValues.cycleAlert?.includes("delayed")) {
      list = list.filter((r) => isOpenPlan(r.raw_status) && isOverdue(r.next_cycle_date));
    }

    const { cycleAlert, ...cleanFilters } = appliedValues;
    return filterDataByValues(list, cleanFilters, orderFilterFields) as unknown as OrderRow[];
  }, [rows, isAllBranches, selectedBranchId, branches, search, appliedValues, orderFilterFields]);

  const sortedData = useMemo(() => {
    const list = [...filtered];
    const dir = sortDirection === "asc" ? 1 : -1;
    list.sort((a, b) => {
      switch (sortField) {
        case "status":
          return orderStatusOf(a.raw_status).localeCompare(orderStatusOf(b.raw_status)) * dir;
        case "plan_id":
        case "patient_id":
        case "patient_name":
        case "protocol":
          return String(a[sortField as keyof OrderRow]).localeCompare(
            String(b[sortField as keyof OrderRow])
          ) * dir;
        case "start_date":
        case "next_cycle_date":
          return (
            (toTime(a[sortField as keyof OrderRow] as string) -
              toTime(b[sortField as keyof OrderRow] as string)) *
            dir
          );
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

  const handleExport = (exportFormat: string) => {
    const source = sortedData;
    const rowsForExport = source.map((r) => ({
      ...r,
      status: orderStatusOf(r.raw_status),
    }));
    const exportColumns = [
      { header: "Start Date", cell: (r: any) => fmtDate(r.start_date) },
      { header: "Patient ID", cell: (r: any) => r.patient_id },
      { header: "Patient Name", cell: (r: any) => r.patient_name },
      { header: "Branch", cell: (r: any) => r.branch },
      { header: "Oncologist", cell: (r: any) => r.oncologist },
      { header: "Diagnosis", cell: (r: any) => r.diagnosis },
      { header: "Protocol", cell: (r: any) => r.protocol },
      { header: "Cycle/Day", cell: (r: any) => r.cycle_label },
      { header: "Cycles Done", cell: (r: any) => r.cycles_label },
      { header: "Next Cycle Date", cell: (r: any) => fmtDate(r.next_cycle_date) },
      { header: "Status", cell: (r: any) => r.status },
    ];

    if (exportFormat === "pdf") {
      downloadExportPdf({
        title: "Chemotherapy Orders",
        subtitle: `${rowsForExport.length} order${rowsForExport.length === 1 ? "" : "s"} - exported on ${formatInBranchTimezone(new Date(), "dd/MM/yyyy HH:mm")}`,
        filename: `chemotherapy-orders-${getTodayInActiveTimezone()}.pdf`,
        columns: exportColumns,
        rows: rowsForExport,
      });
      toast({ title: "Export complete", description: "The PDF file has been downloaded." });
      return;
    }
    if (exportFormat !== "csv") return;
    try {
      const header = exportColumns.map((c) => c.header);
      const lines = rowsForExport.map((r) =>
        exportColumns
          .map((c) => `"${String(c.cell(r)).replace(/"/g, '""')}"`)
          .join(",")
      );
      const blob = new Blob([[header.join(","), ...lines].join("\n")], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chemotherapy-orders-${getTodayInActiveTimezone()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Export complete", description: "The CSV file has been downloaded." });
    } catch {
      toast({ title: "Export failed", description: "Something went wrong while exporting.", variant: "destructive" });
    }
  };

  const handleView = (row: OrderRow) => {
    navigate("/doctor/patient-details", { state: { patientId: row.patient_id } });
  };

  const handlePharmacySlip = (row: OrderRow) => {
    navigate(`/orders/${row.plan_id}/pharmacy-slip`);
  };

  const kpiItems: KpiItem[] = useMemo(
    () => [
      {
        id: "active-chemo-orders",
        label: "Active Chemo Orders",
        subLabel: "Currently scheduled / running",
        value: stats.active,
        valueColor: "#004785",
        iconBg: "rgba(255, 255, 255, 0.40)",
        icon: <HeartPulse className="w-[17px] h-[17px]" color="#004785" />,
        onClick: () => handleKpiClick("active-chemo-orders"),
      },
      {
        id: "patients-under-treatment",
        label: "Patients Under Treatment",
        subLabel: "On active plans",
        value: stats.patients,
        valueColor: "#059669",
        iconBg: "rgba(255, 255, 255, 0.40)",
        icon: <UserRound className="w-[17px] h-[17px]" color="#059669" />,
        onClick: () => handleKpiClick("patients-under-treatment"),
      },
      {
        id: "orders-due-today",
        label: "Orders Due Today",
        subLabel: "Next cycle falls today",
        value: stats.dueToday,
        valueColor: "#F59E0B",
        iconBg: "rgba(255, 255, 255, 0.40)",
        icon: <CalendarDays className="w-[17px] h-[17px]" color="#F59E0B" />,
        onClick: () => handleKpiClick("orders-due-today"),
      },
      {
        id: "delayed",
        label: "Delayed",
        subLabel: "Past due next-cycle dates",
        value: stats.delayed,
        valueColor: "#EF4444",
        iconBg: "rgba(255, 255, 255, 0.40)",
        icon: <Clock className="w-[17px] h-[17px]" color="#EF4444" />,
        onClick: () => handleKpiClick("delayed"),
      },
      {
        id: "total-plans",
        label: "Total Plans",
        subLabel: `${stats.completed} completed`,
        value: stats.total,
        valueColor: "#6B7280",
        iconBg: "rgba(255, 255, 255, 0.40)",
        icon: <FileText className="w-[17px] h-[17px]" color="#6B7280" />,
        onClick: () => handleKpiClick("total-plans"),
      },
    ],
    [stats, handleKpiClick]
  );

  /* Bottom widgets driven by useState + useEffect, mirroring ProtocolMaster. */
  const [upcomingCycles, setUpcomingCycles] = useState<OrderRow[]>(() => getUpcomingCycles(rows));
  const [statusSnapshot, setStatusSnapshot] = useState(() => getStatusSnapshot(rows));

  useEffect(() => {
    setUpcomingCycles(getUpcomingCycles(rows));
    setStatusSnapshot(getStatusSnapshot(rows));
  }, [rows]);

  return (
    <div className="flex w-full font-[Manrope,sans-serif] bg-[#F7F9FB] min-h-screen">
      <div className="flex flex-col flex-1 min-w-0">
        <main className="flex flex-col gap-6">

          {/* ==================== HEADER ==================== */}
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h1 className="hms-heading">Chemotherapy Orders</h1>
              <p className="hms-subheading">Track chemotherapy orders, cycle scheduling and treatment status across patients.</p>
            </div>
            <div className="flex items-center gap-3">
              {can("report.export") && <ExportReport onExport={handleExport} />}
              {can("chemo.plan.create") && (
                <button
                  onClick={() => setNewOrderOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#004785] rounded-lg text-white text-xs font-semibold shadow-sm hover:bg-[#003a6b] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New Chemo Order
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
                  placeholder="Search orders..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  className="pl-8 pr-3 py-1.5 bg-[#F2F4F6] text-xs text-[#6B7280] placeholder:text-[#6B7280] outline-none w-[180px] sm:w-[240px] rounded-md transition-all duration-200 focus:rounded-none focus:w-[240px] sm:focus:w-[300px]"
                />
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#424752]" />
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <ToolbarFilter
                  title="Filter Orders"
                  fields={orderFilterFields}
                  values={filterValues}
                  appliedValues={appliedValues}
                  onChange={handleFilterChange}
                  onApply={handleApplyFilter}
                  onClear={handleClearFilter}
                  open={isFilterOpen}
                  onOpenChange={setIsFilterOpen}
                />

                <RefreshButton onClick={fetchOrders} isLoading={loading} />
              </div>
            </div>

            {/* ==================== BODY ==================== */}
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-[#6B7280] text-sm">
                <Loader2 size={24} className="animate-spin text-[#00488D]" />
                Loading orders...
              </div>
            ) : (
              <HmsTable
                scrollable={true}
                minWidth="1100px"
                  columns={[
                    {
                      key: "patient_name",
                      label: "Patient Name",
                      sortable: true,
                      render: (r: any) => {
                        const row = r as OrderRow;
                        return (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 flex items-center justify-center rounded-xl flex-shrink-0 hms-avatar-text"
                              style={{ background: row.patient_avatar_bg, color: row.patient_avatar_color }}
                            >
                              {row.patient_initials}
                            </div>
                            <div>
                              <div className="hms-name-text">{row.patient_name}</div>
                              <div className="hms-id-text">{row.patient_id}</div>
                            </div>
                          </div>
                        );
                      },
                    },
                    {
                      key: "start_date",
                      label: "Start Date",
                      sortable: true,
                      render: (r: any) => {
                        const row = r as OrderRow;
                        return (
                          <div>
                            <div className="hms-content-text text-[#191C1E] leading-4">{fmtDate(row.start_date)}</div>
                            <div className="hms-id-text">{row.plan_id}</div>
                          </div>
                        );
                      },
                    },
                    {
                      key: "protocol",
                      label: "Protocol",
                      sortable: true,
                      render: (r: any) => {
                        const row = r as OrderRow;
                        return (
                          <div className="max-w-[180px]">
                            <div className="hms-name-text truncate" title={row.protocol}>{row.protocol}</div>
                            {row.protocol_code && (
                              <div className="hms-department-text text-[#8C8D8F]">{row.protocol_code}</div>
                            )}
                          </div>
                        );
                      },
                    },
                    {
                      key: "cycle_label",
                      label: "Cycle/Day",
                      sortable: false,
                      render: (r: any) => {
                        const row = r as OrderRow;
                        return (
                          <div className="min-w-[132px]">
                            <div className="hms-name-text">{row.cycle_label}</div>
                            <div className="hms-department-text text-[#8C8D8F]">{row.cycles_label}</div>
                            {/* Same thin progress track as the bottom cards,
                                filled by completed_cycles / planned_cycles. */}
                            <div className="mt-1.5 h-1.5 w-24 bg-[#F2F4F6] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#004785] rounded-full"
                                style={{ width: `${row.cycle_progress}%` }}
                              />
                            </div>
                          </div>
                        );
                      },
                    },
                    {
                      key: "next_cycle_date",
                      label: "Next Cycle Date",
                      sortable: true,
                      render: (r: any) => (
                        <span className="hms-content-text text-[#191C1E] leading-4">{fmtDate((r as OrderRow).next_cycle_date)}</span>
                      ),
                    },
                    {
                      key: "status",
                      label: "Status",
                      sortable: true,
                      render: (r: any) => {
                        const row = r as OrderRow;
                        // DISCONTINUED has its own tone in StatusBadge, so show
                        // it instead of the generic Cancelled bucket -- the pill
                        // then matches the plan's real treatment_status.
                        return (
                          <StatusBadge
                            status={
                              row.raw_status === "DISCONTINUED"
                                ? "discontinued"
                                : orderStatusOf(row.raw_status)
                            }
                          />
                        );
                      },
                    },
                    {
                      key: "actions",
                      label: "Actions",
                      sortable: false,
                      className: "w-12 !whitespace-normal",
                      headerClassName: "w-12",
                      render: (r: any) => {
                        const row = r as OrderRow;
                        return (
                          <div onClick={(e) => e.stopPropagation()}>
                            <OrderActionMenu
                              showDiscontinue={
                                row.is_open &&
                                row.raw_status === "ACTIVE" &&
                                can("chemo.plan.update") &&
                                !isAdminView
                              }
                              onDiscontinue={() => {
                                setDiscontinueRow(row);
                                setDiscontinueOpen(true);
                              }}
                              onView={() => handleView(row)}
                              onPharmacySlip={() => handlePharmacySlip(row)}
                              onExport={() => {
                                const single = [row];
                                downloadExportPdf({
                                  title: "Chemotherapy Order",
                                  subtitle: `${row.patient_name} (${row.patient_id}) - ${row.protocol}`,
                                  filename: `order-${row.plan_id}.pdf`,
                                  columns: [
                                    { header: "Order ID", cell: () => row.plan_id },
                                    { header: "Patient ID", cell: () => row.patient_id },
                                    { header: "Patient Name", cell: () => row.patient_name },
                                    { header: "Oncologist", cell: () => row.oncologist },
                                    { header: "Diagnosis", cell: () => row.diagnosis },
                                    { header: "Protocol", cell: () => row.protocol },
                                    { header: "Cycle/Day", cell: () => row.cycle_label },
                                    { header: "Cycles Done", cell: () => row.cycles_label },
                                    { header: "Next Cycle Date", cell: () => fmtDate(row.next_cycle_date) },
                                    { header: "Status", cell: () => orderStatusOf(row.raw_status) },
                                  ],
                                  rows: single,
                                });
                                toast({
                                  title: "Export complete",
                                  description: "The order PDF has been downloaded.",
                                });
                              }}
                            />
                          </div>
                        );
                      },
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
                  onPageChange={(p) => { setCurrentPage(p); }}
                  onRowsPerPageChange={(val) => { setRowsPerPage(val); setCurrentPage(1); }}
                  rowsPerPageOptions={[5, 10, 20, 50]}
                  emptyMessage="No orders found matching the current filters."
                  rowKey={(r: any) => String((r as OrderRow).plan_id)}
                  onRowClick={(r: any) => handleView(r as OrderRow)}
                />
            )}
          </div>

          {/* ==================== BOTTOM CARDS ==================== */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

            {/* CYCLE PROGRESS (Using unified chart component with exact cycle progress logic & no StatusBadge) */}
            <CycleProgressChart
              compact
              rows={rows}
              onView={(r) => handleView(r as OrderRow)}
            />

            {/* UPCOMING CYCLES */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#191C1E]">Upcoming Cycles</h3>
                <CalendarDays className="w-4 h-4 text-[#004785]" />
              </div>
              <div className="mt-4 flex flex-col gap-3">
                {upcomingCycles.map((r) => (
                  <div key={r.plan_id} className="flex items-center justify-between gap-3 py-1.5 border-b border-[#F2F4F6] last:border-0">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#191C1E] truncate">{r.patient_name}</div>
                      <div className="hms-id-text">{r.protocol} · {r.cycle_label}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-semibold text-[#6B7280]">{fmtDate(upcomingDateOf(r))}</span>
                    </div>
                  </div>
                ))}
                {upcomingCycles.length === 0 && (
                  <p className="text-xs text-[#6B7280]">No upcoming cycles scheduled.</p>
                )}
              </div>
            </div>

            {/* ORDER STATUS SNAPSHOT */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#191C1E]">Order Status Snapshot</h3>
                <CheckCircle2 className="w-4 h-4 text-[#004785]" />
              </div>
              <div className="mt-4 flex flex-col gap-3">
                {statusSnapshot.map((entry) => {
                  const status = entry.status;
                  return (
                    <div key={status} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={status} />
                        <span className="text-xs font-semibold text-[#6B7280]">{entry.count}</span>
                      </div>
                      <div className="flex-1 mx-3">
                        <div className="h-1.5 w-full bg-[#F2F4F6] rounded-full overflow-hidden">
                          <div className="h-full bg-[#004785] rounded-full" style={{ width: `${entry.pct}%` }} />
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-[#424752] w-8 text-right">{entry.pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* ==================== NEW CHEMO ORDER DIALOG ==================== */}
          <ConfirmationDialog
            open={newOrderOpen}
            type="info"
            title="New Chemo Order"
            description="Chemotherapy orders are created through the patient consultation flow, after a confirmed diagnosis. Open the Doctor portal to start one."
            confirmText="Open Doctor Portal"
            cancelText="Cancel"
            onConfirm={() => {
              setNewOrderOpen(false);
              navigate("/doctor");
            }}
            onCancel={() => setNewOrderOpen(false)}
          />

          {/* ==================== DISCONTINUE PLAN ==================== */}
          <DiscontinuePlanDialog
            open={discontinueOpen}
            onOpenChange={setDiscontinueOpen}
            planId={discontinueRow?.plan_id ?? null}
            patientName={discontinueRow?.patient_name}
            protocolName={discontinueRow?.protocol}
            onDiscontinued={() => { void fetchOrders(); }}
          />

        </main>
      </div>
    </div>
  );
}
