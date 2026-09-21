import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getUser, remove } from "@/utils/token";
import { toast } from "@/hooks/use-toast";
import {
  FlaskConical,
  LayoutDashboard,
  ShieldCheck,
  TestTubes,
  FileCheck2,
  SendHorizontal,
  Settings,
  HelpCircle,
  LogOut,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowLeft,
  Barcode,
  Building2,
  Bell,
  Check,
  X,
  RefreshCw,
} from "lucide-react";

interface SampleItem {
  id: string;
  sampleId: string;
  barcode: string;
  patientId: string;
  patientName: string;
  testName: string;
  sampleType: string;
  collectionTime: string;
  status: "VERIFIED" | "PENDING" | "REJECTED";
  rejectionReason?: string;
}

const INITIAL_SAMPLES: SampleItem[] = [
  {
    id: "s1",
    sampleId: "SMP-001",
    barcode: "BC2405200001",
    patientId: "P000123",
    patientName: "Rahul Sharma",
    testName: "Complete Blood Count (CBC)",
    sampleType: "Whole Blood (EDTA)",
    collectionTime: "20 May 2024 10:30 AM",
    status: "PENDING",
  },
  {
    id: "s2",
    sampleId: "SMP-002",
    barcode: "BC2405200002",
    patientId: "P000123",
    patientName: "Rahul Sharma",
    testName: "Liver Function Test (LFT)",
    sampleType: "Serum (SST)",
    collectionTime: "20 May 2024 10:32 AM",
    status: "VERIFIED",
  },
  {
    id: "s3",
    sampleId: "SMP-003",
    barcode: "BC2405200003",
    patientId: "P000124",
    patientName: "Priya",
    testName: "Kidney Function Test (KFT)",
    sampleType: "Serum (SST)",
    collectionTime: "30 Mar 2026 11:30 AM",
    status: "VERIFIED",
  },
  {
    id: "s4",
    sampleId: "SMP-004",
    barcode: "BC2405200004",
    patientId: "P000125",
    patientName: "Praveen Singh",
    testName: "Lipid Profile",
    sampleType: "Serum (SST)",
    collectionTime: "03 Apr 2026 10:45 AM",
    status: "PENDING",
  },
  {
    id: "s5",
    sampleId: "SMP-005",
    barcode: "BC2405200005",
    patientId: "P000126",
    patientName: "Naziya",
    testName: "Complete Blood Count (CBC)",
    sampleType: "Whole Blood (EDTA)",
    collectionTime: "05 Apr 2026 10:30 AM",
    status: "REJECTED",
    rejectionReason: "Hemolyzed specimen",
  },
];

