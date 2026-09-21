import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getUser, remove } from "@/utils/token";
import { toast } from "@/hooks/use-toast";

interface ReportItem {
  id: string;
  reportId: string;
  requestId: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  testPanel: string;
  generatedDate: string;
  status: "GENERATED" | "UNDER_REVIEW" | "DRAFT" | "CRITICAL";
  findingsSummary: string;
}

const INITIAL_REPORTS: ReportItem[] = [
  {
    id: "rep-1",
    reportId: "REP-2026-001",
    requestId: "TRF1256",
    patientId: "P000123",
    patientName: "Rahul Sharma",
    doctorName: "Dr. Sharma",
    testPanel: "Complete Blood Count & Liver Function",
    generatedDate: "20 May 2024 11:30 AM",
    status: "GENERATED",
    findingsSummary: "All parameters within normal clinical reference ranges.",
  },
  {
    id: "rep-2",
    reportId: "REP-2026-002",
    requestId: "TRF1257",
    patientId: "P000124",
    patientName: "Priya",
    doctorName: "Dr. Patel",
    testPanel: "Kidney Function Test (KFT)",
    generatedDate: "30 Mar 2026 12:15 PM",
    status: "GENERATED",
    findingsSummary: "Normal Serum Creatinine and Blood Urea levels.",
  },
  {
    id: "rep-3",
    reportId: "REP-2026-003",
    requestId: "TRF1258",
    patientId: "P000125",
    patientName: "Praveen Singh",
    doctorName: "Dr. Rao",
    testPanel: "Lipid Profile & Glucose Fasting",
    generatedDate: "03 Apr 2026 11:50 AM",
    status: "CRITICAL",
    findingsSummary: "Severe hypertriglyceridemia flagged. Urgent doctor notification advised.",
  },
  {
    id: "rep-4",
    reportId: "REP-2026-004",
    requestId: "TRF1259",
    patientId: "P000126",
    patientName: "Naziya",
    doctorName: "Dr. Sharma",
    testPanel: "Thyroid Profile (T3, T4, TSH)",
    generatedDate: "05 Apr 2026 10:55 AM",
    status: "UNDER_REVIEW",
    findingsSummary: "Awaiting Pathologist signature and hormone value confirmation.",
  },
  {
    id: "rep-5",
    reportId: "REP-2026-005",
    requestId: "TRF1260",
    patientId: "P000127",
    patientName: "Meena Kumari",
    doctorName: "Dr. Verma",
    testPanel: "Electrolytes & Arterial Blood Gas",
    generatedDate: "10 Apr 2026 09:40 AM",
    status: "DRAFT",
    findingsSummary: "Preliminary analyzer readings imported; awaiting technician review.",
  },
];

