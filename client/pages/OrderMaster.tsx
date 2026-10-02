import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Search,
  Loader2,
  MoreVertical,
  TrendingUp,
  FileText,
  CheckCircle2,
  Clock,
  CalendarDays,
  HeartPulse,
  FlaskConical,
  UserRound,
} from "lucide-react";
import { format } from "date-fns";
import HmsTable from "@/components/hms/HmsTable";
import { RefreshButton } from "@/components/hms/RefreshButton";
import { StatusBadge } from "@/components/hms/StatusBadge";
import ExportReport from "@/components/ui/ExportReport";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { useToast } from "@/hooks/use-toast";
import { usePermission } from "@/context/PermissionContext";
import { useNavigate } from "react-router-dom";
import { downloadExportPdf } from "@/lib/exportPdf";
import {
  chemotherapyApi,
  type ChemoPlan,
  type LabReviewRecord,
} from "@/api/chemotherapy.api";
import {
  CLOSED_PLAN_STATUSES,
  avatarFor,
  fmtDate,
  getInitials,
  isOverdue,
  isTodayIso,
  summarizeCycles,
  toTime,
} from "./orderMasterCycles";

type OrderStatus = "Scheduled" | "In Progress" | "Labs Pending" | "Held" | "Completed" | "Cancelled";

interface OrderRow {
  plan_id: string;
  date: string;
  patient_id: string;
  patient_name: string;
  patient_initials: string;
  patient_avatar_color: string;
  patient_avatar_bg: string;
  intent: string;
  protocol: string;
  protocol_code: string;
  /* Cycle/Day column: the cycle + day the plan is actually on, and the
     completed / planned cycle count as its own line. */
  cycle_label: string;
  cycles_label: string;
  cycle_progress: number;
  next_cycle_date: string;
  raw_status: string;
  /* The cycle the labs are read from - the one being treated, not the
     highest cycle number. */
  current_cycle_id: string;
}

interface LabValue {
  hemoglobin: string;
  wbc: string;
  platelet: string;
}

/* Avatar / cycle / date helpers now live in ./orderMasterCycles - a co-located
   module (like consultation/doseCalculation.ts) so the cycle maths is
   unit-tested in orderMasterCycles.spec.ts without mounting this page. */

function fmtValue(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === "") return "—";
  return String(n);
}

