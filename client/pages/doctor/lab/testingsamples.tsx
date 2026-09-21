import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getUser, remove } from "@/utils/token";
import { toast } from "@/hooks/use-toast";

interface TestingSampleItem {
  id: string;
  sampleId: string;
  barcode: string;
  patientId: string;
  patientName: string;
  testName: string;
  analyzerBench: string;
  startTime: string;
  estimatedCompletion: string;
  status: "RUNNING" | "COMPLETED" | "CALIBRATING" | "FLAGGED";
  criticalAlert?: string;
  testResult?: string;
}

const INITIAL_TESTING_SAMPLES: TestingSampleItem[] = [
  {
    id: "ts-1",
    sampleId: "SMP-001",
    barcode: "BC2405200001",
    patientId: "P000123",
    patientName: "Rahul Sharma",
    testName: "Complete Blood Count (CBC)",
    analyzerBench: "Sysmex XN-1000 (Hematology)",
    startTime: "10:45 AM",
    estimatedCompletion: "11:15 AM",
    status: "RUNNING",
  },
  {
    id: "ts-2",
    sampleId: "SMP-002",
    barcode: "BC2405200002",
    patientId: "P000123",
    patientName: "Rahul Sharma",
    testName: "Liver Function Test (LFT)",
    analyzerBench: "Cobas 6000 (Biochemistry)",
    startTime: "10:35 AM",
    estimatedCompletion: "11:05 AM",
    status: "COMPLETED",
    testResult: "Bilirubin: 0.9 mg/dL, SGOT: 34 U/L, SGPT: 29 U/L",
  },
  {
    id: "ts-3",
    sampleId: "SMP-003",
    barcode: "BC2405200003",
    patientId: "P000124",
    patientName: "Priya",
    testName: "Kidney Function Test (KFT)",
    analyzerBench: "Cobas 6000 (Biochemistry)",
    startTime: "11:35 AM",
    estimatedCompletion: "12:00 PM",
    status: "COMPLETED",
    testResult: "Creatinine: 0.8 mg/dL, Urea: 22 mg/dL",
  },
  {
    id: "ts-4",
    sampleId: "SMP-004",
    barcode: "BC2405200004",
    patientId: "P000125",
    patientName: "Praveen Singh",
    testName: "Lipid Profile",
    analyzerBench: "Beckman Coulter AU480",
    startTime: "11:00 AM",
    estimatedCompletion: "11:45 AM",
    status: "FLAGGED",
    criticalAlert: "High Triglycerides (> 450 mg/dL)",
    testResult: "Cholesterol: 245 mg/dL, Triglycerides: 480 mg/dL",
  },
  {
    id: "ts-5",
    sampleId: "SMP-006",
    barcode: "BC2405200006",
    patientId: "P000127",
    patientName: "Meena Kumari",
    testName: "Electrolytes (Na+, K+, Cl-)",
    analyzerBench: "Roche 9180 Electrolyte Analyzer",
    startTime: "11:10 AM",
    estimatedCompletion: "11:25 AM",
    status: "CALIBRATING",
  },
  {
    id: "ts-6",
    sampleId: "SMP-007",
    barcode: "BC2405200007",
    patientId: "P000128",
    patientName: "Vikram Malhotra",
    testName: "HbA1c Glycated Hemoglobin",
    analyzerBench: "Bio-Rad D-10 HPLC",
    startTime: "11:20 AM",
    estimatedCompletion: "11:50 AM",
    status: "RUNNING",
  },
];