export default function SampleVerification() {
  const navigate = useNavigate();
  const currentUser = getUser();
  const displayName = currentUser?.username || "Labtech";
  const displayRole =
    currentUser?.role_type === "LAB_TECHNICIAN"
      ? "Lab Technician"
      : currentUser?.role_type || "Lab Technician";
  const branchName = currentUser?.branch_name || "Kavery Branch";

  const handleLogout = () => {
    remove();
    navigate("/", { replace: true });
  };

  const [samples, setSamples] = useState<SampleItem[]>(INITIAL_SAMPLES);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "PENDING" | "VERIFIED" | "REJECTED"
  >("ALL");
  const [barcodeInput, setBarcodeInput] = useState("");

  const handleVerifySample = (id: string) => {
    setSamples((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "VERIFIED" } : s)),
    );
    toast({
      title: "Sample Verified",
      description: "Sample passed pre-analytical integrity check.",
    });
  };

  const handleRejectSample = (id: string) => {
    const reason = prompt("Enter reason for rejection:", "Hemolyzed specimen");
    if (reason) {
      setSamples((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, status: "REJECTED", rejectionReason: reason }
            : s,
        ),
      );
      toast({
        title: "Sample Rejected",
        description: `Sample marked for recollection. Reason: ${reason}`,
        variant: "destructive",
      });
    }
  };

  const handleBarcodeScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    const match = samples.find(
      (s) => s.barcode.toLowerCase() === barcodeInput.trim().toLowerCase(),
    );
    if (match) {
      handleVerifySample(match.id);
      setBarcodeInput("");
    } else {
      toast({
        title: "Barcode Not Found",
        description: `No sample matching barcode "${barcodeInput}" found in queue.`,
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
        sample.testName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" || sample.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [samples, searchQuery, statusFilter]);

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-slate-900 antialiased font-sans">
      {/* Sidebar */}
      <aside className="w-[260px] bg-white flex-shrink-0 flex flex-col justify-between border-r border-slate-200 select-none min-h-screen fixed inset-y-0 left-0 z-30 shadow-2xs">
        <div>
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <FlaskConical className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-slate-900 tracking-tight">
                    HMS LAB
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200/70">
                    LIS
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
                  Laboratory Unit
                </span>
              </div>
            </div>
          </div>

          <div className="px-3 pt-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
              Main Menu
            </div>
            <nav className="space-y-1">
              <button
                type="button"
                onClick={() => navigate("/lab/dashboard")}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all text-left cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
                <span>Dashboard</span>
              </button>

              <button
                type="button"
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold bg-blue-600 text-white shadow-xs text-left"
              >
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                <span>Samples Verification</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/lab/dashboard")}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all text-left cursor-pointer"
              >
                <TestTubes className="w-4 h-4 flex-shrink-0" />
                <span>Testing Samples</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/lab/dashboard")}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all text-left cursor-pointer"
              >
                <FileCheck2 className="w-4 h-4 flex-shrink-0" />
                <span>Report Generation</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/lab/dashboard")}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all text-left cursor-pointer"
              >
                <SendHorizontal className="w-4 h-4 flex-shrink-0" />
                <span>Report Transfer</span>
              </button>
            </nav>
          </div>
        </div>

        <div className="p-3 border-t border-slate-200 bg-slate-50/50 space-y-1">
          <a
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-white hover:text-slate-900 rounded-lg transition-colors"
            href="#settings"
            onClick={(e) => e.preventDefault()}
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Settings</span>
          </a>

          <a
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-white hover:text-slate-900 rounded-lg transition-colors"
            href="#support"
            onClick={(e) => e.preventDefault()}
          >
            <HelpCircle className="w-4 h-4 text-slate-400" />
            <span>Help &amp; Support</span>
          </a>

          <div className="pt-3 mt-1 border-t border-slate-200 px-1 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0 ring-1 ring-blue-700/20">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col text-left truncate">
                <span className="text-xs font-bold text-slate-900 leading-tight truncate">
                  {displayName}
                </span>
                <span className="text-[10px] font-semibold text-blue-600 leading-tight truncate">
                  {displayRole}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 ml-[260px] min-h-screen flex flex-col min-w-0 bg-[#F8FAFC]">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200 bg-white/95 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/lab/dashboard")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-all shadow-2xs cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </button>
            <div className="h-4 w-[1px] bg-slate-200" />
            <h1 className="text-base font-bold text-slate-900 tracking-tight">
              Sample Verification Queue
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium border border-slate-200">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>{branchName}</span>
            </div>

            <div className="relative p-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer text-slate-600">
              <Bell className="w-4 h-4" />
              <span className="absolute top-0.5 right-0.5 bg-rose-600 text-white font-bold text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center">
                2
              </span>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Quick Barcode Scanner Card */}
          <section className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Barcode className="w-4 h-4 text-blue-600" />
                <span>Quick Barcode Verification Scanner</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Scan or enter the sample tube barcode to immediately verify specimen integrity.
              </p>
            </div>
            <form onSubmit={handleBarcodeScan} className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan / Type Barcode (e.g. BC2405200001)..."
                className="px-3 py-1.5 text-xs font-mono font-medium border border-slate-300 rounded-lg w-full sm:w-64 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none shadow-2xs"
              />
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs transition-colors cursor-pointer shrink-0"
              >
                Verify
              </button>
            </form>
          </section>

          {/* Samples Table Card */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Header Controls */}
            <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Specimens Awaiting Verification
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirm tube volume, label alignment, and pre-analytical integrity before routing to analyzers.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setStatusFilter("ALL")}
                    className={`px-3 py-1 rounded-md transition-all ${
                      statusFilter === "ALL"
                        ? "bg-white text-slate-900 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    All ({samples.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("PENDING")}
                    className={`px-3 py-1 rounded-md transition-all ${
                      statusFilter === "PENDING"
                        ? "bg-white text-amber-800 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Pending ({samples.filter((s) => s.status === "PENDING").length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("VERIFIED")}
                    className={`px-3 py-1 rounded-md transition-all ${
                      statusFilter === "VERIFIED"
                        ? "bg-white text-emerald-800 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Verified ({samples.filter((s) => s.status === "VERIFIED").length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("REJECTED")}
                    className={`px-3 py-1 rounded-md transition-all ${
                      statusFilter === "REJECTED"
                        ? "bg-white text-rose-800 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Rejected ({samples.filter((s) => s.status === "REJECTED").length})
                  </button>
                </div>

                <div className="relative flex-1 sm:w-56">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search sample / barcode..."
                    type="text"
                    className="w-full pl-9 pr-8 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold tracking-wider text-slate-700 uppercase">
                    <th className="py-3 px-6" scope="col">SAMPLE ID</th>
                    <th className="py-3 px-6" scope="col">BARCODE</th>
                    <th className="py-3 px-6" scope="col">PATIENT</th>
                    <th className="py-3 px-6" scope="col">TEST &amp; TUBE TYPE</th>
                    <th className="py-3 px-6" scope="col">COLLECTED TIME</th>
                    <th className="py-3 px-6 text-center" scope="col">STATUS</th>
                    <th className="py-3 px-6 text-right" scope="col">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium">
                  {filteredSamples.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        No samples found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredSamples.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-6 font-mono font-bold text-slate-900">
                          {s.sampleId}
                        </td>
                        <td className="py-3.5 px-6 font-mono text-blue-600 font-semibold">
                          {s.barcode}
                        </td>
                        <td className="py-3.5 px-6">
                          <span className="font-bold text-slate-900 block">{s.patientName}</span>
                          <span className="text-[11px] text-slate-500 font-mono">{s.patientId}</span>
                        </td>
                        <td className="py-3.5 px-6">
                          <span className="font-semibold text-slate-800 block">{s.testName}</span>
                          <span className="text-[11px] text-slate-500">{s.sampleType}</span>
                        </td>
                        <td className="py-3.5 px-6 text-slate-600 font-mono">
                          {s.collectionTime}
                        </td>
                        <td className="py-3.5 px-6 text-center">
                          {s.status === "VERIFIED" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3" />
                              VERIFIED
                            </span>
                          ) : s.status === "REJECTED" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-300" title={s.rejectionReason}>
                              <AlertCircle className="w-3 h-3" />
                              REJECTED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                              <Clock className="w-3 h-3" />
                              PENDING
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-right space-x-2">
                          {s.status === "PENDING" && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleVerifySample(s.id)}
                                className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 rounded hover:bg-emerald-600 hover:text-white transition-all shadow-2xs cursor-pointer"
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectSample(s.id)}
                                className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-300 rounded hover:bg-rose-600 hover:text-white transition-all shadow-2xs cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {s.status === "REJECTED" && (
                            <span className="text-[11px] text-rose-600 font-semibold italic">
                              Recollection Ordered
                            </span>
                          )}
                          {s.status === "VERIFIED" && (
                            <span className="text-[11px] text-emerald-600 font-semibold">
                              Ready for Analyzer
                            </span>
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