export default function ReportGeneration() {
  const navigate = useNavigate();
  const currentUser = getUser();
  const displayName = currentUser?.username || "Labtech";
  const displayRole =
    currentUser?.role_type === "LAB_TECHNICIAN"
      ? "Lab Technician"
      : currentUser?.role_type || "Lab Technician";

  const handleLogout = () => {
    remove();
    navigate("/", { replace: true });
  };

  const [activeNav, setActiveNav] = useState("Report Generation");
  const [reports, setReports] = useState<ReportItem[]>(INITIAL_REPORTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "GENERATED" | "UNDER_REVIEW" | "DRAFT" | "CRITICAL"
  >("ALL");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [quickRequestId, setQuickRequestId] = useState("");

  const handleGenerateReport = (id: string) => {
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "GENERATED" } : r)),
    );
    toast({
      title: "Report Generated",
      description: "Diagnostic report compiled and certified for dispatch.",
    });
  };

  const handlePrintReport = (report: ReportItem) => {
    toast({
      title: "Printing Diagnostic Report",
      description: `Sending report ${report.reportId} for ${report.patientName} to printer.`,
    });
  };

  const handleQuickGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickRequestId.trim()) return;
    const match = reports.find(
      (r) =>
        r.requestId.toLowerCase() === quickRequestId.trim().toLowerCase() ||
        r.patientName.toLowerCase().includes(quickRequestId.trim().toLowerCase()),
    );
    if (match) {
      handleGenerateReport(match.id);
      setQuickRequestId("");
    } else {
      toast({
        title: "Requisition Not Found",
        description: `No lab requisition found for "${quickRequestId}".`,
        variant: "destructive",
      });
    }
  };

  const filteredReports = useMemo(() => {
    return reports.filter((rep) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        rep.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rep.requestId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rep.reportId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rep.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rep.testPanel.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" || rep.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [reports, searchQuery, statusFilter]);

  const generatedCount = useMemo(
    () => reports.filter((r) => r.status === "GENERATED").length,
    [reports],
  );
  const reviewCount = useMemo(
    () => reports.filter((r) => r.status === "UNDER_REVIEW").length,
    [reports],
  );
  const draftCount = useMemo(
    () => reports.filter((r) => r.status === "DRAFT").length,
    [reports],
  );
  const criticalCount = useMemo(
    () => reports.filter((r) => r.status === "CRITICAL").length,
    [reports],
  );

  return (
    <div className="min-h-screen flex bg-[#f8fafd] text-[#1e293b] antialiased selection:bg-blue-100 font-sans">
      {/* BEGIN: LeftSidebar */}
      <aside
        className="w-[260px] bg-[#f0f4f9] flex-shrink-0 flex flex-col justify-between border-r border-[#e2e8f0] select-none min-h-screen fixed inset-y-0 left-0 z-20"
        data-purpose="sidebar-navigation"
      >
        {/* Top Part: Logo & Primary Nav */}
        <div>
          {/* Brand Logo Section */}
          <div className="px-7 pt-7 pb-6">
            <h1 className="text-xl font-bold text-[#0b57d0] tracking-tight">
              HMS
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Admin Portal
            </p>
          </div>

          {/* Navigation Links */}
          <nav className="mt-2 space-y-1.5 px-3">
            {/* Dashboard */}
            <button
              type="button"
              onClick={() => navigate("/lab/dashboard")}
              className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                activeNav === "Dashboard"
                  ? "bg-[#004bb5] text-white shadow-sm"
                  : "text-[#334155] hover:bg-slate-200/60"
              }`}
            >
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M3 3h8v8H3V3zm10 0h8v5h-8V3zm0 7h8v11h-8V10zm-10 3h8v8H3v-8z" />
              </svg>
              <span>Dashboard</span>
            </button>

            {/* Samples Verification */}
            <button
              type="button"
              onClick={() => navigate("/lab/sample-verification")}
              className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                activeNav === "Samples Verification"
                  ? "bg-[#004bb5] text-white shadow-sm"
                  : "text-[#334155] hover:bg-slate-200/60"
              }`}
            >
              <svg
                className="w-5 h-5 flex-shrink-0 stroke-[#475569]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <path
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Samples Verification</span>
            </button>

            {/* Testing Samples */}
            <button
              type="button"
              onClick={() => navigate("/lab/testing-samples")}
              className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                activeNav === "Testing Samples"
                  ? "bg-[#004bb5] text-white shadow-sm"
                  : "text-[#334155] hover:bg-slate-200/60"
              }`}
            >
              <svg
                className="w-5 h-5 flex-shrink-0 stroke-[#475569]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <path
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Testing Samples</span>
            </button>

            {/* Report Generation */}
            <button
              type="button"
              onClick={() => setActiveNav("Report Generation")}
              className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                activeNav === "Report Generation"
                  ? "bg-[#004bb5] text-white shadow-sm"
                  : "text-[#334155] hover:bg-slate-200/60"
              }`}
            >
              <svg
                className="w-5 h-5 flex-shrink-0 stroke-[#475569]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <path
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Report Generation</span>
            </button>

            {/* Report Transfer */}
            <button
              type="button"
              onClick={() => navigate("/lab/report-transfer")}
              className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                activeNav === "Report Transfer"
                  ? "bg-[#004bb5] text-white shadow-sm"
                  : "text-[#334155] hover:bg-slate-200/60"
              }`}
            >
              <svg
                className="w-5 h-5 flex-shrink-0 stroke-[#475569]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Report Transfer</span>
            </button>

            {/* Patient Registration */}
            <button
              type="button"
              onClick={() => navigate("/lab/dashboard")}
              className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                activeNav === "Patient Registration"
                  ? "bg-[#004bb5] text-white shadow-sm"
                  : "text-[#334155] hover:bg-slate-200/60"
              }`}
            >
              <svg
                className="w-5 h-5 flex-shrink-0 stroke-[#475569]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <path
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Patient Registration</span>
            </button>

            {/* Inventory */}
            <button
              type="button"
              onClick={() => navigate("/lab/dashboard")}
              className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                activeNav === "Inventory"
                  ? "bg-[#004bb5] text-white shadow-sm"
                  : "text-[#334155] hover:bg-slate-200/60"
              }`}
            >
              <svg
                className="w-5 h-5 flex-shrink-0 stroke-[#475569]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <path
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Inventory</span>
            </button>
          </nav>
        </div>

        {/* Bottom Part: Settings & Support & Technician Profile */}
        <div className="p-3 border-t border-[#e2e8f0] space-y-1">
          <a
            className="flex items-center gap-3.5 px-4 py-2 text-sm font-medium text-[#334155] hover:bg-slate-200/60 rounded-lg transition-colors"
            href="#settings"
            onClick={(e) => e.preventDefault()}
          >
            <svg
              className="w-5 h-5 flex-shrink-0 stroke-[#475569]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <path
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Settings</span>
          </a>
          <a
            className="flex items-center gap-3.5 px-4 py-2 text-sm font-medium text-[#334155] hover:bg-slate-200/60 rounded-lg transition-colors"
            href="#support"
            onClick={(e) => e.preventDefault()}
          >
            <svg
              className="w-5 h-5 flex-shrink-0 stroke-[#475569]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <path
                d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Support</span>
          </a>

          {/* Technician User Card & Logout */}
          <div className="pt-4 mt-2 border-t border-slate-200/80 px-2 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#0b57d0] text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col text-left truncate">
                <span className="text-xs font-semibold text-slate-800 leading-tight truncate">
                  {displayName}
                </span>
                <span className="text-[10px] text-slate-500 leading-tight truncate">
                  {displayRole}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </aside>
      {/* END: LeftSidebar */}

      {/* Main Content Area */}
      <div className="flex-1 ml-[260px] min-h-screen flex flex-col min-w-0 bg-[#f8fafd]">
        {/* TopNavbar */}
        <header
          className="h-20 bg-white border-b border-slate-100 px-10 flex items-center justify-between sticky top-0 z-10"
          data-purpose="dashboard-header"
        >
          {/* Title & Back link */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/lab/dashboard")}
              className="p-1.5 -ml-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Back to Dashboard"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Report Generation
            </h1>
          </div>

          <div className="flex items-center gap-6">
            {/* Notification Bell with Counter */}
            <div className="relative cursor-pointer hover:opacity-80 transition-opacity">
              <svg
                className="w-6 h-6 text-slate-600 stroke-[1.8]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="absolute -top-1.5 -right-1.5 bg-[#e05252] text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                4
              </span>
            </div>

            {/* Role Label & Profile Avatar & Logout */}
            <div className="flex items-center gap-3 pl-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#0b57d0] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-800 leading-tight">
                    {displayName}
                  </span>
                  <span className="text-[10px] text-slate-500 leading-tight">
                    {displayRole}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* DashboardBody */}
        <main className="flex-1 p-8 lg:p-10 space-y-8 max-w-[1600px] w-full mx-auto">
          {/* StatCardsRow */}
          <section
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5"
            data-purpose="kpi-metric-cards"
          >
            {/* Card 1: Reports Generated */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)] flex items-center gap-5">
              <div className="w-14 h-14 rounded-full bg-[#def7ec] flex items-center justify-center shrink-0">
                <svg
                  className="w-6 h-6 text-[#059669] stroke-[2.5]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <span className="text-[13px] font-semibold text-[#059669]">
                  Reports Ready
                </span>
                <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-0.5">
                  {generatedCount}
                </h3>
                <p className="text-[12px] text-slate-400 font-normal mt-0.5">
                  Certified &amp; signed off
                </p>
              </div>
            </div>

            {/* Card 2: Under Pathologist Review */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)] flex items-center gap-5">
              <div className="w-14 h-14 rounded-full bg-[#e0edff] flex items-center justify-center shrink-0">
                <svg
                  className="w-6 h-6 text-[#2563eb] stroke-[2.2]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <span className="text-[13px] font-semibold text-[#2563eb]">
                  Under Review
                </span>
                <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-0.5">
                  {reviewCount}
                </h3>
                <p className="text-[12px] text-slate-400 font-normal mt-0.5">
                  Awaiting pathologist sign
                </p>
              </div>
            </div>

            {/* Card 3: Draft Reports */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)] flex items-center gap-5">
              <div className="w-14 h-14 rounded-full bg-[#fef3c7] flex items-center justify-center shrink-0">
                <svg
                  className="w-6 h-6 text-[#d97706] stroke-[2.2]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <span className="text-[13px] font-semibold text-[#d97706]">
                  Draft Reports
                </span>
                <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-0.5">
                  {draftCount}
                </h3>
                <p className="text-[12px] text-slate-400 font-normal mt-0.5">
                  Pending test completion
                </p>
              </div>
            </div>

            {/* Card 4: Critical Findings */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)] flex items-center gap-5">
              <div className="w-14 h-14 rounded-full bg-[#fee2e2] flex items-center justify-center shrink-0">
                <svg
                  className="w-6 h-6 text-[#dc2626] stroke-[2.2]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <span className="text-[13px] font-semibold text-[#dc2626]">
                  Critical Reports
                </span>
                <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-0.5">
                  {criticalCount}
                </h3>
                <p className="text-[12px] text-slate-400 font-normal mt-0.5">
                  Urgent doctor alert needed
                </p>
              </div>
            </div>
          </section>

          {/* Quick Generate Report Card */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-[#0b57d0]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span>Fast Diagnostic Report Compilation</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Compile patient laboratory values into certified PDF report ready for doctor review.
              </p>
            </div>
            <form
              onSubmit={handleQuickGenerate}
              className="flex items-center gap-2.5 w-full sm:w-auto"
            >
              <input
                type="text"
                value={quickRequestId}
                onChange={(e) => setQuickRequestId(e.target.value)}
                placeholder="Enter Requisition ID (e.g. TRF1256)..."
                className="w-full sm:w-80 px-4 py-2 border border-slate-200 rounded-lg text-[13px] text-slate-700 font-mono placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
              <button
                type="submit"
                className="px-6 py-2 bg-[#00875A] hover:bg-[#00744E] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer shrink-0"
              >
                Compile Report
              </button>
            </form>
          </section>

          {/* TableContainerCard */}
          <section
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            data-purpose="reports-details-container"
          >
            {/* Header & Action Controls Bar */}
            <div className="px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-[20px] font-bold text-slate-800">
                  Diagnostic Reports Catalog
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Review generated laboratory test findings, download formatted PDF reports, and approve release
                </p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {/* Search Bar */}
                <div className="relative w-full sm:w-[320px]">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg
                      className="w-4 h-4 text-slate-400 stroke-[2]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-[13px] text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Search Patient, Report ID, Doctor..."
                    type="text"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Filter Button & Dropdown */}
                <div className="relative shrink-0">
                  <button
                    onClick={() => setIsFilterDropdownOpen((prev) => !prev)}
                    className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-[13px] font-medium transition-colors ${
                      statusFilter !== "ALL"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                    type="button"
                  >
                    <svg
                      className="w-4 h-4 text-slate-500 stroke-[2]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>
                      {statusFilter === "ALL" ? "Filter" : statusFilter}
                    </span>
                  </button>

                  {isFilterDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1.5 text-[13px]">
                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter("ALL");
                          setIsFilterDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between ${
                          statusFilter === "ALL"
                            ? "font-semibold text-blue-600 bg-blue-50/50"
                            : "text-slate-700"
                        }`}
                      >
                        <span>All ({reports.length})</span>
                        {statusFilter === "ALL" && <span>✓</span>}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter("GENERATED");
                          setIsFilterDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between ${
                          statusFilter === "GENERATED"
                            ? "font-semibold text-[#15803d] bg-green-50/50"
                            : "text-slate-700"
                        }`}
                      >
                        <span>Generated ({generatedCount})</span>
                        {statusFilter === "GENERATED" && <span>✓</span>}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter("UNDER_REVIEW");
                          setIsFilterDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between ${
                          statusFilter === "UNDER_REVIEW"
                            ? "font-semibold text-blue-600 bg-blue-50/50"
                            : "text-slate-700"
                        }`}
                      >
                        <span>Under Review ({reviewCount})</span>
                        {statusFilter === "UNDER_REVIEW" && <span>✓</span>}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter("CRITICAL");
                          setIsFilterDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between ${
                          statusFilter === "CRITICAL"
                            ? "font-semibold text-[#b91c1c] bg-red-50/50"
                            : "text-slate-700"
                        }`}
                      >
                        <span>Critical ({criticalCount})</span>
                        {statusFilter === "CRITICAL" && <span>✓</span>}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter("DRAFT");
                          setIsFilterDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between ${
                          statusFilter === "DRAFT"
                            ? "font-semibold text-[#854d0e] bg-yellow-50/50"
                            : "text-slate-700"
                        }`}
                      >
                        <span>Draft ({draftCount})</span>
                        {statusFilter === "DRAFT" && <span>✓</span>}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto">
              <table
                className="w-full text-left border-collapse"
                id="reports-catalog-table"
              >
                <thead>
                  <tr className="border-t border-b border-slate-200 text-[11px] font-bold tracking-wider text-slate-600 uppercase bg-transparent">
                    <th className="py-4 px-8 font-bold" scope="col">
                      REPORT &amp; REQUISITION
                    </th>
                    <th className="py-4 px-6 font-bold" scope="col">
                      PATIENT NAME
                    </th>
                    <th className="py-4 px-6 font-bold" scope="col">
                      DOCTOR
                    </th>
                    <th className="py-4 px-6 font-bold" scope="col">
                      TEST PANEL &amp; FINDINGS
                    </th>
                    <th
                      className="py-4 px-6 font-bold text-center"
                      scope="col"
                    >
                      DATE GENERATED
                    </th>
                    <th
                      className="py-4 px-8 font-bold text-center"
                      scope="col"
                    >
                      STATUS
                    </th>
                    <th
                      className="py-4 px-6 font-bold text-center"
                      scope="col"
                    >
                      ACTION
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[13px] font-medium text-slate-600">
                  {filteredReports.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-10 text-center text-slate-400 text-sm"
                      >
                        No diagnostic reports found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredReports.map((r) => (
                      <tr
                        key={r.id}
                        className="hover:bg-blue-50/40 transition-colors group"
                      >
                        <td className="py-4 px-8">
                          <span className="font-semibold text-slate-900 font-mono block">
                            {r.reportId}
                          </span>
                          <span className="font-mono text-blue-600 text-xs font-semibold">
                            {r.requestId}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-semibold text-slate-900 block">
                            {r.patientName}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {r.patientId}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-700 font-medium text-xs">
                          {r.doctorName}
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-semibold text-slate-800 block">
                            {r.testPanel}
                          </span>
                          <span className="text-[11px] text-slate-500 block truncate max-w-xs">
                            {r.findingsSummary}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center text-slate-600 font-mono text-xs">
                          {r.generatedDate}
                        </td>
                        <td className="py-4 px-8 text-center">
                          {r.status === "GENERATED" ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#def7ec] text-[#03543f]">
                              GENERATED
                            </span>
                          ) : r.status === "UNDER_REVIEW" ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#e0edff] text-[#2563eb]">
                              UNDER REVIEW
                            </span>
                          ) : r.status === "CRITICAL" ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#fee2e2] text-[#991b1b]">
                              CRITICAL
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#fef3c7] text-[#92400e]">
                              DRAFT
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {r.status === "DRAFT" || r.status === "UNDER_REVIEW" ? (
                              <button
                                type="button"
                                onClick={() => handleGenerateReport(r.id)}
                                className="px-3 py-1.5 bg-[#00875A] hover:bg-[#00744E] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                              >
                                Certify
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handlePrintReport(r)}
                                className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-600 hover:text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1"
                              >
                                <span>PDF</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => navigate("/lab/report-transfer")}
                              className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                              title="Transfer to Doctor / EMR"
                            >
                              Dispatch
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

