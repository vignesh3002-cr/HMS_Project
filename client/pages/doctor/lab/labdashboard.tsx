import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getUser, remove } from "@/utils/token";

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
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDZMXzSl6vglUzJD1gAtLBuVl-m0g78QhYN9DT2s4axXvsVF82ZoFg_e5GxLjiZDhnS_LCQBU1bXTcjI_IstH-1TKAp8NAkWDpDvk5la7NP5MMg7eM-ZWrolAkpPd_DNMuf3szKtBzWSI2V5QdexlZROSy6nTOMNHXQnoesquILMCgFS255HcumKzzzKill-Gw8swiaNe_Vz9PziNeTCel7jUe1uns_cHrWeeZvYPD1ZxYYXSwepHyeIg",
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
    requestedBy: "Dr.John",
    requestTime: "03 Apr 2026 10:45 AM",
    tests: "KFT, Lipid Profile",
    date: "03/04/26",
    time: "10:45AM",
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

// Helper to calculate age from DOB string (e.g. 15/06/1985 -> 38)
const calculateAge = (dobString?: string): number => {
  if (!dobString) return 38;
  const parts = dobString.split(/[-/]/);
  if (parts.length === 3) {
    let year = parseInt(parts[2], 10);
    if (isNaN(year) || year < 100) year = parseInt(parts[0], 10);
    if (!isNaN(year) && year > 1900 && year <= 2026) {
      return Math.max(1, 2024 - year);
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
    sampleType: "Whole Blood",
    barcode: "BC2405200001",
    count: 1,
  },
  {
    id: "lft",
    testCode: "LFT",
    testName: "Liver Function Test",
    sampleType: "Serum",
    barcode: "BC2405200002",
    count: 1,
  },
  {
    id: "kft",
    testCode: "KFT",
    testName: "Kidney Function Test",
    sampleType: "Serum",
    barcode: "BC2405200003",
    count: 1,
  },
];

export default function LabDashboard() {
  const navigate = useNavigate();
  const currentUser = getUser();
  const displayName = currentUser?.username || "Lab Technician";
  const displayRole =
    currentUser?.role_type === "LAB_TECHNICIAN"
      ? "Lab Technician"
      : currentUser?.role_type || "Lab Technician";

  const handleLogout = () => {
    remove();
    navigate("/", { replace: true });
  };

  const [activeNav, setActiveNav] = useState("Dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PROCESSING" | "COMPLETED">("ALL");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  // Editable tests list so "Complete & Save" reflects in the dashboard
  const [testsList, setTestsList] = useState<TestRecord[]>(INITIAL_TESTS);

  // Selected patient for expanded registration view
  const [selectedPatient, setSelectedPatient] = useState<TestRecord | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 2: Test Alignment selection states
  const [selectedValidTests, setSelectedValidTests] = useState<string[]>([
    "cbc",
    "lft",
    "kft",
  ]);
  const [isExcludedSelected, setIsExcludedSelected] = useState<boolean>(false);

  // Step 3: Sample Barcode states
  const [sampleBarcodes, setSampleBarcodes] = useState<SampleBarcodeItem[]>(INITIAL_SAMPLES);
  const [printSuccessMessage, setPrintSuccessMessage] = useState<string | null>(null);

  const handleToggleValidTest = (id: string) => {
    setSelectedValidTests((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
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
        item.id === id ? { ...item, count: item.count + 1 } : item
      )
    );
  };

  const handleDecrementBarcodeCount = (id: string) => {
    setSampleBarcodes((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, count: Math.max(1, item.count - 1) } : item
      )
    );
  };

  const handlePrintSingleBarcode = (item: SampleBarcodeItem) => {
    setPrintSuccessMessage(`Barcode label ${item.barcode} for ${item.testCode} sent to printer!`);
    setTimeout(() => setPrintSuccessMessage(null), 3500);
  };

  const handlePrintAllBarcodes = () => {
    setPrintSuccessMessage(`All ${sampleBarcodes.length} sample barcode labels sent to printer!`);
    setTimeout(() => setPrintSuccessMessage(null), 3500);
  };

  const handleCompleteAndSave = () => {
    if (selectedPatient) {
      setTestsList((prev) =>
        prev.map((t) =>
          t.id === selectedPatient.id ? { ...t, status: "COMPLETED" } : t
        )
      );
    }
    alert(`Requisition ${selectedPatient?.requestId} for ${selectedPatient?.patientName} successfully completed and saved!`);
    handleBackToDashboard();
  };

  // Form state for the active patient registration details
  const [patientFormData, setPatientFormData] = useState({
    patientId: "",
    fullName: "",
    dob: "",
    gender: "",
    mobile: "",
    email: "",
    address: "",
  });

  const handleSelectPatient = (patient: TestRecord) => {
    setSelectedPatient(patient);
    setCurrentStep(1);
    setSelectedValidTests(["cbc", "lft", "kft"]);
    setIsExcludedSelected(false);
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
    setSampleBarcodes(INITIAL_SAMPLES);
    setPrintSuccessMessage(null);
  };

  const filteredTests = useMemo(() => {
    return testsList.filter((test) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        test.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        test.requestId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        test.requestedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        test.tests.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" || test.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [testsList, searchQuery, statusFilter]);

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
              onClick={() => {
                setActiveNav("Dashboard");
                setSelectedPatient(null);
              }}
              className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                activeNav === "Dashboard" && !selectedPatient
                  ? "bg-[#004bb5] text-white shadow-sm"
                  : "text-[#334155] hover:bg-slate-200/60"
              }`}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 3h8v8H3V3zm10 0h8v5h-8V3zm0 7h8v11h-8V10zm-10 3h8v8H3v-8z" />
              </svg>
              <span>Dashboard</span>
            </button>

            {/* Samples Verification */}
            <button
              type="button"
              onClick={() => {
                navigate("/lab/sample-verification");
              }}
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
              onClick={() => {
                navigate("/lab/testing-samples");
              }}
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
              onClick={() => {
                navigate("/lab/report-generation");
              }}
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
              onClick={() => {
                navigate("/lab/report-transfer");
              }}
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
          </nav>
        </div>

        {/* Bottom Part: Settings, Support & Admin Profile */}
        <div className="px-3 pb-6 space-y-1">
          {/* Settings */}
          <a
            className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-[#475569] hover:bg-slate-200/60 rounded-lg transition-colors"
            href="#settings"
            onClick={(e) => e.preventDefault()}
          >
            <svg
              className="w-5 h-5 text-slate-500"
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
              <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Settings</span>
          </a>

          {/* Support */}
          <a
            className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-[#475569] hover:bg-slate-200/60 rounded-lg transition-colors"
            href="#support"
            onClick={(e) => e.preventDefault()}
          >
            <svg
              className="w-5 h-5 text-slate-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
              <path
                d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3m.08 4h.01"
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
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
      {/* END: LeftSidebar */}

      {/* Main Content Area */}
      <div className="flex-1 ml-[260px] min-h-screen flex flex-col min-w-0 bg-white">
        {/* =========================================================================
            VIEW 1: PATIENT REGISTRATION (When a patient row is selected / expanded)
            ========================================================================= */}
        {selectedPatient ? (
          <div className="flex-1 flex flex-col min-w-0 bg-white">
            {/* TopHeader */}
            <header
              className="w-full border-b border-gray-200 bg-white flex-shrink-0"
              data-purpose="page-header"
            >
              <div className="max-w-7xl mx-auto px-6 lg:px-8 h-20 flex items-center justify-between">
                {/* Title and Back button */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleBackToDashboard}
                    className="p-1.5 -ml-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Back to Dashboard"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                  </button>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                    {currentStep === 1
                      ? "Patient Registration"
                      : currentStep === 2
                      ? "Test Alignment"
                      : "Sample Barcode"}
                  </h1>
                </div>

                {/* User Profile Info & Logout */}
                <div className="flex items-center space-x-3" data-purpose="user-badge">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#0b57d0] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-slate-700">{displayName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </div>
              </div>
            </header>

            {/* StepperWizard */}
            <section
              className="py-4 border-b border-slate-100 bg-white"
              data-purpose="stepper-section"
            >
              <nav aria-label="Progress" className="flex items-center justify-center pt-2 pb-3" data-purpose="stepper">
                <ol className="flex items-center space-x-4 sm:space-x-6 text-sm font-medium">
                  {/* Step 1 */}
                  <li className="flex items-center space-x-2.5">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="flex items-center space-x-2.5 focus:outline-none cursor-pointer"
                    >
                      {currentStep > 1 ? (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00A86B] text-white shadow-sm">
                          <svg className="w-4 h-4 stroke-white stroke-[2.5]" fill="none" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                      ) : (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0B57D0] text-white text-xs font-bold shadow-sm">
                          1
                        </span>
                      )}
                      <span className="text-sm font-medium text-slate-900 whitespace-nowrap">
                        Patient Details
                      </span>
                    </button>
                  </li>

                  {/* Connector Line 1 */}
                  <li className={`w-20 sm:w-32 md:w-36 h-[2px] transition-colors ${currentStep > 1 ? "bg-[#00A86B]" : "bg-slate-200"}`} />

                  {/* Step 2 */}
                  <li className="flex items-center space-x-2.5">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="flex items-center space-x-2.5 focus:outline-none cursor-pointer"
                    >
                      {currentStep > 2 ? (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00A86B] text-white shadow-sm">
                          <svg className="w-4 h-4 stroke-white stroke-[2.5]" fill="none" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                      ) : currentStep === 2 ? (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0B57D0] text-white text-xs font-bold shadow-sm">
                          2
                        </span>
                      ) : (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 text-xs font-semibold">
                          2
                        </span>
                      )}
                      <span className={`text-sm whitespace-nowrap ${currentStep === 2 ? "text-slate-900 font-bold" : currentStep > 2 ? "text-slate-900 font-medium" : "text-slate-400 font-normal"}`}>
                        Test Alignment
                      </span>
                    </button>
                  </li>

                  {/* Connector Line 2 */}
                  <li className="w-20 sm:w-32 md:w-36 h-[2px] bg-slate-200" />

                  {/* Step 3 */}
                  <li className="flex items-center space-x-2.5">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="flex items-center space-x-2.5 focus:outline-none cursor-pointer"
                    >
                      {currentStep === 3 ? (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0B57D0] text-white text-sm font-semibold shadow-sm">
                          3
                        </span>
                      ) : (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 text-xs font-semibold">
                          3
                        </span>
                      )}
                      <span className={`text-sm whitespace-nowrap ${currentStep === 3 ? "text-[#0B57D0] font-medium" : "text-slate-400 font-normal"}`}>
                        Sample Barcode
                      </span>
                    </button>
                  </li>
                </ol>
              </nav>
            </section>

            {/* PageContent */}
            <main
              className="flex-1 bg-white py-8 px-6 lg:px-8 overflow-y-auto"
              data-purpose="main-registration-content"
            >
              <div className={currentStep === 1 ? "max-w-[820px] mx-auto space-y-4" : "max-w-7xl w-full mx-auto pb-16 space-y-8"}>
                {/* STEP 1: Patient Details */}
                {currentStep === 1 && (
                  <>
                    {/* Registration Form Card */}
                    <div
                      className="bg-white rounded-xl border border-slate-200 shadow-sm p-8"
                      data-purpose="registration-card"
                    >
                      {/* Request Information Header & Grid */}
                      <section
                        className="pb-6 border-b border-slate-200"
                        data-purpose="request-information-section"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-xs font-bold text-slate-900 tracking-wider uppercase mb-5">
                              REQUEST INFORMATION
                            </h3>
                            <div className="grid grid-cols-3 gap-8 text-sm">
                              <div>
                                <p className="text-xs text-slate-500 font-normal mb-1">
                                  Request ID
                                </p>
                                <p className="text-slate-900 font-bold text-sm tracking-tight">
                                  {selectedPatient.requestId}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 font-normal mb-1">
                                  Requested By
                                </p>
                                <p className="text-slate-900 font-bold text-sm tracking-tight">
                                  {selectedPatient.requestedBy}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 font-normal mb-1">
                                  Request Time
                                </p>
                                <p className="text-slate-900 font-bold text-sm tracking-tight">
                                  {selectedPatient.requestTime}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Patient Portrait Thumbnail */}
                          <div className="flex-shrink-0 ml-4">
                            <img
                              alt={selectedPatient.patientName}
                              className="w-16 h-16 rounded-full object-cover ring-2 ring-[#0b57d0]/20 shadow-sm"
                              src={
                                selectedPatient.avatarUrl ||
                                "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"
                              }
                            />
                          </div>
                        </div>
                      </section>

                      {/* Patient Information Form */}
                      <section className="pt-6" data-purpose="patient-form-section">
                        <h3 className="text-xs font-bold text-slate-900 tracking-wider uppercase mb-5">
                          PATIENT INFORMATION
                        </h3>
                        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                          {/* Row 1: Patient ID & Full Name */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label
                                className="block text-xs font-medium text-slate-600 mb-1.5"
                                htmlFor="patient-id"
                              >
                                Patient ID
                              </label>
                              <input
                                className="w-full bg-[#f8fafc] border border-slate-200 text-slate-800 text-sm rounded-lg px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-colors font-medium"
                                id="patient-id"
                                type="text"
                                value={patientFormData.patientId}
                                onChange={(e) =>
                                  setPatientFormData({
                                    ...patientFormData,
                                    patientId: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div>
                              <label
                                className="block text-xs font-medium text-slate-600 mb-1.5"
                                htmlFor="full-name"
                              >
                                Full Name
                              </label>
                              <input
                                className="w-full bg-[#f8fafc] border border-slate-200 text-slate-800 text-sm rounded-lg px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-colors font-medium"
                                id="full-name"
                                type="text"
                                value={patientFormData.fullName}
                                onChange={(e) =>
                                  setPatientFormData({
                                    ...patientFormData,
                                    fullName: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>

                          {/* Row 2: Date of Birth & Gender */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label
                                className="block text-xs font-medium text-slate-600 mb-1.5"
                                htmlFor="dob"
                              >
                                Date of Birth
                              </label>
                              <div className="relative">
                                <input
                                  className="w-full bg-[#f8fafc] border border-slate-200 text-slate-800 text-sm rounded-lg px-3.5 py-2.5 pr-10 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-colors font-medium"
                                  id="dob"
                                  type="text"
                                  value={patientFormData.dob}
                                  onChange={(e) =>
                                    setPatientFormData({
                                      ...patientFormData,
                                      dob: e.target.value,
                                    })
                                  }
                                />
                                {/* Calendar Icon */}
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    viewBox="0 0 24 24"
                                  >
                                    <rect height="18" rx="2" ry="2" width="18" x="3" y="4" />
                                    <line x1="16" x2="16" y1="2" y2="6" />
                                    <line x1="8" x2="8" y1="2" y2="6" />
                                    <line x1="3" x2="21" y1="10" y2="10" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                            <div>
                              <label
                                className="block text-xs font-medium text-slate-600 mb-1.5"
                                htmlFor="gender"
                              >
                                Gender
                              </label>
                              <input
                                className="w-full bg-[#f8fafc] border border-slate-200 text-slate-800 text-sm rounded-lg px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-colors font-medium"
                                id="gender"
                                type="text"
                                value={patientFormData.gender}
                                onChange={(e) =>
                                  setPatientFormData({
                                    ...patientFormData,
                                    gender: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>

                          {/* Row 3: Mobile Number */}
                          <div>
                            <label
                              className="block text-xs font-medium text-slate-600 mb-1.5"
                              htmlFor="mobile-number"
                            >
                              Mobile Number
                            </label>
                            <input
                              className="w-full bg-[#f8fafc] border border-slate-200 text-slate-800 text-sm rounded-lg px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-colors font-medium"
                              id="mobile-number"
                              type="text"
                              value={patientFormData.mobile}
                              onChange={(e) =>
                                setPatientFormData({
                                  ...patientFormData,
                                  mobile: e.target.value,
                                })
                              }
                            />
                          </div>

                          {/* Row 4: Email */}
                          <div>
                            <label
                              className="block text-xs font-medium text-slate-600 mb-1.5"
                              htmlFor="email"
                            >
                              Email
                            </label>
                            <input
                              className="w-full bg-[#f8fafc] border border-slate-200 text-slate-800 text-sm rounded-lg px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-colors font-medium"
                              id="email"
                              type="email"
                              value={patientFormData.email}
                              onChange={(e) =>
                                setPatientFormData({
                                  ...patientFormData,
                                  email: e.target.value,
                                })
                              }
                            />
                          </div>

                          {/* Row 5: Address */}
                          <div>
                            <label
                              className="block text-xs font-medium text-slate-600 mb-1.5"
                              htmlFor="address"
                            >
                              Address
                            </label>
                            <input
                              className="w-full bg-[#f8fafc] border border-slate-200 text-slate-800 text-sm rounded-lg px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-colors font-medium"
                              id="address"
                              type="text"
                              value={patientFormData.address}
                              onChange={(e) =>
                                setPatientFormData({
                                  ...patientFormData,
                                  address: e.target.value,
                                })
                              }
                            />
                          </div>
                        </form>
                      </section>
                    </div>

                    {/* Action Buttons Container */}
                    <div
                      className="flex items-center justify-between pt-1"
                      data-purpose="form-navigation-actions"
                    >
                      <button
                        onClick={handleBackToDashboard}
                        className="px-7 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 flex items-center gap-2"
                        type="button"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back
                      </button>
                      <button
                        onClick={() => setCurrentStep(2)}
                        className="px-8 py-2.5 bg-[#0b57d0] hover:bg-[#094bb5] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2"
                        type="button"
                      >
                        Next
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </button>
                    </div>
                  </>
                )}

                {/* STEP 2: Test Alignment */}
                {currentStep === 2 && (
                  <div className="space-y-9">
                    {/* BEGIN: PatientSummaryCard */}
                    <section
                      className="rounded-2xl bg-[#eff6ff]/70 border border-[#dbeafe] p-7"
                      data-purpose="patient-summary"
                    >
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {/* Patient ID */}
                        <div>
                          <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                            Patient ID
                          </span>
                          <span className="mt-1.5 block text-xl font-bold text-slate-900">
                            {selectedPatient.patientId}
                          </span>
                        </div>
                        {/* Patient Name */}
                        <div>
                          <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                            Patient Name
                          </span>
                          <span className="mt-1.5 block text-xl font-bold text-slate-900">
                            {selectedPatient.patientName}
                          </span>
                        </div>
                        {/* Age / Gender */}
                        <div>
                          <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                            Age / Gender
                          </span>
                          <span className="mt-1.5 block text-xl font-bold text-slate-900">
                            {calculateAge(selectedPatient.dob)} / {selectedPatient.gender}
                          </span>
                        </div>
                        {/* Request ID */}
                        <div>
                          <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                            Request ID
                          </span>
                          <span className="mt-1.5 block text-xl font-bold text-slate-900">
                            {selectedPatient.requestId}
                          </span>
                        </div>
                      </div>
                    </section>
                    {/* END: PatientSummaryCard */}

                    {/* BEGIN: ValidTestsSection */}
                    <section className="space-y-3" data-purpose="valid-tests-group">
                      {/* Header & Description */}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-emerald-600">
                            <svg
                              className="w-6 h-6 fill-none stroke-emerald-600 stroke-[2.2]"
                              viewBox="0 0 24 24"
                            >
                              <circle cx="12" cy="12" r="9.5" />
                              <polyline
                                points="8 12.2 10.8 15 16 9.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                          <h2 className="text-xl font-bold text-slate-900">
                            Valid Tests to Proceed
                          </h2>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          These tests meet all pre-analytical requirements and are ready for sampling.
                        </p>
                      </div>

                      {/* Valid Tests Table */}
                      <div className="border border-slate-200/90 rounded-xl overflow-hidden bg-white shadow-xs">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 bg-[#f8fafc]/80 text-[13px] font-bold text-slate-600 uppercase tracking-wider">
                              <th className="py-4 px-6 w-28" scope="col">
                                <span className="sr-only">Select</span>
                                <input
                                  type="checkbox"
                                  checked={selectedValidTests.length === 3}
                                  onChange={handleToggleAllValid}
                                  className="h-5 w-5 rounded bg-[#1d6bf3] border-slate-300 text-[#1d6bf3] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                />
                              </th>
                              <th className="py-4 px-6 w-1/3" scope="col">
                                Test Name
                              </th>
                              <th className="py-4 px-6 w-1/4" scope="col">
                                Sample Type
                              </th>
                              <th className="py-4 px-6 w-1/4" scope="col">
                                Priority
                              </th>
                              <th className="py-4 px-6 text-center w-28" scope="col">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-sm font-normal text-slate-800">
                            {/* Row 1: Complete Blood Count */}
                            <tr className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-4 px-6">
                                <input
                                  type="checkbox"
                                  checked={selectedValidTests.includes("cbc")}
                                  onChange={() => handleToggleValidTest("cbc")}
                                  className="h-5 w-5 rounded bg-[#1d6bf3] border-slate-300 text-[#1d6bf3] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                />
                              </td>
                              <td className="py-4 px-6 font-medium text-slate-800">
                                Complete Blood Count
                              </td>
                              <td className="py-4 px-6 text-slate-700">Whole Blood</td>
                              <td className="py-4 px-6 text-slate-700">Normal</td>
                              <td className="py-4 px-6 text-center">
                                <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-100/70 text-emerald-800">
                                  READY
                                </span>
                              </td>
                            </tr>

                            {/* Row 2: Liver Function Test */}
                            <tr className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-4 px-6">
                                <input
                                  type="checkbox"
                                  checked={selectedValidTests.includes("lft")}
                                  onChange={() => handleToggleValidTest("lft")}
                                  className="h-5 w-5 rounded bg-[#1d6bf3] border-slate-300 text-[#1d6bf3] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                />
                              </td>
                              <td className="py-4 px-6 font-medium text-slate-800">
                                Liver Function Test
                              </td>
                              <td className="py-4 px-6 text-slate-700">Serum</td>
                              <td className="py-4 px-6 text-slate-700">Normal</td>
                              <td className="py-4 px-6 text-center">
                                <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-100/70 text-emerald-800">
                                  READY
                                </span>
                              </td>
                            </tr>

                            {/* Row 3: Kidney Function Test */}
                            <tr className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-4 px-6">
                                <input
                                  type="checkbox"
                                  checked={selectedValidTests.includes("kft")}
                                  onChange={() => handleToggleValidTest("kft")}
                                  className="h-5 w-5 rounded bg-[#1d6bf3] border-slate-300 text-[#1d6bf3] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                />
                              </td>
                              <td className="py-4 px-6 font-medium text-slate-800">
                                Kidney Function Test
                              </td>
                              <td className="py-4 px-6 text-slate-700">Serum</td>
                              <td className="py-4 px-6 text-slate-700">Normal</td>
                              <td className="py-4 px-6 text-center">
                                <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-100/70 text-emerald-800">
                                  READY
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </section>
                    {/* END: ValidTestsSection */}

                    {/* BEGIN: ExcludedTestsSection */}
                    <section className="space-y-3 pt-2" data-purpose="excluded-tests-group">
                      {/* Header & Description */}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-red-600">
                            <svg
                              className="w-6 h-6 stroke-red-600 fill-none stroke-[2]"
                              viewBox="0 0 24 24"
                            >
                              <path
                                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                          <h2 className="text-xl font-bold text-red-600 tracking-tight">
                            Excluded Tests (Requires Action)
                          </h2>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          The following tests cannot be performed due to clinical conflicts or missing requirements.
                        </p>
                      </div>

                      {/* Excluded Tests Table */}
                      <div className="border border-slate-200/90 rounded-xl overflow-hidden bg-white shadow-xs">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 bg-[#f8fafc]/80 text-[13px] font-bold text-slate-600 uppercase tracking-wider">
                              <th className="py-4 px-6 w-28" scope="col">
                                Select
                              </th>
                              <th className="py-4 px-6 w-1/3" scope="col">
                                Test Name
                              </th>
                              <th className="py-4 px-6 w-1/2" scope="col">
                                Reason For Exclusion
                              </th>
                              <th className="py-4 px-6 text-center w-28" scope="col">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-sm font-normal text-slate-800">
                            {/* Row 1: Glucose - Fasting */}
                            <tr className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-5 px-6">
                                <input
                                  type="checkbox"
                                  checked={isExcludedSelected}
                                  onChange={() => setIsExcludedSelected(!isExcludedSelected)}
                                  className="h-5 w-5 rounded border border-slate-400/80 text-[#1d6bf3] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                />
                              </td>
                              <td className="py-5 px-6 font-medium text-slate-800">
                                Glucose - Fasting
                              </td>
                              <td className="py-5 px-6">
                                <div className="font-bold text-red-600">
                                  Fasting Requirement Mismatch
                                </div>
                                <div className="text-xs text-slate-600 mt-0.5">
                                  Conflict: Sample taken Post-Fasting
                                </div>
                              </td>
                              <td className="py-5 px-6 text-center">
                                <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-bold tracking-tight bg-red-100 text-red-700">
                                  EXCLUDED
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </section>
                    {/* END: ExcludedTestsSection */}

                    {/* BEGIN: BottomActionBar */}
                    <footer
                      className="w-full border-t border-slate-200 bg-white pt-6 mt-8"
                      data-purpose="action-footer"
                    >
                      <div className="flex items-center justify-between">
                        {/* Back Button */}
                        <button
                          onClick={() => setCurrentStep(1)}
                          className="px-8 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm font-medium hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-xs cursor-pointer"
                          type="button"
                        >
                          Back
                        </button>
                        {/* Next Button */}
                        <button
                          onClick={() => setCurrentStep(3)}
                          className="px-10 py-2.5 rounded-lg bg-[#1d6bf3] text-white text-sm font-semibold hover:bg-blue-600 active:bg-blue-700 transition-colors shadow-sm cursor-pointer"
                          type="button"
                        >
                          Next
                        </button>
                      </div>
                    </footer>
                    {/* END: BottomActionBar */}
                  </div>
                )}

                {/* STEP 3: Sample Barcode */}
                {currentStep === 3 && (
                  <div className="space-y-8">
                    {/* BEGIN: PatientSummaryCard */}
                    <section
                      className="bg-[#F8FAFC]/50 border border-blue-100/80 rounded-2xl p-6 shadow-sm"
                      data-purpose="patient-summary"
                    >
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {/* Patient ID */}
                        <div>
                          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                            Patient ID
                          </p>
                          <p className="text-lg font-bold text-slate-900 tracking-tight">
                            {selectedPatient.patientId}
                          </p>
                        </div>
                        {/* Patient Name */}
                        <div>
                          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                            Patient Name
                          </p>
                          <p className="text-lg font-bold text-slate-900 tracking-tight">
                            {selectedPatient.patientName}
                          </p>
                        </div>
                        {/* Age / Gender */}
                        <div>
                          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                            Age / Gender
                          </p>
                          <p className="text-lg font-bold text-slate-900 tracking-tight">
                            {calculateAge(selectedPatient.dob)} / {selectedPatient.gender}
                          </p>
                        </div>
                        {/* Request ID */}
                        <div>
                          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                            Request ID
                          </p>
                          <p className="text-lg font-bold text-slate-900 tracking-tight">
                            {selectedPatient.requestId}
                          </p>
                        </div>
                      </div>
                    </section>
                    {/* END: PatientSummaryCard */}

                    {/* Print Feedback Notification */}
                    {printSuccessMessage && (
                      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center justify-between shadow-xs">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>{printSuccessMessage}</span>
                        </div>
                        <button
                          onClick={() => setPrintSuccessMessage(null)}
                          className="text-emerald-700 hover:text-emerald-900 text-xs font-bold cursor-pointer"
                          type="button"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {/* BEGIN: SampleDetailsSection */}
                    <section className="flex-1" data-purpose="sample-details">
                      <h3 className="text-lg font-bold text-slate-900 mb-4">
                        Sample Details
                      </h3>
                      {/* Table Container */}
                      <div className="w-full border-b border-slate-200 overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/80 border-y border-slate-200/80 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                              <th className="py-3.5 px-6 font-semibold w-1/5">TEST CODE</th>
                              <th className="py-3.5 px-6 font-semibold w-1/4">TEST NAME</th>
                              <th className="py-3.5 px-6 font-semibold w-1/4">SAMPLE TYPE</th>
                              <th className="py-3.5 px-6 font-semibold">BARCODE</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-sm">
                            {sampleBarcodes.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                                <td className="py-4 px-6 font-semibold text-slate-900">
                                  {item.testCode}
                                </td>
                                <td className="py-4 px-6 text-slate-600">
                                  {item.testName}
                                </td>
                                <td className="py-4 px-6 text-slate-600">
                                  {item.sampleType}
                                </td>
                                <td className="py-4 px-6">
                                  <div className="flex items-center gap-3">
                                    <input
                                      className="w-48 bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-700 font-mono tracking-tight shadow-sm focus:outline-none"
                                      readOnly
                                      type="text"
                                      value={item.barcode}
                                    />
                                    {/* Action: Minus */}
                                    <button
                                      onClick={() => handleDecrementBarcodeCount(item.id)}
                                      className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
                                      title="Decrease tubes"
                                      type="button"
                                    >
                                      <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        viewBox="0 0 24 24"
                                      >
                                        <line x1="5" x2="19" y1="12" y2="12" />
                                      </svg>
                                    </button>
                                    {/* Action: Print */}
                                    <button
                                      onClick={() => handlePrintSingleBarcode(item)}
                                      className="border border-blue-200 hover:bg-blue-50 text-[#0B57D0] p-1.5 rounded-md shadow-xs transition-colors cursor-pointer"
                                      title={`Print ${item.testCode} label (${item.count} tube${item.count > 1 ? "s" : ""})`}
                                      type="button"
                                    >
                                      <svg
                                        className="w-4 h-4 stroke-current fill-none stroke-2"
                                        viewBox="0 0 24 24"
                                      >
                                        <polyline points="6 9 6 2 18 2 18 9" />
                                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                                        <rect height="8" width="12" x="6" y="14" />
                                      </svg>
                                    </button>
                                    {/* Action: Plus */}
                                    <button
                                      onClick={() => handleIncrementBarcodeCount(item.id)}
                                      className="text-blue-600 hover:text-blue-700 p-1 cursor-pointer transition-colors"
                                      title="Increase tubes"
                                      type="button"
                                    >
                                      <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        viewBox="0 0 24 24"
                                      >
                                        <line x1="12" x2="12" y1="5" y2="19" />
                                        <line x1="5" x2="19" y1="12" y2="12" />
                                      </svg>
                                    </button>
                                    {item.count > 1 && (
                                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                        ×{item.count}
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Print Barcode Button */}
                      <div className="mt-6">
                        <button
                          onClick={handlePrintAllBarcodes}
                          className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-[#0B57D0] hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all cursor-pointer"
                          type="button"
                        >
                          <svg
                            className="w-4 h-4 stroke-current fill-none stroke-2"
                            viewBox="0 0 24 24"
                          >
                            <path d="M3 5v4m18-4v4M3 19v-4m18 4v-4M7 9v6m4-6v6m4-6v6m2-6v6" />
                          </svg>
                          <span>Print Barcode</span>
                        </button>
                      </div>
                    </section>
                    {/* END: SampleDetailsSection */}

                    {/* BEGIN: BottomNavigationFooter */}
                    <footer
                      className="border-t border-slate-200 pt-6 mt-8 flex items-center justify-between bg-white flex-shrink-0"
                      data-purpose="footer-action-bar"
                    >
                      {/* Back Button */}
                      <button
                        onClick={() => setCurrentStep(2)}
                        className="px-7 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                        type="button"
                      >
                        Back
                      </button>
                      {/* Complete & Save Button */}
                      <button
                        onClick={handleCompleteAndSave}
                        className="px-7 py-2.5 bg-[#00875A] hover:bg-[#00744E] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                        type="button"
                      >
                        Complete &amp; Save
                      </button>
                    </footer>
                    {/* END: BottomNavigationFooter */}
                  </div>
                )}
              </div>
            </main>
          </div>
        ) : (
          /* =========================================================================
             VIEW 2: LAB TECHNICIAN DASHBOARD (Default view with Metric Cards & Table)
             ========================================================================= */
          <>
            {/* TopNavbar */}
            <header
              className="h-20 bg-white border-b border-slate-100 px-10 flex items-center justify-end sticky top-0 z-10"
              data-purpose="dashboard-header"
            >
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
                    5
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
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
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
                {/* Card 1: Test Completed */}
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
                      Test Completed
                    </span>
                    <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-0.5">
                      128
                    </h3>
                    <p className="text-[12px] text-slate-400 font-normal mt-0.5">
                      Tests completed successfully
                    </p>
                  </div>
                </div>

                {/* Card 2: Test Result Pending */}
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)] flex items-center gap-5">
                  <div className="w-14 h-14 rounded-full bg-[#e0edff] flex items-center justify-center shrink-0">
                    <svg
                      className="w-6 h-6 text-[#2563eb] stroke-[2.2]"
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
                    <span className="text-[13px] font-semibold text-[#2563eb]">
                      Test Result Pending
                    </span>
                    <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-0.5">
                      56
                    </h3>
                    <p className="text-[12px] text-slate-400 font-normal mt-0.5">
                      Results pending verification
                    </p>
                  </div>
                </div>

                {/* Card 3: Test Overdue */}
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)] flex items-center gap-5">
                  <div className="w-14 h-14 rounded-full bg-[#fef3c7] flex items-center justify-center shrink-0">
                    <svg
                      className="w-6 h-6 text-[#d97706] stroke-[2.2]"
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
                    <span className="text-[13px] font-semibold text-[#d97706]">
                      Test Overdue
                    </span>
                    <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-0.5">
                      18
                    </h3>
                    <p className="text-[12px] text-slate-400 font-normal mt-0.5">
                      Tests past the expected time
                    </p>
                  </div>
                </div>

                {/* Card 4: Repeat Test Required */}
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)] flex items-center gap-5">
                  <div className="w-14 h-14 rounded-full bg-[#fee2e2] flex items-center justify-center shrink-0">
                    <svg
                      className="w-6 h-6 text-[#dc2626] stroke-[2.2]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[13px] font-semibold text-[#dc2626]">
                      Repeat Test Required
                    </span>
                    <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-0.5">
                      11
                    </h3>
                    <p className="text-[12px] text-slate-400 font-normal mt-0.5">
                      Tests need to be repeated
                    </p>
                  </div>
                </div>
              </section>

              {/* TableContainerCard */}
              <section
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                data-purpose="tests-details-container"
              >
                {/* Header & Action Controls Bar */}
                <div className="px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h2 className="text-[20px] font-bold text-slate-800">
                      Tests Details
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Click any patient row to open and view their registration details
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
                        placeholder="Search Patient / ID"
                        type="text"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
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
                        <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1.5 text-[13px]">
                          <button
                            type="button"
                            onClick={() => {
                              setStatusFilter("ALL");
                              setIsFilterDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between ${
                              statusFilter === "ALL" ? "font-semibold text-blue-600 bg-blue-50/50" : "text-slate-700"
                            }`}
                          >
                            <span>All Statuses</span>
                            {statusFilter === "ALL" && <span>✓</span>}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setStatusFilter("PROCESSING");
                              setIsFilterDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between ${
                              statusFilter === "PROCESSING" ? "font-semibold text-[#854d0e] bg-yellow-50/50" : "text-slate-700"
                            }`}
                          >
                            <span>Processing</span>
                            {statusFilter === "PROCESSING" && <span>✓</span>}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setStatusFilter("COMPLETED");
                              setIsFilterDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between ${
                              statusFilter === "COMPLETED" ? "font-semibold text-[#15803d] bg-green-50/50" : "text-slate-700"
                            }`}
                          >
                            <span>Completed</span>
                            {statusFilter === "COMPLETED" && <span>✓</span>}
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
                    id="tests-details-table"
                  >
                    <thead>
                      <tr className="border-t border-b border-slate-200 text-[11px] font-bold tracking-wider text-slate-600 uppercase bg-transparent">
                        <th className="py-4 px-8 font-bold" scope="col">
                          REQUEST ID
                        </th>
                        <th className="py-4 px-6 font-bold" scope="col">
                          PATIENT NAME
                        </th>
                        <th className="py-4 px-6 font-bold" scope="col">
                          REQUESTED BY
                        </th>
                        <th className="py-4 px-6 font-bold" scope="col">
                          TESTS
                        </th>
                        <th
                          className="py-4 px-6 font-bold text-center"
                          scope="col"
                        >
                          <div className="inline-block text-center leading-tight">
                            <div>DATE</div>
                            <div>&amp; TIME</div>
                          </div>
                        </th>
                        <th
                          className="py-4 px-8 font-bold text-center"
                          scope="col"
                        >
                          STATUS
                        </th>
                        <th className="py-4 px-4 font-bold text-center" scope="col">
                          ACTION
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[13px] font-medium text-slate-600">
                      {filteredTests.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="py-10 text-center text-slate-400 text-sm"
                          >
                            No test records found matching your search.
                          </td>
                        </tr>
                      ) : (
                        filteredTests.map((test) => (
                          <tr
                            key={test.id}
                            onClick={() => handleSelectPatient(test)}
                            className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                            title={`Click to open registration details for ${test.patientName}`}
                          >
                            <td className="py-5 px-8 text-slate-600 font-normal group-hover:text-blue-600 transition-colors">
                              {test.requestId}
                            </td>
                            <td className="py-5 px-6 font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              <div className="flex items-center gap-2.5">
                                <span>{test.patientName}</span>
                              </div>
                            </td>
                            <td className="py-5 px-6 text-slate-600 font-normal">
                              {test.requestedBy}
                            </td>
                            <td className="py-5 px-6 text-slate-600 font-normal">
                              {test.tests}
                            </td>
                            <td className="py-5 px-6 text-center text-slate-600 font-normal leading-tight">
                              {test.date ? (
                                <>
                                  <div>{test.date}</div>
                                  {test.time && (
                                    <div className="text-[12px] text-slate-500 mt-0.5">
                                      {test.time}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="py-5 px-8 text-center">
                              {test.status === "PROCESSING" ? (
                                <span className="inline-block px-4 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#fef08a] text-[#854d0e]">
                                  PROCESSING
                                </span>
                              ) : (
                                <span className="inline-block px-4 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#bbf7d0] text-[#15803d]">
                                  COMPLETED
                                </span>
                              )}
                            </td>
                            <td className="py-5 px-4 text-center">
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:text-blue-800">
                                Open
                                <svg className="w-4 h-4 translate-x-0 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                </svg>
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </main>
          </>
        )}
      </div>
    </div>
  );
}
