import { useState, useMemo } from "react";
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
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  Printer,
  Plus,
  Minus,
  Check,
  X,
  Calendar,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  Barcode,
  Building2,
  Bell,
} from "lucide-react";

interface TestRecord {
  id: string;
  requestId: string;
  patientId: string;
  patientName: string;
  requestedBy: string;
  requestTime: string;
  tests: string;
  date?: string;
  time?: string;
  status: "PROCESSING" | "COMPLETED";
  dob: string;
  gender: string;
  mobile: string;
  email: string;
  address: string;
  avatarUrl?: string;
}

const INITIAL_TESTS: TestRecord[] = [
  {
    id: "1",
    requestId: "TRF1256",
    patientId: "P000123",
    patientName: "Rahul Sharma",
    requestedBy: "Dr. Sharma",
    requestTime: "20 May 2024 10:30 AM",
    tests: "CBC, LFT",
    date: "10/04/26",
    time: "10:30 AM",
    status: "PROCESSING",
    dob: "15/06/1985",
    gender: "Male",
    mobile: "9876543210",
    email: "ramesh.kumar@email.com",
    address: "21, Green Park, New Delhi",
    avatarUrl:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "2",
    requestId: "TRF1255",
    patientId: "P000124",
    patientName: "Priya",
    requestedBy: "Dr. Verma",
    requestTime: "30 Mar 2026 11:30 AM",
    tests: "KFT, Lipid Profile",
    date: "30/03/26",
    time: "11:30 AM",
    status: "COMPLETED",
    dob: "22/08/1992",
    gender: "Female",
    mobile: "9812345678",
    email: "priya.sharma@email.com",
    address: "45, Vasant Vihar, New Delhi",
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "3",
    requestId: "TRF1254",
    patientId: "P000125",
    patientName: "Praveen Singh",
    requestedBy: "Dr. John",
    requestTime: "03 Apr 2026 10:45 AM",
    tests: "KFT, Lipid Profile",
    date: "03/04/26",
    time: "10:45 AM",
    status: "PROCESSING",
    dob: "10/11/1980",
    gender: "Male",
    mobile: "9823456789",
    email: "praveen.singh@email.com",
    address: "12, Model Town, Delhi",
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "4",
    requestId: "TRF1253",
    patientId: "P000126",
    patientName: "Naziya",
    requestedBy: "Dr. Verma",
    requestTime: "05 Apr 2026 10:30 AM",
    tests: "KFT, Lipid Profile",
    date: "05/04/26",
    time: "10:30 AM",
    status: "PROCESSING",
    dob: "04/02/1995",
    gender: "Female",
    mobile: "9834567890",
    email: "naziya.k@email.com",
    address: "88, Jamia Nagar, New Delhi",
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "5",
    requestId: "TRF1252",
    patientId: "P000127",
    patientName: "Baskar",
    requestedBy: "Dr. Sarah",
    requestTime: "20 Mar 2026 12:15 AM",
    tests: "KFT, Lipid Profile",
    date: "20/03/26",
    time: "12:15 AM",
    status: "COMPLETED",
    dob: "19/07/1978",
    gender: "Male",
    mobile: "9845678901",
    email: "baskar.m@email.com",
    address: "14, Lajpat Nagar, New Delhi",
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "6",
    requestId: "TRF1251",
    patientId: "P000128",
    patientName: "Ajay",
    requestedBy: "Dr. Verma",
    requestTime: "21 Mar 2026 01:16 PM",
    tests: "KFT, Lipid Profile",
    date: "21/03/26",
    time: "01:16 PM",
    status: "COMPLETED",
    dob: "30/09/1988",
    gender: "Male",
    mobile: "9856789012",
    email: "ajay.verma@email.com",
    address: "56, Karol Bagh, New Delhi",
    avatarUrl:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "7",
    requestId: "TRF1250",
    patientId: "P000129",
    patientName: "Gopal",
    requestedBy: "Dr. Mahesh",
    requestTime: "11 Apr 2026 10:30 AM",
    tests: "KFT, Lipid Profile",
    date: "11/04/26",
    time: "10:30 AM",
    status: "PROCESSING",
    dob: "12/12/1975",
    gender: "Male",
    mobile: "9867890123",
    email: "gopal.das@email.com",
    address: "78, Rohini Sector 9, New Delhi",
    avatarUrl:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "8",
    requestId: "TRF1249",
    patientId: "P000130",
    patientName: "Ramya",
    requestedBy: "Dr. Verma",
    requestTime: "15 Apr 2026 09:00 AM",
    tests: "KFT, Lipid Profile",
    date: "15/04/26",
    time: "09:00 AM",
    status: "COMPLETED",
    dob: "05/05/1996",
    gender: "Female",
    mobile: "9878901234",
    email: "ramya.n@email.com",
    address: "33, Saket, New Delhi",
    avatarUrl:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
  },
];

const calculateAge = (dobString?: string): number => {
  if (!dobString) return 38;
  const parts = dobString.split(/[-/]/);
  if (parts.length === 3) {
    let year = parseInt(parts[2], 10);
    if (isNaN(year) || year < 100) year = parseInt(parts[0], 10);
    if (!isNaN(year) && year > 1900 && year <= 2026) {
      return Math.max(1, 2026 - year);
    }
  }
  return 38;
};

