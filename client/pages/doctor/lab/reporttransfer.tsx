import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getUser, remove } from "@/utils/token";
import { toast } from "@/hooks/use-toast";

interface TransferItem {
  id: string;
  dispatchId: string;
  reportId: string;
  patientId: string;
  patientName: string;
  recipient: string;
  channel: "EMR / Doctor" | "Patient SMS / WhatsApp" | "Email PDF" | "ICU / Ward";
  dispatchedAt: string;
  status: "DELIVERED" | "SENT" | "QUEUED" | "FAILED";
  ackDetails?: string;
}

const INITIAL_TRANSFERS: TransferItem[] = [
  {
    id: "tx-1",
    dispatchId: "DSP-9041",
    reportId: "REP-2026-001",
    patientId: "P000123",
    patientName: "Rahul Sharma",
    recipient: "Dr. Sharma (Internal Medicine)",
    channel: "EMR / Doctor",
    dispatchedAt: "11:35 AM",
    status: "DELIVERED",
    ackDetails: "Auto-synced to Doctor EHR consultation note",
  },
  {
    id: "tx-2",
    dispatchId: "DSP-9042",
    reportId: "REP-2026-001",
    patientId: "P000123",
    patientName: "Rahul Sharma",
    recipient: "+91 98765 43210 (Patient)",
    channel: "Patient SMS / WhatsApp",
    dispatchedAt: "11:36 AM",
    status: "DELIVERED",
    ackDetails: "WhatsApp diagnostic link delivered with passcode",
  },
  {
    id: "tx-3",
    dispatchId: "DSP-9043",
    reportId: "REP-2026-002",
    patientId: "P000124",
    patientName: "Priya",
    recipient: "Dr. Patel (Nephrology)",
    channel: "EMR / Doctor",
    dispatchedAt: "12:20 PM",
    status: "DELIVERED",
    ackDetails: "Received and acknowledged in physician portal",
  },
  {
    id: "tx-4",
    dispatchId: "DSP-9044",
    reportId: "REP-2026-003",
    patientId: "P000125",
    patientName: "Praveen Singh",
    recipient: "Emergency & Cardiology Station",
    channel: "ICU / Ward",
    dispatchedAt: "12:00 PM",
    status: "DELIVERED",
    ackDetails: "STAT alert sent directly to duty physician workstation",
  },
  {
    id: "tx-5",
    dispatchId: "DSP-9045",
    reportId: "REP-2026-004",
    patientId: "P000126",
    patientName: "Naziya",
    recipient: "naziya.k@email.com (Patient)",
    channel: "Email PDF",
    dispatchedAt: "11:15 AM",
    status: "QUEUED",
    ackDetails: "Awaiting final pathologist signature before release",
  },
  {
    id: "tx-6",
    dispatchId: "DSP-9046",
    reportId: "REP-2026-005",
    patientId: "P000127",
    patientName: "Meena Kumari",
    recipient: "ICU Ward 3 Bed 12",
    channel: "ICU / Ward",
    dispatchedAt: "09:50 AM",
    status: "FAILED",
    ackDetails: "Network socket timeout to Ward HL7 listener. Retry scheduled.",
  },
];