export default function TestingSamples() {
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

  const [activeNav, setActiveNav] = useState("Testing Samples");
  const [samples, setSamples] = useState<TestingSampleItem[]>(
    INITIAL_TESTING_SAMPLES,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "RUNNING" | "COMPLETED" | "FLAGGED" | "CALIBRATING"
  >("ALL");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [quickInputBarcode, setQuickInputBarcode] = useState("");

  const handleMarkCompleted = (id: string) => {
    const resultVal = prompt(
      "Enter or confirm analyzer test results:",
      "Within Normal Clinical Range (Auto-Validated)",
    );
    if (resultVal) {
      setSamples((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, status: "COMPLETED", testResult: resultVal } : s,
        ),
      );
      toast({
        title: "Test Run Completed",
        description: "Analyzer results saved and queued for report generation.",
      });
    }
  };

  const handleRerunTest = (id: string) => {
    setSamples((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              status: "RUNNING",
              startTime: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            }
          : s,
      ),
    );
    toast({
      title: "Rerun Initiated",
      description: "Sample queued for secondary analyzer run.",
    });
  };

  const handleQuickRun = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInputBarcode.trim()) return;
    const match = samples.find(
      (s) =>
        s.barcode.toLowerCase() === quickInputBarcode.trim().toLowerCase() ||
        s.sampleId.toLowerCase() === quickInputBarcode.trim().toLowerCase(),
    );
    if (match) {
      handleMarkCompleted(match.id);
      setQuickInputBarcode("");
    } else {
      toast({
        title: "Sample Not Found",
        description: `No testing sample with ID/barcode "${quickInputBarcode}" found in analytical run.`,
        variant: "destructive",
      });
    }
  };

  const filteredSamples = useMemo(() => {
    return samples.filter((sample) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        sample.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sample.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sample.sampleId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sample.testName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sample.analyzerBench.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" || sample.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [samples, searchQuery, statusFilter]);

  const runningCount = useMemo(
    () => samples.filter((s) => s.status === "RUNNING").length,
    [samples],
  );
  const completedCount = useMemo(
    () => samples.filter((s) => s.status === "COMPLETED").length,
    [samples],
  );
  const flaggedCount = useMemo(
    () => samples.filter((s) => s.status === "FLAGGED").length,
    [samples],
  );
  const calibratingCount = useMemo(
    () => samples.filter((s) => s.status === "CALIBRATING").length,
    [samples],
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
              onClick={() => setActiveNav("Testing Samples")}
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
              onClick={() => navigate("/lab/report-generation")}
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
              Testing Samples
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
                3
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
            {/* Card 1: Samples in Analyzer */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)] flex items-center gap-5">
              <div className="w-14 h-14 rounded-full bg-[#e0edff] flex items-center justify-center shrink-0">
                <svg
                  className="w-6 h-6 text-[#2563eb] stroke-[2.2]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <span className="text-[13px] font-semibold text-[#2563eb]">
                  Running in Analyzer
                </span>
                <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-0.5">
                  {runningCount}
                </h3>
                <p className="text-[12px] text-slate-400 font-normal mt-0.5">
                  Active test run batches
                </p>
              </div>
            </div>

            {/* Card 2: Tests Completed */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)] flex items-center gap-5">
              <div className="w-14 h-14 rounded-full bg-[#def7ec] flex items-center justify-center shrink-0">
                <svg
                  className="w-6 h-6 text-[#059669] stroke-[2.5]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M5 13l4 4L19 7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <span className="text-[13px] font-semibold text-[#059669]">
                  Results Completed
                </span>
                <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-0.5">
                  {completedCount}
                </h3>
                <p className="text-[12px] text-slate-400 font-normal mt-0.5">
                  Ready for report generation
                </p>
              </div>
            </div>

            {/* Card 3: Calibrating / Pending */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)] flex items-center gap-5">
              <div className="w-14 h-14 rounded-full bg-[#fef3c7] flex items-center justify-center shrink-0">
                <svg
                  className="w-6 h-6 text-[#d97706] stroke-[2.2]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <span className="text-[13px] font-semibold text-[#d97706]">
                  Calibrating
                </span>
                <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-0.5">
                  {calibratingCount}
                </h3>
                <p className="text-[12px] text-slate-400 font-normal mt-0.5">
                  Bench instrument setup
                </p>
              </div>
            </div>

            {/* Card 4: Flagged / Critical */}
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
                  Flagged / Critical
                </span>
                <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-0.5">
                  {flaggedCount}
                </h3>
                <p className="text-[12px] text-slate-400 font-normal mt-0.5">
                  Out-of-range clinical values
                </p>
              </div>
            </div>
          </section>

          {/* Quick Analyzer Run Card */}
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
                    d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                  />
                </svg>
                <span>Automated Analyzer Results &amp; Validation</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Scan sample barcode to validate analyzer output or submit manual test measurements.
              </p>
            </div>
            <form
              onSubmit={handleQuickRun}
              className="flex items-center gap-2.5 w-full sm:w-auto"
            >
              <input
                type="text"
                value={quickInputBarcode}
                onChange={(e) => setQuickInputBarcode(e.target.value)}
                placeholder="Scan / Enter Barcode (e.g. BC2405200001)..."
                className="w-full sm:w-80 px-4 py-2 border border-slate-200 rounded-lg text-[13px] text-slate-700 font-mono placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
              <button
                type="submit"
                className="px-6 py-2 bg-[#00875A] hover:bg-[#00744E] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer shrink-0"
              >
                Validate Result
              </button>
            </form>
          </section>

          {/* TableContainerCard */}
          <section
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            data-purpose="testing-queue-details"
          >
            {/* Header & Action Controls Bar */}
            <div className="px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-[20px] font-bold text-slate-800">
                  Analytical Testing Queue
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Monitor live analyzer runs, review preliminary test values, and sign off completed tests
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
                    placeholder="Search Patient, Barcode, Analyzer..."
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
                        <span>All ({samples.length})</span>
                        {statusFilter === "ALL" && <span>✓</span>}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter("RUNNING");
                          setIsFilterDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between ${
                          statusFilter === "RUNNING"
                            ? "font-semibold text-blue-600 bg-blue-50/50"
                            : "text-slate-700"
                        }`}
                      >
                        <span>Running ({runningCount})</span>
                        {statusFilter === "RUNNING" && <span>✓</span>}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter("COMPLETED");
                          setIsFilterDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between ${
                          statusFilter === "COMPLETED"
                            ? "font-semibold text-[#15803d] bg-green-50/50"
                            : "text-slate-700"
                        }`}
                      >
                        <span>Completed ({completedCount})</span>
                        {statusFilter === "COMPLETED" && <span>✓</span>}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter("FLAGGED");
                          setIsFilterDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between ${
                          statusFilter === "FLAGGED"
                            ? "font-semibold text-[#b91c1c] bg-red-50/50"
                            : "text-slate-700"
                        }`}
                      >
                        <span>Flagged ({flaggedCount})</span>
                        {statusFilter === "FLAGGED" && <span>✓</span>}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter("CALIBRATING");
                          setIsFilterDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between ${
                          statusFilter === "CALIBRATING"
                            ? "font-semibold text-[#854d0e] bg-yellow-50/50"
                            : "text-slate-700"
                        }`}
                      >
                        <span>Calibrating ({calibratingCount})</span>
                        {statusFilter === "CALIBRATING" && <span>✓</span>}
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
                id="testing-samples-table"
              >
                <thead>
                  <tr className="border-t border-b border-slate-200 text-[11px] font-bold tracking-wider text-slate-600 uppercase bg-transparent">
                    <th className="py-4 px-8 font-bold" scope="col">
                      SAMPLE &amp; BARCODE
                    </th>
                    <th className="py-4 px-6 font-bold" scope="col">
                      PATIENT NAME
                    </th>
                    <th className="py-4 px-6 font-bold" scope="col">
                      TEST PROCEDURE
                    </th>
                    <th className="py-4 px-6 font-bold" scope="col">
                      ANALYZER BENCH
                    </th>
                    <th
                      className="py-4 px-6 font-bold text-center"
                      scope="col"
                    >
                      START / RUN TIME
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
                  {filteredSamples.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-10 text-center text-slate-400 text-sm"
                      >
                        No testing samples found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredSamples.map((s) => (
                      <tr
                        key={s.id}
                        className="hover:bg-blue-50/40 transition-colors group"
                      >
                        <td className="py-4 px-8">
                          <span className="font-semibold text-slate-900 font-mono block">
                            {s.sampleId}
                          </span>
                          <span className="font-mono text-blue-600 text-xs font-semibold">
                            {s.barcode}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-semibold text-slate-900 block">
                            {s.patientName}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {s.patientId}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-medium text-slate-800 block">
                            {s.testName}
                          </span>
                          {s.testResult && (
                            <span className="text-[11px] text-slate-500 block truncate max-w-xs">
                              {s.testResult}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-slate-700 text-xs">
                          {s.analyzerBench}
                        </td>
                        <td className="py-4 px-6 text-center text-slate-600 font-mono text-xs">
                          {s.startTime}
                        </td>
                        <td className="py-4 px-8 text-center">
                          {s.status === "COMPLETED" ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#def7ec] text-[#03543f]">
                              COMPLETED
                            </span>
                          ) : s.status === "RUNNING" ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#e0edff] text-[#2563eb]">
                              RUNNING
                            </span>
                          ) : s.status === "FLAGGED" ? (
                            <span
                              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#fee2e2] text-[#991b1b]"
                              title={s.criticalAlert}
                            >
                              FLAGGED
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#fef3c7] text-[#92400e]">
                              CALIBRATING
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center">
                          {s.status === "RUNNING" && (
                            <button
                              type="button"
                              onClick={() => handleMarkCompleted(s.id)}
                              className="px-3 py-1.5 bg-[#00875A] hover:bg-[#00744E] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                            >
                              Enter Result
                            </button>
                          )}
                          {s.status === "FLAGGED" && (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleRerunTest(s.id)}
                                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                              >
                                Rerun
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMarkCompleted(s.id)}
                                className="px-3 py-1.5 bg-[#00875A] hover:bg-[#00744E] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                              >
                                Approve
                              </button>
                            </div>
                          )}
                          {s.status === "COMPLETED" && (
                            <span className="text-xs font-semibold text-[#059669]">
                              ✓ Result Ready
                            </span>
                          )}
                          {s.status === "CALIBRATING" && (
                            <button
                              type="button"
                              onClick={() => handleRerunTest(s.id)}
                              className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-600 hover:text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                            >
                              Start Run
                            </button>
                          )}
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