interface SampleBarcodeItem {
  id: string;
  testCode: string;
  testName: string;
  sampleType: string;
  barcode: string;
  count: number;
}

const INITIAL_SAMPLES: SampleBarcodeItem[] = [
  {
    id: "cbc",
    testCode: "CBC",
    testName: "Complete Blood Count",
    sampleType: "Whole Blood (EDTA)",
    barcode: "BC2405200001",
    count: 1,
  },
  {
    id: "lft",
    testCode: "LFT",
    testName: "Liver Function Test",
    sampleType: "Serum (SST)",
    barcode: "BC2405200002",
    count: 1,
  },
  {
    id: "kft",
    testCode: "KFT",
    testName: "Kidney Function Test",
    sampleType: "Serum (SST)",
    barcode: "BC2405200003",
    count: 1,
  },
];

export default function LabDashboard() {
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

  const [activeNav, setActiveNav] = useState("Dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "PROCESSING" | "COMPLETED"
  >("ALL");

  // Requisitions data list
  const [testsList, setTestsList] = useState<TestRecord[]>(INITIAL_TESTS);

  // Selected patient for expanded registration view
  const [selectedPatient, setSelectedPatient] = useState<TestRecord | null>(
    null,
  );
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 2: Test Alignment selection states
  const [selectedValidTests, setSelectedValidTests] = useState<string[]>([
    "cbc",
    "lft",
    "kft",
  ]);
  const [isExcludedSelected, setIsExcludedSelected] = useState<boolean>(false);
  const [conflictResolved, setConflictResolved] = useState<boolean>(false);

  // Step 3: Sample Barcode states
  const [sampleBarcodes, setSampleBarcodes] =
    useState<SampleBarcodeItem[]>(INITIAL_SAMPLES);
  const [printSuccessMessage, setPrintSuccessMessage] = useState<string | null>(
    null,
  );

  // Patient Registration form state
  const [patientFormData, setPatientFormData] = useState({
    patientId: "",
    fullName: "",
    dob: "",
    gender: "",
    mobile: "",
    email: "",
    address: "",
  });

  const handleToggleValidTest = (id: string) => {
    setSelectedValidTests((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const handleToggleAllValid = () => {
    if (selectedValidTests.length === 3) {
      setSelectedValidTests([]);
    } else {
      setSelectedValidTests(["cbc", "lft", "kft"]);
    }
  };

  const handleIncrementBarcodeCount = (id: string) => {
    setSampleBarcodes((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, count: item.count + 1 } : item,
      ),
    );
  };

  const handleDecrementBarcodeCount = (id: string) => {
    setSampleBarcodes((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, count: Math.max(1, item.count - 1) } : item,
      ),
    );
  };

  const handlePrintSingleBarcode = (item: SampleBarcodeItem) => {
    const msg = `Barcode label ${item.barcode} for ${item.testCode} sent to printer!`;
    setPrintSuccessMessage(msg);
    toast({
      title: "Barcode Printed",
      description: msg,
    });
    setTimeout(() => setPrintSuccessMessage(null), 3500);
  };

  const handlePrintAllBarcodes = () => {
    const msg = `All ${sampleBarcodes.length} sample barcode labels sent to printer!`;
    setPrintSuccessMessage(msg);
    toast({
      title: "Barcodes Printed",
      description: msg,
    });
    setTimeout(() => setPrintSuccessMessage(null), 3500);
  };

  const handleCompleteAndSave = () => {
    if (selectedPatient) {
      setTestsList((prev) =>
        prev.map((t) =>
          t.id === selectedPatient.id ? { ...t, status: "COMPLETED" } : t,
        ),
      );
    }
    toast({
      title: "Requisition Completed",
      description: `Requisition ${selectedPatient?.requestId} for ${selectedPatient?.patientName} successfully completed and saved.`,
    });
    handleBackToDashboard();
  };

  const handleSelectPatient = (patient: TestRecord) => {
    setSelectedPatient(patient);
    setCurrentStep(1);
    setSelectedValidTests(["cbc", "lft", "kft"]);
    setIsExcludedSelected(false);
    setConflictResolved(false);
    setSampleBarcodes(INITIAL_SAMPLES);
    setPrintSuccessMessage(null);
    setPatientFormData({
      patientId: patient.patientId,
      fullName: patient.patientName,
      dob: patient.dob,
      gender: patient.gender,
      mobile: patient.mobile,
      email: patient.email,
      address: patient.address,
    });
  };

  const handleBackToDashboard = () => {
    setSelectedPatient(null);
    setCurrentStep(1);
    setSelectedValidTests(["cbc", "lft", "kft"]);
    setIsExcludedSelected(false);
    setConflictResolved(false);
    setSampleBarcodes(INITIAL_SAMPLES);
    setPrintSuccessMessage(null);
  };

  const handleToggleResolveConflict = () => {
    const nextResolved = !conflictResolved;
    setConflictResolved(nextResolved);
    if (nextResolved) {
      setSampleBarcodes((prev) => {
        if (prev.some((s) => s.id === "fbs")) return prev;
        return [
          ...prev,
          {
            id: "fbs",
            testCode: "FBS",
            testName: "Glucose - Fasting (FBS)",
            sampleType: "Fluoride Plasma (Grey)",
            barcode: "BC2405200004",
            count: 1,
          },
        ];
      });
      toast({
        title: "Clinical Conflict Resolved",
        description:
          "Glucose - Fasting (FBS) has been approved and added to sample collection.",
      });
    } else {
      setSampleBarcodes((prev) => prev.filter((s) => s.id !== "fbs"));
      toast({
        title: "Clinical Conflict Re-applied",
        description: "Glucose - Fasting (FBS) is marked as excluded.",
      });
    }
  };

  const filteredTests = useMemo(() => {
    return testsList.filter((test) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        test.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        test.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        test.requestId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        test.requestedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        test.tests.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" || test.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [testsList, searchQuery, statusFilter]);

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-slate-900 antialiased font-sans">
      {/* =========================================================================
          RAZOR-SHARP SIDEBAR NAVIGATION
          ========================================================================= */}
      <aside
        className="w-[260px] bg-white flex-shrink-0 flex flex-col justify-between border-r border-slate-200 select-none min-h-screen fixed inset-y-0 left-0 z-30 shadow-2xs"
        data-purpose="sidebar-navigation"
      >
        {/* Top: Brand Header & Primary Nav */}
        <div>
          {/* Crisp Brand Header */}
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

          {/* Navigation Items */}
          <div className="px-3 pt-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
              Main Menu
            </div>
            <nav className="space-y-1">
              {/* Dashboard */}
              <button
                type="button"
                onClick={() => {
                  setActiveNav("Dashboard");
                  setSelectedPatient(null);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all text-left ${
                  activeNav === "Dashboard" && !selectedPatient
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
                <span>Dashboard</span>
              </button>

              {/* Samples Verification */}
              <button
                type="button"
                onClick={() => navigate("/lab/sample-verification")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all text-left cursor-pointer ${
                  activeNav === "Samples Verification"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                <span>Samples Verification</span>
              </button>

              {/* Testing Samples */}
              <button
                type="button"
                onClick={() => {
                  setActiveNav("Testing Samples");
                  setSelectedPatient(null);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all text-left ${
                  activeNav === "Testing Samples"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <TestTubes className="w-4 h-4 flex-shrink-0" />
                <span>Testing Samples</span>
              </button>

              {/* Report Generation */}
              <button
                type="button"
                onClick={() => {
                  setActiveNav("Report Generation");
                  setSelectedPatient(null);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all text-left ${
                  activeNav === "Report Generation"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <FileCheck2 className="w-4 h-4 flex-shrink-0" />
                <span>Report Generation</span>
              </button>

              {/* Report Transfer */}
              <button
                type="button"
                onClick={() => {
                  setActiveNav("Report Transfer");
                  setSelectedPatient(null);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all text-left ${
                  activeNav === "Report Transfer"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <SendHorizontal className="w-4 h-4 flex-shrink-0" />
                <span>Report Transfer</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Bottom: Settings, Help & Sharp User Card */}
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

          {/* Sharp Technician User Card */}
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

      {/* =========================================================================
          MAIN CONTENT VIEW AREA
          ========================================================================= */}
      <div className="flex-1 ml-[260px] min-h-screen flex flex-col min-w-0 bg-[#F8FAFC]">
        {/* =========================================================================
            VIEW 1: PATIENT REGISTRATION & MULTI-STEP WORKFLOW
            ========================================================================= */}
        {selectedPatient ? (
          <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
            {/* Razor-Sharp Header */}
            <header className="h-16 border-b border-slate-200 bg-white/95 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleBackToDashboard}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-lg transition-all shadow-2xs cursor-pointer"
                  title="Back to Dashboard"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                </button>
                <div className="h-4 w-[1px] bg-slate-200" />
                <h1 className="text-base font-bold text-slate-900 tracking-tight">
                  {currentStep === 1
                    ? "Step 1: Patient Details"
                    : currentStep === 2
                      ? "Step 2: Test Alignment"
                      : "Step 3: Sample Barcode Generation"}
                </h1>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/80">
                  <span className="font-mono font-semibold text-slate-800">
                    {selectedPatient.requestId}
                  </span>
                  <span>•</span>
                  <span>{selectedPatient.patientName}</span>
                </span>
              </div>

              {/* Technician User Badge & Logout */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-slate-700">
                    {displayName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-md transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </header>

            {/* Razor-Sharp Stepper */}
            <section className="bg-white border-b border-slate-200 py-3.5 px-8">
              <nav
                aria-label="Progress"
                className="flex items-center justify-center"
              >
                <ol className="flex items-center space-x-3 sm:space-x-5 text-xs font-semibold">
                  {/* Step 1 */}
                  <li className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="flex items-center gap-2 focus:outline-none cursor-pointer group"
                    >
                      {currentStep > 1 ? (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow-2xs">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </span>
                      ) : (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold shadow-2xs">
                          1
                        </span>
                      )}
                      <span
                        className={`text-xs ${currentStep === 1 ? "font-bold text-slate-900" : "font-medium text-slate-600 group-hover:text-slate-900"}`}
                      >
                        Patient Details
                      </span>
                    </button>
                  </li>

                  {/* Connector 1 */}
                  <li
                    className={`w-14 sm:w-24 h-[2px] rounded-full transition-colors ${currentStep > 1 ? "bg-emerald-500" : "bg-slate-200"}`}
                  />

                  {/* Step 2 */}
                  <li className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="flex items-center gap-2 focus:outline-none cursor-pointer group"
                    >
                      {currentStep > 2 ? (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow-2xs">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </span>
                      ) : currentStep === 2 ? (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold shadow-2xs">
                          2
                        </span>
                      ) : (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 text-xs font-semibold">
                          2
                        </span>
                      )}
                      <span
                        className={`text-xs ${currentStep === 2 ? "font-bold text-slate-900" : currentStep > 2 ? "font-semibold text-slate-800" : "text-slate-400 font-medium"}`}
                      >
                        Test Alignment
                      </span>
                    </button>
                  </li>

                  {/* Connector 2 */}
                  <li
                    className={`w-14 sm:w-24 h-[2px] rounded-full transition-colors ${currentStep > 2 ? "bg-emerald-500" : "bg-slate-200"}`}
                  />

                  {/* Step 3 */}
                  <li className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="flex items-center gap-2 focus:outline-none cursor-pointer group"
                    >
                      {currentStep === 3 ? (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold shadow-2xs">
                          3
                        </span>
                      ) : (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 text-xs font-semibold">
                          3
                        </span>
                      )}
                      <span
                        className={`text-xs ${currentStep === 3 ? "font-bold text-blue-600" : "text-slate-400 font-medium"}`}
                      >
                        Sample Barcode
                      </span>
                    </button>
                  </li>
                </ol>
              </nav>
            </section>

            {/* Workflow Main Container */}
            <main className="flex-1 py-8 px-6 lg:px-10 overflow-y-auto">
              <div className="max-w-4xl mx-auto">
                {/* -------------------------------------------------------------
                    STEP 1: PATIENT REGISTRATION FORM
                    ------------------------------------------------------------- */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    {/* Requisition Card */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                      {/* Request Metadata Header */}
                      <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/70">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                              Requisition Information
                            </span>
                            <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded">
                              Active Order
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-xs font-semibold text-slate-600">
                              Pre-Analytical Check
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-200/80">
                          <div>
                            <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                              Request ID
                            </span>
                            <span className="text-sm font-mono font-bold text-blue-600 mt-0.5 block">
                              {selectedPatient.requestId}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                              Requested By
                            </span>
                            <span className="text-sm font-bold text-slate-800 mt-0.5 block">
                              {selectedPatient.requestedBy}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                              Request Time
                            </span>
                            <span className="text-xs font-semibold text-slate-700 mt-0.5 block">
                              {selectedPatient.requestTime}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                              Ordered Tests
                            </span>
                            <span className="text-xs font-bold text-slate-900 mt-0.5 block truncate">
                              {selectedPatient.tests}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Patient Registration Form */}
                      <div className="p-6">
                        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-200">
                          <div className="flex items-center gap-3">
                            <img
                              alt={selectedPatient.patientName}
                              className="w-12 h-12 rounded-lg object-cover ring-1 ring-slate-300 shadow-2xs"
                              src={
                                selectedPatient.avatarUrl ||
                                "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"
                              }
                            />
                            <div>
                              <h3 className="text-sm font-bold text-slate-900">
                                {selectedPatient.patientName}
                              </h3>
                              <p className="text-xs text-slate-500 font-mono">
                                ID: {selectedPatient.patientId} •{" "}
                                {calculateAge(selectedPatient.dob)} Yrs /{" "}
                                {selectedPatient.gender}
                              </p>
                            </div>
                          </div>
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                            Patient Bio-Data
                          </span>
                        </div>

                        <form
                          className="space-y-4"
                          onSubmit={(e) => e.preventDefault()}
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label
                                className="block text-xs font-bold text-slate-700 mb-1.5"
                                htmlFor="patientId"
                              >
                                Patient ID
                              </label>
                              <input
                                id="patientId"
                                type="text"
                                value={patientFormData.patientId}
                                onChange={(e) =>
                                  setPatientFormData({
                                    ...patientFormData,
                                    patientId: e.target.value,
                                  })
                                }
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all shadow-2xs"
                              />
                            </div>
                            <div>
                              <label
                                className="block text-xs font-bold text-slate-700 mb-1.5"
                                htmlFor="fullName"
                              >
                                Full Name
                              </label>
                              <input
                                id="fullName"
                                type="text"
                                value={patientFormData.fullName}
                                onChange={(e) =>
                                  setPatientFormData({
                                    ...patientFormData,
                                    fullName: e.target.value,
                                  })
                                }
                                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all shadow-2xs"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label
                                className="block text-xs font-bold text-slate-700 mb-1.5"
                                htmlFor="dob"
                              >
                                Date of Birth
                              </label>
                              <div className="relative">
                                <input
                                  id="dob"
                                  type="text"
                                  value={patientFormData.dob}
                                  onChange={(e) =>
                                    setPatientFormData({
                                      ...patientFormData,
                                      dob: e.target.value,
                                    })
                                  }
                                  className="w-full bg-white border border-slate-300 rounded-lg pl-3.5 pr-10 py-2 text-xs font-medium text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all shadow-2xs"
                                />
                                <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                              </div>
                            </div>
                            <div>
                              <label
                                className="block text-xs font-bold text-slate-700 mb-1.5"
                                htmlFor="gender"
                              >
                                Gender
                              </label>
                              <input
                                id="gender"
                                type="text"
                                value={patientFormData.gender}
                                onChange={(e) =>
                                  setPatientFormData({
                                    ...patientFormData,
                                    gender: e.target.value,
                                  })
                                }
                                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all shadow-2xs"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label
                                className="block text-xs font-bold text-slate-700 mb-1.5"
                                htmlFor="mobile"
                              >
                                Mobile Number
                              </label>
                              <div className="relative">
                                <input
                                  id="mobile"
                                  type="text"
                                  value={patientFormData.mobile}
                                  onChange={(e) =>
                                    setPatientFormData({
                                      ...patientFormData,
                                      mobile: e.target.value,
                                    })
                                  }
                                  className="w-full bg-white border border-slate-300 rounded-lg pl-3.5 pr-10 py-2 text-xs font-medium text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all shadow-2xs"
                                />
                                <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                              </div>
                            </div>
                            <div>
                              <label
                                className="block text-xs font-bold text-slate-700 mb-1.5"
                                htmlFor="email"
                              >
                                Email Address
                              </label>
                              <div className="relative">
                                <input
                                  id="email"
                                  type="email"
                                  value={patientFormData.email}
                                  onChange={(e) =>
                                    setPatientFormData({
                                      ...patientFormData,
                                      email: e.target.value,
                                    })
                                  }
                                  className="w-full bg-white border border-slate-300 rounded-lg pl-3.5 pr-10 py-2 text-xs font-medium text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all shadow-2xs"
                                />
                                <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                              </div>
                            </div>
                          </div>

                          <div>
                            <label
                              className="block text-xs font-bold text-slate-700 mb-1.5"
                              htmlFor="address"
                            >
                              Address
                            </label>
                            <div className="relative">
                              <input
                                id="address"
                                type="text"
                                value={patientFormData.address}
                                onChange={(e) =>
                                  setPatientFormData({
                                    ...patientFormData,
                                    address: e.target.value,
                                  })
                                }
                                className="w-full bg-white border border-slate-300 rounded-lg pl-3.5 pr-10 py-2 text-xs font-medium text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all shadow-2xs"
                              />
                              <MapPin className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                            </div>
                          </div>
                        </form>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={handleBackToDashboard}
                        className="px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Cancel &amp; Return</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <span>Continue to Test Alignment</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* -------------------------------------------------------------
                    STEP 2: TEST ALIGNMENT
                    ------------------------------------------------------------- */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    {/* Patient Summary Strip */}
                    <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                      <div className="p-2">
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Patient ID
                        </span>
                        <span className="mt-1 block text-base font-mono font-bold text-slate-900">
                          {selectedPatient.patientId}
                        </span>
                      </div>
                      <div className="p-2 md:pl-6">
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Patient Name
                        </span>
                        <span className="mt-1 block text-base font-bold text-slate-900">
                          {selectedPatient.patientName}
                        </span>
                      </div>
                      <div className="p-2 md:pl-6">
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Age / Gender
                        </span>
                        <span className="mt-1 block text-base font-bold text-slate-900">
                          {calculateAge(selectedPatient.dob)} Yrs /{" "}
                          {selectedPatient.gender}
                        </span>
                      </div>
                      <div className="p-2 md:pl-6">
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Request ID
                        </span>
                        <span className="mt-1 block text-base font-mono font-bold text-blue-600">
                          {selectedPatient.requestId}
                        </span>
                      </div>
                    </section>

                    {/* Valid Tests Table */}
                    <section className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                            Valid Tests to Proceed
                          </h2>
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded">
                            {selectedValidTests.length} Selected
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">
                          All pre-analytical requirements confirmed
                        </span>
                      </div>

                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                              <th className="py-3 px-5 w-16" scope="col">
                                <input
                                  type="checkbox"
                                  checked={selectedValidTests.length === 3}
                                  onChange={handleToggleAllValid}
                                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                                />
                              </th>
                              <th className="py-3 px-5" scope="col">
                                Test Name
                              </th>
                              <th className="py-3 px-5" scope="col">
                                Sample Type
                              </th>
                              <th className="py-3 px-5" scope="col">
                                Priority
                              </th>
                              <th
                                className="py-3 px-5 text-center w-28"
                                scope="col"
                              >
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-800">
                            {/* Row 1 */}
                            <tr className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3.5 px-5">
                                <input
                                  type="checkbox"
                                  checked={selectedValidTests.includes("cbc")}
                                  onChange={() => handleToggleValidTest("cbc")}
                                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                                />
                              </td>
                              <td className="py-3.5 px-5 font-bold text-slate-900">
                                Complete Blood Count (CBC)
                              </td>
                              <td className="py-3.5 px-5 text-slate-600">
                                Whole Blood (EDTA)
                              </td>
                              <td className="py-3.5 px-5">
                                <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-semibold">
                                  Routine
                                </span>
                              </td>
                              <td className="py-3.5 px-5 text-center">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  READY
                                </span>
                              </td>
                            </tr>
                            {/* Row 2 */}
                            <tr className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3.5 px-5">
                                <input
                                  type="checkbox"
                                  checked={selectedValidTests.includes("lft")}
                                  onChange={() => handleToggleValidTest("lft")}
                                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                                />
                              </td>
                              <td className="py-3.5 px-5 font-bold text-slate-900">
                                Liver Function Test (LFT)
                              </td>
                              <td className="py-3.5 px-5 text-slate-600">
                                Serum (SST)
                              </td>
                              <td className="py-3.5 px-5">
                                <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-semibold">
                                  Routine
                                </span>
                              </td>
                              <td className="py-3.5 px-5 text-center">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  READY
                                </span>
                              </td>
                            </tr>
                            {/* Row 3 */}
                            <tr className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3.5 px-5">
                                <input
                                  type="checkbox"
                                  checked={selectedValidTests.includes("kft")}
                                  onChange={() => handleToggleValidTest("kft")}
                                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                                />
                              </td>
                              <td className="py-3.5 px-5 font-bold text-slate-900">
                                Kidney Function Test (KFT)
                              </td>
                              <td className="py-3.5 px-5 text-slate-600">
                                Serum (SST)
                              </td>
                              <td className="py-3.5 px-5">
                                <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-semibold">
                                  Routine
                                </span>
                              </td>
                              <td className="py-3.5 px-5 text-center">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  READY
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </section>

                    {/* Excluded Tests Alert Section / Conflict Resolution */}
                    <section className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {conflictResolved ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                          )}
                          <h2
                            className={`text-sm font-bold uppercase tracking-wide ${
                              conflictResolved
                                ? "text-emerald-700"
                                : "text-amber-700"
                            }`}
                          >
                            {conflictResolved
                              ? "Clinical Conflict Resolved (Approved)"
                              : "Excluded Tests (Clinical Conflict)"}
                          </h2>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              conflictResolved
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                : "bg-amber-50 text-amber-700 border-amber-300"
                            }`}
                          >
                            {conflictResolved
                              ? "Conflict Fixed"
                              : "1 Clinical Conflict"}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={handleToggleResolveConflict}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                            conflictResolved
                              ? "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                          }`}
                        >
                          {conflictResolved ? (
                            <>
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Revert to Excluded</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Fix / Resolve Conflict</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div
                        className={`border rounded-xl overflow-hidden shadow-xs transition-colors ${
                          conflictResolved
                            ? "border-emerald-200 bg-emerald-50/20"
                            : "border-amber-200 bg-amber-50/20"
                        }`}
                      >
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr
                              className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                                conflictResolved
                                  ? "border-emerald-200/80 bg-emerald-50/50 text-emerald-900"
                                  : "border-amber-200/80 bg-amber-50/50 text-amber-900"
                              }`}
                            >
                              <th className="py-3 px-5 w-16" scope="col">
                                Select
                              </th>
                              <th className="py-3 px-5" scope="col">
                                Test Name
                              </th>
                              <th className="py-3 px-5" scope="col">
                                Conflict Description &amp; Resolution
                              </th>
                              <th
                                className="py-3 px-5 text-center w-36"
                                scope="col"
                              >
                                Status
                              </th>
                              <th
                                className="py-3 px-5 text-center w-32"
                                scope="col"
                              >
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-800">
                            <tr
                              className={`transition-colors ${
                                conflictResolved
                                  ? "hover:bg-emerald-50/30"
                                  : "hover:bg-amber-50/30"
                              }`}
                            >
                              <td className="py-3.5 px-5">
                                <input
                                  type="checkbox"
                                  checked={
                                    conflictResolved || isExcludedSelected
                                  }
                                  onChange={handleToggleResolveConflict}
                                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                                />
                              </td>
                              <td className="py-3.5 px-5 font-bold text-slate-900">
                                Glucose - Fasting (FBS)
                              </td>
                              <td className="py-3.5 px-5">
                                {conflictResolved ? (
                                  <div>
                                    <div className="font-bold text-emerald-700 flex items-center gap-1.5">
                                      <Check className="w-4 h-4" />
                                      <span>
                                        Conflict Resolved: Fasting Verified /
                                        Override Approved
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-0.5">
                                      Sample collection scheduled · Grey top
                                      (Sodium Fluoride) tube assigned
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <div className="font-bold text-rose-700">
                                      Fasting Requirement Mismatch
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-0.5">
                                      Clinical Conflict: Patient reported
                                      non-fasting meal 1.5 hours prior.
                                    </div>
                                  </div>
                                )}
                              </td>
                              <td className="py-3.5 px-5 text-center">
                                {conflictResolved ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    RESOLVED
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                    EXCLUDED
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-5 text-center">
                                <button
                                  type="button"
                                  onClick={handleToggleResolveConflict}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                                    conflictResolved
                                      ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
                                      : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                  }`}
                                >
                                  {conflictResolved ? (
                                    <>
                                      <RotateCcw className="w-3 h-3" />
                                      <span>Undo</span>
                                    </>
                                  ) : (
                                    <>
                                      <Check className="w-3 h-3" />
                                      <span>Fix Conflict</span>
                                    </>
                                  )}
                                </button>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </section>

                    {/* Navigation Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="px-5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 shadow-2xs transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Patient Details</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(3)}
                        className="px-6 py-2.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <span>Generate Sample Barcodes</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* -------------------------------------------------------------
                    STEP 3: SAMPLE BARCODE
                    ------------------------------------------------------------- */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    {/* Patient Summary Strip */}
                    <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                      <div className="p-2">
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Patient ID
                        </span>
                        <span className="mt-1 block text-base font-mono font-bold text-slate-900">
                          {selectedPatient.patientId}
                        </span>
                      </div>
                      <div className="p-2 md:pl-6">
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Patient Name
                        </span>
                        <span className="mt-1 block text-base font-bold text-slate-900">
                          {selectedPatient.patientName}
                        </span>
                      </div>
                      <div className="p-2 md:pl-6">
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Age / Gender
                        </span>
                        <span className="mt-1 block text-base font-bold text-slate-900">
                          {calculateAge(selectedPatient.dob)} Yrs /{" "}
                          {selectedPatient.gender}
                        </span>
                      </div>
                      <div className="p-2 md:pl-6">
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Request ID
                        </span>
                        <span className="mt-1 block text-base font-mono font-bold text-blue-600">
                          {selectedPatient.requestId}
                        </span>
                      </div>
                    </section>

                    {/* Print Feedback Toast */}
                    {printSuccessMessage && (
                      <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{printSuccessMessage}</span>
                        </div>
                        <button
                          onClick={() => setPrintSuccessMessage(null)}
                          className="text-emerald-700 hover:text-emerald-900 text-xs font-bold p-1 cursor-pointer"
                          type="button"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {/* Sample Barcode List Card */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
                        <div className="flex items-center gap-2">
                          <Barcode className="w-5 h-5 text-blue-600" />
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                            Sample Collection Tubes &amp; Barcode Labels
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={handlePrintAllBarcodes}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print All Barcodes</span>
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold tracking-wider text-slate-700 uppercase">
                              <th className="py-3 px-6 w-24">TEST CODE</th>
                              <th className="py-3 px-6">TEST NAME</th>
                              <th className="py-3 px-6">SAMPLE TUBE / TYPE</th>
                              <th className="py-3 px-6">BARCODE STRING</th>
                              <th className="py-3 px-6 text-center w-28">
                                TUBES
                              </th>
                              <th className="py-3 px-6 text-center w-28">
                                ACTION
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs font-medium">
                            {sampleBarcodes.map((item) => (
                              <tr
                                key={item.id}
                                className="hover:bg-slate-50/70 transition-colors"
                              >
                                <td className="py-3.5 px-6 font-mono font-bold text-blue-600">
                                  {item.testCode}
                                </td>
                                <td className="py-3.5 px-6 font-semibold text-slate-900">
                                  {item.testName}
                                </td>
                                <td className="py-3.5 px-6 text-slate-600">
                                  {item.sampleType}
                                </td>
                                <td className="py-3.5 px-6">
                                  <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-300 rounded px-2.5 py-1">
                                    <Barcode className="w-4 h-4 text-slate-500" />
                                    <span className="font-mono text-xs font-bold text-slate-800 tracking-wider">
                                      {item.barcode}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3.5 px-6 text-center">
                                  <div className="inline-flex items-center border border-slate-300 rounded-md bg-white shadow-2xs">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDecrementBarcodeCount(item.id)
                                      }
                                      className="px-2 py-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                      title="Decrease count"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="px-2.5 py-1 text-xs font-bold text-slate-900 min-w-[24px]">
                                      {item.count}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleIncrementBarcodeCount(item.id)
                                      }
                                      className="px-2 py-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                      title="Increase count"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>
                                <td className="py-3.5 px-6 text-center">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handlePrintSingleBarcode(item)
                                    }
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span>Print</span>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="px-5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 shadow-2xs transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Test Alignment</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCompleteAndSave}
                        className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Complete &amp; Save Requisition</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </main>
          </div>
        ) : (
          /* =========================================================================
              VIEW 2: RAZOR-SHARP LAB TECHNICIAN DASHBOARD
              ========================================================================= */
          <>
            {/* Top Navbar */}
            <header className="h-16 border-b border-slate-200 bg-white/95 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
              {/* Breadcrumb & Live Tag */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-900 tracking-tight">
                  Requisitions &amp; Processing Queue
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live System
                </span>
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center gap-4">
                {/* Branch Chip */}
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium border border-slate-200">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{branchName}</span>
                </div>

                {/* Notification Bell */}
                <div className="relative p-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer text-slate-600">
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-0.5 right-0.5 bg-rose-600 text-white font-bold text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center">
                    4
                  </span>
                </div>

                <div className="h-4 w-[1px] bg-slate-200" />

                {/* Technician Profile & Logout */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-bold text-slate-900 leading-tight">
                        {displayName}
                      </span>
                      <span className="text-[10px] font-semibold text-blue-600 leading-tight">
                        {displayRole}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    title="Sign Out"
                    className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-md transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </header>

            {/* Dashboard Content */}
            <main className="flex-1 p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
              {/* Razor-Sharp KPI Metric Cards */}
              <section
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
                data-purpose="kpi-metric-cards"
              >
                {/* Card 1: Tests Completed */}
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                      Tests Completed
                    </span>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight mt-1 font-mono">
                      128
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1">
                      <span className="text-emerald-600 font-bold">✓ 100%</span>
                      <span>validated &amp; signed</span>
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                    <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
                  </div>
                </div>

                {/* Card 2: Test Results Pending */}
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                      Results Pending
                    </span>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight mt-1 font-mono">
                      56
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1">
                      <span className="text-blue-600 font-bold">
                        In Analysis
                      </span>
                      <span>awaiting entry</span>
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                    <Clock className="w-6 h-6 stroke-[2.2]" />
                  </div>
                </div>

                {/* Card 3: Test Overdue */}
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                      Tests Overdue
                    </span>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight mt-1 font-mono">
                      18
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1">
                      <span className="text-amber-600 font-bold">
                        High Priority
                      </span>
                      <span>past expected TAT</span>
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                    <AlertCircle className="w-6 h-6 stroke-[2.2]" />
                  </div>
                </div>

                {/* Card 4: Repeat Required */}
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
                      Repeat Required
                    </span>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight mt-1 font-mono">
                      11
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1">
                      <span className="text-rose-600 font-bold">
                        Sample Mismatch
                      </span>
                      <span>recollection needed</span>
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                    <RotateCcw className="w-6 h-6 stroke-[2.2]" />
                  </div>
                </div>
              </section>

              {/* Razor-Sharp Tests Requisitions Table Card */}
              <section
                className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
                data-purpose="tests-details-container"
              >
                {/* Table Header Controls */}
                <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Requisitions Queue
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Select any patient row to open alignment, verification,
                      and barcode workflow
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    {/* Status Pill Filters */}
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
                        All ({testsList.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter("PROCESSING")}
                        className={`px-3 py-1 rounded-md transition-all ${
                          statusFilter === "PROCESSING"
                            ? "bg-white text-amber-800 shadow-2xs font-bold"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Processing (
                        {
                          testsList.filter((t) => t.status === "PROCESSING")
                            .length
                        }
                        )
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter("COMPLETED")}
                        className={`px-3 py-1 rounded-md transition-all ${
                          statusFilter === "COMPLETED"
                            ? "bg-white text-emerald-800 shadow-2xs font-bold"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Completed (
                        {
                          testsList.filter((t) => t.status === "COMPLETED")
                            .length
                        }
                        )
                      </button>
                    </div>

                    {/* Search Input */}
                    <div className="relative flex-1 sm:w-64">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search Requisition / Patient..."
                        type="text"
                        className="w-full pl-9 pr-8 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all shadow-2xs"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table
                    className="w-full text-left border-collapse"
                    id="tests-details-table"
                  >
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold tracking-wider text-slate-700 uppercase">
                        <th className="py-3 px-6" scope="col">
                          REQUEST ID
                        </th>
                        <th className="py-3 px-6" scope="col">
                          PATIENT NAME
                        </th>
                        <th className="py-3 px-6" scope="col">
                          REQUESTED BY
                        </th>
                        <th className="py-3 px-6" scope="col">
                          TESTS
                        </th>
                        <th className="py-3 px-6 text-center" scope="col">
                          DATE &amp; TIME
                        </th>
                        <th className="py-3 px-6 text-center" scope="col">
                          STATUS
                        </th>
                        <th className="py-3 px-6 text-right" scope="col">
                          ACTION
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium">
                      {filteredTests.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="py-12 text-center text-slate-400 text-xs font-medium"
                          >
                            No test records found matching your filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredTests.map((test) => (
                          <tr
                            key={test.id}
                            onClick={() => handleSelectPatient(test)}
                            className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                            title={`Click to open test workflow for ${test.patientName}`}
                          >
                            {/* Request ID */}
                            <td className="py-3.5 px-6 font-mono font-bold text-blue-600 group-hover:underline">
                              {test.requestId}
                            </td>

                            {/* Patient Name */}
                            <td className="py-3.5 px-6">
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={
                                    test.avatarUrl ||
                                    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"
                                  }
                                  alt={test.patientName}
                                  className="w-7 h-7 rounded-md object-cover ring-1 ring-slate-200 shrink-0"
                                />
                                <div>
                                  <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors block">
                                    {test.patientName}
                                  </span>
                                  <span className="font-mono text-[11px] text-slate-500">
                                    {test.patientId}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Doctor */}
                            <td className="py-3.5 px-6 text-slate-700 font-semibold">
                              {test.requestedBy}
                            </td>

                            {/* Tests Badges */}
                            <td className="py-3.5 px-6">
                              <div className="flex flex-wrap gap-1">
                                {test.tests.split(",").map((tName, i) => (
                                  <span
                                    key={i}
                                    className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-semibold"
                                  >
                                    {tName.trim()}
                                  </span>
                                ))}
                              </div>
                            </td>

                            {/* Date & Time */}
                            <td className="py-3.5 px-6 text-center text-slate-600 font-mono">
                              <div className="font-semibold text-slate-800">
                                {test.date || "-"}
                              </div>
                              {test.time && (
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  {test.time}
                                </div>
                              )}
                            </td>

                            {/* Status Badge */}
                            <td className="py-3.5 px-6 text-center">
                              {test.status === "PROCESSING" ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  PROCESSING
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  COMPLETED
                                </span>
                              )}
                            </td>

                            {/* Action Button */}
                            <td className="py-3.5 px-6 text-right">
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-700 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all font-bold text-xs shadow-2xs">
                                <span>Process</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer */}
                <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 font-medium">
                  <div>
                    Showing{" "}
                    <span className="font-bold text-slate-800">
                      {filteredTests.length}
                    </span>{" "}
                    of{" "}
                    <span className="font-bold text-slate-800">
                      {testsList.length}
                    </span>{" "}
                    total requisitions
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">Status:</span>
                    <span className="font-semibold text-slate-700">
                      {statusFilter}
                    </span>
                  </div>
                </div>
              </section>
            </main>
          </>
        )}
      </div>
    </div>
  );
}