export default function ReportTransfer() {
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

  const [activeNav, setActiveNav] = useState("Report Transfer");
  const [transfers, setTransfers] = useState<TransferItem[]>(INITIAL_TRANSFERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "DELIVERED" | "SENT" | "QUEUED" | "FAILED"
  >("ALL");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [batchRecipient, setBatchRecipient] = useState("");

  const handleResend = (id: string) => {
    setTransfers((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status: "DELIVERED",
              dispatchedAt: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              ackDetails: "Successfully re-transmitted and acknowledged.",
            }
          : t,
      ),
    );
    toast({
      title: "Dispatch Successful",
      description: "Report transmitted to recipient EMR/channel.",
    });
  };

  const handleBatchSync = (e: React.FormEvent) => {
    e.preventDefault();
    setTransfers((prev) =>
      prev.map((t) => (t.status === "QUEUED" || t.status === "FAILED" ? { ...t, status: "DELIVERED", dispatchedAt: "Just now" } : t)),
    );
    toast({
      title: "Batch EMR Sync Completed",
      description: "All queued and pending laboratory reports have been pushed to EMR.",
    });
  };

  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        t.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.reportId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.dispatchId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.channel.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" || t.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [transfers, searchQuery, statusFilter]);

  const deliveredCount = useMemo(
    () => transfers.filter((t) => t.status === "DELIVERED").length,
    [transfers],
  );
  const sentCount = useMemo(
    () => transfers.filter((t) => t.status === "SENT").length,
    [transfers],
  );
  const queuedCount = useMemo(
    () => transfers.filter((t) => t.status === "QUEUED").length,
    [transfers],
  );
  const failedCount = useMemo(
    () => transfers.filter((t) => t.status === "FAILED").length,
    [transfers],
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
              onClick={() => setActiveNav("Report Transfer")}
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
              Report Transfer
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
                1
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
            {/* Card 1: Transferred & Delivered */}
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
                  Delivered to EMR
                </span>
                <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-0.5">
                  {deliveredCount}
                </h3>
                <p className="text-[12px] text-slate-400 font-normal mt-0.5">
                  Doctor workstation synced
                </p>
              </div>
            </div>

            {/* Card 2: Sent via SMS/Email */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)] flex items-center gap-5">
              <div className="w-14 h-14 rounded-full bg-[#e0edff] flex items-center justify-center shrink-0">
                <svg
                  className="w-6 h-6 text-[#2563eb] stroke-[2.2]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <span className="text-[13px] font-semibold text-[#2563eb]">
                  Patient SMS/Email
                </span>
                <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-0.5">
                  {sentCount + deliveredCount}
                </h3>
                <p className="text-[12px] text-slate-400 font-normal mt-0.5">
                  WhatsApp &amp; PDF dispatches
                </p>
              </div>
            </div>

            {/* Card 3: Queued Dispatches */}
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
                  Queued for Dispatch
                </span>
                <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-0.5">
                  {queuedCount}
                </h3>
                <p className="text-[12px] text-slate-400 font-normal mt-0.5">
                  Pending HL7 release
                </p>
              </div>
            </div>

            {/* Card 4: Transfer Retries / Failed */}
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
                  Delivery Retries
                </span>
                <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-0.5">
                  {failedCount}
                </h3>
                <p className="text-[12px] text-slate-400 font-normal mt-0.5">
                  Connection timeouts flagged
                </p>
              </div>
            </div>
          </section>

          {/* Quick Batch Transfer Card */}
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
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  />
                </svg>
                <span>Electronic Health Record (EHR) Batch Dispatch</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically push all certified laboratory test results to attending doctor workstations and patient portals.
              </p>
            </div>
            <form
              onSubmit={handleBatchSync}
              className="flex items-center gap-2.5 w-full sm:w-auto"
            >
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#00875A] hover:bg-[#00744E] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer shrink-0 inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Batch Sync to EMR</span>
              </button>
            </form>
          </section>

          {/* TableContainerCard */}
          <section
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            data-purpose="transfers-details-container"
          >
            {/* Header & Action Controls Bar */}
            <div className="px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-[20px] font-bold text-slate-800">
                  Report Dispatch &amp; Transfer Log
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Audit trail of electronic report delivery across Hospital EMR, SMS, WhatsApp, and Ward monitors
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
                    placeholder="Search Patient, Dispatch ID, Recipient..."
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
                        <span>All ({transfers.length})</span>
                        {statusFilter === "ALL" && <span>✓</span>}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter("DELIVERED");
                          setIsFilterDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between ${
                          statusFilter === "DELIVERED"
                            ? "font-semibold text-[#15803d] bg-green-50/50"
                            : "text-slate-700"
                        }`}
                      >
                        <span>Delivered ({deliveredCount})</span>
                        {statusFilter === "DELIVERED" && <span>✓</span>}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter("SENT");
                          setIsFilterDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between ${
                          statusFilter === "SENT"
                            ? "font-semibold text-blue-600 bg-blue-50/50"
                            : "text-slate-700"
                        }`}
                      >
                        <span>Sent ({sentCount})</span>
                        {statusFilter === "SENT" && <span>✓</span>}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter("QUEUED");
                          setIsFilterDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between ${
                          statusFilter === "QUEUED"
                            ? "font-semibold text-[#854d0e] bg-yellow-50/50"
                            : "text-slate-700"
                        }`}
                      >
                        <span>Queued ({queuedCount})</span>
                        {statusFilter === "QUEUED" && <span>✓</span>}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter("FAILED");
                          setIsFilterDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between ${
                          statusFilter === "FAILED"
                            ? "font-semibold text-[#b91c1c] bg-red-50/50"
                            : "text-slate-700"
                        }`}
                      >
                        <span>Failed ({failedCount})</span>
                        {statusFilter === "FAILED" && <span>✓</span>}
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
                id="transfers-log-table"
              >
                <thead>
                  <tr className="border-t border-b border-slate-200 text-[11px] font-bold tracking-wider text-slate-600 uppercase bg-transparent">
                    <th className="py-4 px-8 font-bold" scope="col">
                      DISPATCH &amp; REPORT
                    </th>
                    <th className="py-4 px-6 font-bold" scope="col">
                      PATIENT NAME
                    </th>
                    <th className="py-4 px-6 font-bold" scope="col">
                      RECIPIENT &amp; STATION
                    </th>
                    <th className="py-4 px-6 font-bold" scope="col">
                      CHANNEL
                    </th>
                    <th
                      className="py-4 px-6 font-bold text-center"
                      scope="col"
                    >
                      TIME
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
                  {filteredTransfers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-10 text-center text-slate-400 text-sm"
                      >
                        No dispatch logs found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredTransfers.map((t) => (
                      <tr
                        key={t.id}
                        className="hover:bg-blue-50/40 transition-colors group"
                      >
                        <td className="py-4 px-8">
                          <span className="font-semibold text-slate-900 font-mono block">
                            {t.dispatchId}
                          </span>
                          <span className="font-mono text-blue-600 text-xs font-semibold">
                            {t.reportId}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-semibold text-slate-900 block">
                            {t.patientName}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {t.patientId}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-medium text-slate-800 block text-xs">
                            {t.recipient}
                          </span>
                          {t.ackDetails && (
                            <span className="text-[11px] text-slate-400 block truncate max-w-xs">
                              {t.ackDetails}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {t.channel}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center text-slate-600 font-mono text-xs">
                          {t.dispatchedAt}
                        </td>
                        <td className="py-4 px-8 text-center">
                          {t.status === "DELIVERED" ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#def7ec] text-[#03543f]">
                              DELIVERED
                            </span>
                          ) : t.status === "SENT" ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#e0edff] text-[#2563eb]">
                              SENT
                            </span>
                          ) : t.status === "FAILED" ? (
                            <span
                              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#fee2e2] text-[#991b1b]"
                              title={t.ackDetails}
                            >
                              FAILED
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#fef3c7] text-[#92400e]">
                              QUEUED
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center">
                          {t.status === "FAILED" && (
                            <button
                              type="button"
                              onClick={() => handleResend(t.id)}
                              className="px-3 py-1.5 bg-[#00875A] hover:bg-[#00744E] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                            >
                              Retry Now
                            </button>
                          )}
                          {t.status === "QUEUED" && (
                            <button
                              type="button"
                              onClick={() => handleResend(t.id)}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                            >
                              Dispatch
                            </button>
                          )}
                          {t.status === "DELIVERED" && (
                            <span className="text-xs font-semibold text-[#059669]">
                              ✓ Confirmed
                            </span>
                          )}
                          {t.status === "SENT" && (
                            <button
                              type="button"
                              onClick={() => handleResend(t.id)}
                              className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
                            >
                              Resend
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