function OrderActionMenu({
  onView,
  onExport,
  onPharmacySlip,
}: {
  onView: () => void;
  onExport: () => void;
  onPharmacySlip: () => void;
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
  if (can("report.export")) items.push({ label: "Export Order", onClick: onExport });

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

const STATUS_TABS: Array<"All" | OrderStatus> = [
  "All",
  "Scheduled",
  "In Progress",
  "Labs Pending",
  "Held",
  "Completed",
  "Cancelled",
];

function LabStatusCell({
  lab,
  pending,
}: {
  lab: LabValue | null | undefined;
  pending: boolean;
}) {
  if (pending) {
    return (
      <div className="flex items-center gap-2 text-xs text-[#6B7280]">
        <Loader2 className="w-3 h-3 animate-spin text-[#00488D]" />
        Loading labs...
      </div>
    );
  }
  if (!lab) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600">
        <FlaskConical className="w-3 h-3" />
        Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600">
      <FlaskConical className="w-3 h-3" />
      HB {lab.hemoglobin} · WBC {lab.wbc} · PLT {lab.platelet}
    </span>
  );
}

export default function OrderMaster() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { can } = usePermission();

  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [labs, setLabs] = useState<Record<string, LabValue | null>>({});
  const [labsLoading, setLabsLoading] = useState<Record<string, boolean>>({});

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | OrderStatus>("All");

  const [sortField, setSortField] = useState("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [newOrderOpen, setNewOrderOpen] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await chemotherapyApi.listPlans({ limit: 100 });
      const list = res.data?.data ?? [];

      const mapped: OrderRow[] = list.map((p: ChemoPlan) => {
        const cycles = summarizeCycles(p);
        const patient =
          p.patient_bio_data?.patient_first_name && p.patient_bio_data?.patient_last_name
            ? `${p.patient_bio_data.patient_first_name} ${p.patient_bio_data.patient_last_name}`
            : "—";
        const protocolName = p.regimen_name ?? p.protocol_name ?? "—";
        const code = p.regimen_code ?? p.chemotherapy_regimen_protocol?.regimen_code ?? "";
        const avatar = avatarFor(p.patient_id || p.chemotherapy_plan_id);

        return {
          plan_id: p.chemotherapy_plan_id,
          // The schedule's own start date, not the row's creation timestamp
          // (created_at always exists, so it used to win every time).
          date: p.treatment_start_date ?? p.created_at ?? "",
          patient_id: p.patient_id,
          patient_name: patient,
          patient_initials: getInitials(patient),
          patient_avatar_color: avatar.avatarColor,
          patient_avatar_bg: avatar.initBg,
          intent: p.treatment_intent ?? "—",
          protocol: protocolName,
          protocol_code: code,
          cycle_label: cycles.cycleLabel,
          cycles_label: cycles.cyclesLabel,
          cycle_progress: cycles.progress,
          next_cycle_date: cycles.nextCycleDate,
          raw_status: (p.treatment_status ?? "PLANNED").toUpperCase(),
          current_cycle_id: cycles.currentCycleId,
        };
      });

      setRows(mapped);
      setLabs({});
      setLabsLoading({});
    } catch (e: any) {
      setRows([]);
      setLabs({});
      setLabsLoading({});
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
  }, []);

  const statusOf = (r: OrderRow): OrderStatus => {
    const s = r.raw_status;
    if (s === "COMPLETED") return "Completed";
    if (s === "CANCELLED") return "Cancelled";
    if (s === "DISCONTINUED") return "Held";
    const hasLab = labs[r.current_cycle_id] != null;
    if (s === "ACTIVE") return hasLab ? "In Progress" : "Labs Pending";
    return "Scheduled";
  };

  const stats = useMemo(() => {
    const statusCounts = new Map<OrderStatus, number>();
    rows.forEach((r) => {
      const s = statusOf(r);
      statusCounts.set(s, (statusCounts.get(s) ?? 0) + 1);
    });
    const active = (statusCounts.get("In Progress") ?? 0) + (statusCounts.get("Labs Pending") ?? 0) + (statusCounts.get("Scheduled") ?? 0);
    const patients = new Set(
      rows.filter((r) => ["In Progress", "Labs Pending"].includes(statusOf(r))).map((r) => r.patient_id)
    ).size;
    const dueToday = rows.filter((r) => isTodayIso(r.next_cycle_date)).length;
    const delayed = rows.filter((r) => isOverdue(r.next_cycle_date) && ["In Progress", "Labs Pending", "Scheduled"].includes(statusOf(r))).length;
    const total = rows.length;
    const completed = statusCounts.get("Completed") ?? 0;
    return { total, active, patients, dueToday, delayed, completed };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, labs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows;
    if (q) {
      list = list.filter(
        (r) =>
          r.patient_id.toLowerCase().includes(q) ||
          r.patient_name.toLowerCase().includes(q) ||
          r.protocol.toLowerCase().includes(q) ||
          r.protocol_code.toLowerCase().includes(q) ||
          r.intent.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "All") {
      list = list.filter((r) => statusOf(r) === statusFilter);
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, search, statusFilter, labs]);

  const sortedData = useMemo(() => {
    const list = [...filtered];
    const dir = sortDirection === "asc" ? 1 : -1;
    list.sort((a, b) => {
      switch (sortField) {
        case "status":
          return statusOf(a).localeCompare(statusOf(b)) * dir;
        case "plan_id":
        case "patient_id":
        case "patient_name":
        case "protocol":
        case "intent":
          return String(a[sortField]).localeCompare(String(b[sortField])) * dir;
        case "date":
        case "next_cycle_date":
          return (toTime(a[sortField]) - toTime(b[sortField])) * dir;
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

  /* Labs are only meaningful while a plan is still running, and they hang off
     the cycle being treated rather than the highest cycle number. */
  const labCycleIds = currentRows
    .filter((r) => !CLOSED_PLAN_STATUSES.includes(r.raw_status))
    .map((r) => r.current_cycle_id)
    .filter(Boolean);
  const labCycleKey = labCycleIds.join(",");

  useEffect(() => {
    const cycleIds = labCycleKey ? labCycleKey.split(",") : [];
    if (cycleIds.length === 0) return;
    let cancelled = false;

    setLabsLoading((prev) => {
      const next = { ...prev };
      cycleIds.forEach((id) => {
        if (!(id in labs)) next[id] = true;
      });
      return next;
    });

    void Promise.all(
      cycleIds.map(async (cycleId) => {
        try {
          const res = await chemotherapyApi.listLabReviews(cycleId);
          const review = res.data?.data?.[0];
          if (!review) return { cycleId, lab: null as LabValue | null };
          return {
            cycleId,
            lab: {
              hemoglobin: fmtValue(review.hemoglobin),
              wbc: fmtValue(review.wbc),
              platelet: fmtValue(review.platelet_count),
            } as LabValue,
          };
        } catch {
          return { cycleId, lab: null as LabValue | null };
        }
      })
    ).then((results) => {
      if (cancelled) return;
      const next: Record<string, LabValue | null> = {};
      results.forEach(({ cycleId, lab }) => {
        next[cycleId] = lab;
      });
      setLabs((prev) => ({ ...prev, ...next }));
      setLabsLoading((prev) => {
        const n = { ...prev };
        results.forEach(({ cycleId }) => delete n[cycleId]);
        return n;
      });
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labCycleKey]);

  const handleExport = (exportFormat: string) => {
    const source = sortedData;
    const rowsForExport = source.map((r) => ({
      ...r,
      status: statusOf(r),
      lab: labs[r.current_cycle_id] ?? null,
      lab_label: labs[r.current_cycle_id]
        ? `HB ${labs[r.current_cycle_id]?.hemoglobin} / WBC ${labs[r.current_cycle_id]?.wbc} / PLT ${labs[r.current_cycle_id]?.platelet}`
        : "Pending",
    }));
    if (exportFormat === "pdf") {
      downloadExportPdf({
        title: "Chemotherapy Orders",
        subtitle: `${rowsForExport.length} order${rowsForExport.length === 1 ? "" : "s"} - exported on ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
        filename: `chemotherapy-orders-${format(new Date(), "yyyy-MM-dd")}.pdf`,
        columns: [
          { header: "Date", cell: (r: any) => fmtDate(r.date) },
          { header: "Patient ID", cell: (r: any) => r.patient_id },
          { header: "Patient Name", cell: (r: any) => r.patient_name },
          { header: "Intent", cell: (r: any) => r.intent },
          { header: "Protocol", cell: (r: any) => r.protocol },
          { header: "Cycle/Day", cell: (r: any) => r.cycle_label },
          { header: "Cycles Done", cell: (r: any) => r.cycles_label },
          { header: "Next Cycle Date", cell: (r: any) => fmtDate(r.next_cycle_date) },
          { header: "Lab Status", cell: (r: any) => r.lab_label },
          { header: "Status", cell: (r: any) => r.status },
        ],
        rows: rowsForExport,
      });
      toast({ title: "Export complete", description: "The PDF file has been downloaded." });
      return;
    }
    if (exportFormat !== "csv") return;
    try {
      const header = ["Date", "Patient ID", "Patient Name", "Intent", "Protocol", "Cycle/Day", "Cycles Done", "Next Cycle Date", "Lab Status", "Status"];
      const lines = rowsForExport.map((r) =>
        [
          fmtDate(r.date),
          r.patient_id,
          r.patient_name,
          r.intent,
          r.protocol,
          r.cycle_label,
          r.cycles_label,
          fmtDate(r.next_cycle_date),
          r.lab_label,
          r.status,
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
      a.download = `chemotherapy-orders-${format(new Date(), "yyyy-MM-dd")}.csv`;
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

  const statCards = [
    { label: "Active Chemo Orders", value: stats.active, trend: "Currently scheduled / running", icon: HeartPulse, color: "#004785" },
    { label: "Patients Under Treatment", value: stats.patients, trend: "On active plans", icon: UserRound, color: "#059669" },
    { label: "Orders Due Today", value: stats.dueToday, trend: "Next cycle falls today", icon: CalendarDays, color: "#F59E0B" },
    { label: "Delayed", value: stats.delayed, trend: "Past due next-cycle dates", icon: Clock, color: "#EF4444" },
    { label: "Total Orders", value: stats.total, trend: `${stats.completed} completed`, icon: FileText, color: "#6B7280" },
  ];

  return (
    <div className="flex w-full font-[Manrope,sans-serif] bg-[#F7F9FB] min-h-screen">
      <div className="flex flex-col flex-1 min-w-0">
        <main className="flex flex-col gap-6">

          {/* ==================== HEADER ==================== */}
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h1 className="hms-heading">Chemotherapy Orders</h1>
              <p className="hms-subheading">Track chemotherapy orders, cycle scheduling, lab readiness and treatment status across patients.</p>
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
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            {statCards.map((card) => (
              <div key={card.label} className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#6B7280]">{card.label}</span>
                  <card.icon className="w-4 h-4" style={{ color: card.color }} />
                </div>
                <div className="mt-2 text-3xl font-bold text-[#191C1E]">{card.value}</div>
                <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-[#059669]">
                  <TrendingUp className="w-3 h-3" />
                  {card.trend}
                </div>
              </div>
            ))}
          </div>

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
                <div className="flex items-center gap-1 bg-[#F2F4F6] rounded-lg p-1">
                  {STATUS_TABS.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => { setStatusFilter(tab); setCurrentPage(1); }}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                        statusFilter === tab
                          ? "bg-white text-[#00488D] shadow-sm"
                          : "text-[#6B7280] hover:text-[#00488D]"
                      }`}
                    >
                      {tab === "All" ? "All" : tab}
                      {tab === "All" ? ` (${rows.length})` : ` (${rows.filter((r) => statusOf(r) === tab).length})`}
                    </button>
                  ))}
                </div>
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
              /* Flex column + [&>div]:flex-1 stretches HmsTable's root so the
                 mt-auto pagination footer stays pinned to the bottom of the
                 card (the wrapper keeps a 450px min-height even with few
                 rows) — same behavior as Dashboard/Staff. */
              <div className="flex-1 flex flex-col min-h-[450px] hide-scrollbar [&>div]:flex-1">
                <HmsTable
                  scrollable={true}
                  minWidth="1200px"
                  columns={[
                    {
                      key: "date",
                      label: "Date",
                      sortable: true,
                      render: (r: any) => {
                        const row = r as OrderRow;
                        return (
                          <div>
                            <div className="hms-content-text text-[#191C1E] leading-4">{fmtDate(row.date)}</div>
                            <div className="hms-id-text">{row.plan_id}</div>
                          </div>
                        );
                      },
                    },
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
                      key: "intent",
                      label: "Intent of Treatment",
                      sortable: true,
                      render: (r: any) => (
                        <span className="hms-content-text text-[#191C1E] leading-4">{(r as OrderRow).intent}</span>
                      ),
                    },
                    {
                      key: "protocol",
                      label: "Protocol",
                      sortable: true,
                      render: (r: any) => {
                        const row = r as OrderRow;
                        return (
                          <div>
                            <div className="hms-name-text">{row.protocol}</div>
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
                      key: "lab",
                      label: "Lab Status (HB/WBC/PLT)",
                      sortable: false,
                      render: (r: any) => {
                        const row = r as OrderRow;
                        return (
                          <LabStatusCell
                            lab={labs[row.current_cycle_id]}
                            pending={!!labsLoading[row.current_cycle_id]}
                          />
                        );
                      },
                    },
                    {
                      key: "status",
                      label: "Status",
                      sortable: true,
                      render: (r: any) => <StatusBadge status={statusOf(r as OrderRow)} />,
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
                          <OrderActionMenu
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
                                  { header: "Intent", cell: () => row.intent },
                                  { header: "Protocol", cell: () => row.protocol },
                                  { header: "Cycle/Day", cell: () => row.cycle_label },
                                  { header: "Cycles Done", cell: () => row.cycles_label },
                                  { header: "Next Cycle Date", cell: () => fmtDate(row.next_cycle_date) },
                                  { header: "Status", cell: () => statusOf(row) },
                                ],
                                rows: single,
                              });
                              toast({ title: "Export complete", description: "The order PDF has been downloaded." });
                            }}
                          />
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
                  rowsPerPageOptions={[10, 20, 50]}
                  emptyMessage="No orders found matching the current filters."
                  rowKey={(r: any) => String((r as OrderRow).plan_id)}
                />
              </div>
            )}
          </div>

          {/* ==================== BOTTOM CARDS ==================== */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

            {/* LAB READINESS */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#191C1E]">Lab Readiness</h3>
                <FlaskConical className="w-4 h-4 text-[#004785]" />
              </div>
              <div className="mt-4 flex flex-col gap-4">
                {rows
                  .filter((r) => statusOf(r) === "Labs Pending")
                  .slice(0, 5)
                  .map((r) => (
                    <div key={r.plan_id}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#424752] truncate">{r.patient_name}</span>
                        <span className="font-bold text-[#B45309]">{r.protocol}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full bg-[#F2F4F6] rounded-full overflow-hidden">
                        <div className="h-full bg-[#F59E0B] rounded-full" style={{ width: "35%" }} />
                      </div>
                    </div>
                  ))}
                {rows.filter((r) => statusOf(r) === "Labs Pending").length === 0 && (
                  <p className="text-xs text-[#6B7280]">No orders awaiting lab results. All good.</p>
                )}
              </div>
            </div>

            {/* UPCOMING CYCLES */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#191C1E]">Upcoming Cycles</h3>
                <CalendarDays className="w-4 h-4 text-[#004785]" />
              </div>
              <div className="mt-4 flex flex-col gap-3">
                {rows
                  .filter((r) => statusOf(r) === "Scheduled" || statusOf(r) === "In Progress" || statusOf(r) === "Labs Pending")
                  .sort((a, b) => toTime(a.next_cycle_date) - toTime(b.next_cycle_date))
                  .filter((r) => r.next_cycle_date && r.next_cycle_date !== "—")
                  .slice(0, 5)
                  .map((r) => (
                    <div key={r.plan_id} className="flex items-center justify-between gap-3 py-1.5 border-b border-[#F2F4F6] last:border-0">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#191C1E] truncate">{r.patient_name}</div>
                        <div className="hms-id-text">{r.protocol} · {r.cycle_label}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={statusOf(r)} />
                        <span className="text-[10px] font-semibold text-[#6B7280]">{fmtDate(r.next_cycle_date)}</span>
                      </div>
                    </div>
                  ))}
                {rows.filter((r) => r.next_cycle_date && r.next_cycle_date !== "—").length === 0 && (
                  <p className="text-xs text-[#6B7280]">No upcoming cycles scheduled.</p>
                )}
              </div>
            </div>

            {/* STATUS SNAPSHOT */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#191C1E]">Order Status Snapshot</h3>
                <CheckCircle2 className="w-4 h-4 text-[#004785]" />
              </div>
              <div className="mt-4 flex flex-col gap-3">
                {(["Scheduled", "In Progress", "Labs Pending", "Held", "Completed", "Cancelled"] as OrderStatus[]).map((s) => {
                  const count = rows.filter((r) => statusOf(r) === s).length;
                  const pct = rows.length ? Math.round((count / rows.length) * 100) : 0;
                  return (
                    <div key={s} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={s} />
                        <span className="text-xs font-semibold text-[#6B7280]">{count}</span>
                      </div>
                      <div className="flex-1 mx-3">
                        <div className="h-1.5 w-full bg-[#F2F4F6] rounded-full overflow-hidden">
                          <div className="h-full bg-[#004785] rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-[#424752] w-8 text-right">{pct}%</span>
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

        </main>
      </div>
    </div>
  );
}