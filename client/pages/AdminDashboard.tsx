import { useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type DoctorStatus = "Active" | "Leave";
type ActiveTab = "Doctors" | "Staffs" | "Appointments";

interface Doctor {
  id: string;
  initials: string;
  name: string;
  code: string;
  department: string;
  departmentColor: "blue" | "emerald";
  branch: string;
  location: string;
  status: DoctorStatus;
  avatarColor: string;
}

interface SummaryCard {
  label: string;
  value: string;
  delta?: string;
  deltaColor?: string;
  bgColor: string;
  borderColor: string;
  iconColor: string;
  icon: React.ReactNode;
}

// ─── Data ────────────────────────────────────────────────────────────────────

const doctors: Doctor[] = [
  {
    id: "1",
    initials: "JS",
    name: "Dr. John Smith",
    code: "DOC-9042",
    department: "Cardiology",
    departmentColor: "blue",
    branch: "Central Hospital",
    location: "Tambaram",
    status: "Active",
    avatarColor: "bg-blue-100 text-blue-600",
  },
  {
    id: "2",
    initials: "MK",
    name: "Marcus Kincaid",
    code: "DOC-2210",
    department: "Cancer",
    departmentColor: "blue",
    branch: "Central Hospital",
    location: "Tambaram",
    status: "Leave",
    avatarColor: "bg-slate-100 text-slate-600",
  },
  {
    id: "3",
    initials: "RL",
    name: "Dr. Robert Lee",
    code: "DOC-4431",
    department: "Pediatrics",
    departmentColor: "blue",
    branch: "Central Hospital",
    location: "Saidapet",
    status: "Active",
    avatarColor: "bg-indigo-100 text-indigo-600",
  },
  {
    id: "4",
    initials: "AK",
    name: "Dr. Arun Kumar",
    code: "DOC-4432",
    department: "Orthology",
    departmentColor: "emerald",
    branch: "Central Hospital",
    location: "Egmore",
    status: "Active",
    avatarColor: "bg-emerald-100 text-emerald-600",
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
    />
  </svg>
);

const ViewIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
    <path
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
    />
  </svg>
);

const DoctorRow = ({ doc }: { doc: Doctor }) => {
  const deptClass =
    doc.departmentColor === "emerald"
      ? "bg-emerald-50 text-emerald-500"
      : "bg-blue-50 text-blue-500";

  const statusClass =
    doc.status === "Active" ? "text-green-500" : "text-orange-400";

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      {/* Name */}
      <td className="px-6 py-4">
        <div className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] mr-3 ${doc.avatarColor}`}
          >
            {doc.initials}
          </div>
          <div>
            <p className="font-semibold text-slate-700 text-sm">{doc.name}</p>
            <p className="text-[11px] text-slate-400">{doc.code}</p>
          </div>
        </div>
      </td>

      {/* Department */}
      <td className="px-6 py-4">
        <span className={`px-2.5 py-0.5 rounded text-[11px] font-medium ${deptClass}`}>
          {doc.department}
        </span>
      </td>

      {/* Branch */}
      <td className="px-6 py-4">
        <p className="text-slate-600 text-sm">{doc.branch}</p>
        <p className="text-[11px] text-slate-400">({doc.location})</p>
      </td>

      {/* Status */}
      <td className="px-6 py-4">
        <div className={`flex items-center font-medium text-sm ${statusClass}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current mr-2" />
          {doc.status}
        </div>
      </td>

      {/* Actions */}
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end space-x-3 text-slate-400">
          <button className="hover:text-[#004a99] transition-colors" aria-label="Edit">
            <EditIcon />
          </button>
          <button className="hover:text-[#004a99] transition-colors" aria-label="View">
            <ViewIcon />
          </button>
        </div>
      </td>
    </tr>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("Doctors");
  const [searchQuery, setSearchQuery] = useState("");

  const tabs: ActiveTab[] = ["Doctors", "Staffs", "Appointments"];

  const filteredDoctors = doctors.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc] text-slate-700 font-['Inter',sans-serif]">
      {/* ── Sidebar ── */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
        {/* Logo */}
        <div className="p-6">
          <h1 className="text-[#004a99] font-bold text-xl leading-none">HMS</h1>
          <p className="text-xs text-slate-400 mt-1">Admin Portal</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[
            { label: "Dashboard", active: true, icon: <path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /> },
            { label: "Staff", icon: <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /> },
            { label: "Doctor", icon: <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /> },
            { label: "Patients", icon: <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /> },
            { label: "Appointment", icon: <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /> },
            { label: "Billing", icon: <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /> },
          ].map(({ label, active, icon }) => (
            <a
              key={label}
              href="#"
              className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-[#004a99] text-white"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {icon}
              </svg>
              {label}
            </a>
          ))}

          {/* Protocol with chevron */}
          <a
            href="#"
            className="flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <span className="flex items-center">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
              </svg>
              Protocol
            </span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
          </a>
        </nav>

        {/* Bottom Links */}
        <div className="px-4 py-6 border-t border-slate-100 space-y-1">
          <a href="#" className="flex items-center px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
            Settings
          </a>
          <a href="#" className="flex items-center px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
            Support
          </a>

          {/* Profile */}
          <div className="flex items-center px-4 py-4 mt-2">
            <div className="w-10 h-10 rounded-full bg-[#004a99] flex items-center justify-center text-white font-bold text-sm">
              A
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-semibold text-slate-700 truncate">Admin</p>
              <p className="text-xs text-slate-400 truncate">Admin User</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-[#f8fafc] px-8 py-4 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center cursor-pointer text-slate-600 hover:text-slate-800 transition-colors">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
            <span className="font-medium text-sm">Main Branch</span>
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
          </div>

          <div className="flex items-center space-x-6">
            {/* Notification Bell */}
            <div className="relative cursor-pointer">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
              </svg>
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#f8fafc]" />
            </div>

            {/* User */}
            <div className="flex items-center space-x-2 cursor-pointer">
              <span className="text-sm font-semibold text-slate-600">HMS</span>
              <div className="w-8 h-8 rounded-full bg-[#004a99] flex items-center justify-center text-white font-bold text-xs">
                H
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 pt-4 space-y-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

          {/* ── Summary Cards ── */}
          <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              {
                label: "Doctors",
                value: "124",
                delta: "+2",
                deltaColor: "text-[#004a99]",
                bg: "bg-[#eef2ff]",
                border: "border-[#e0e7ff]",
                iconColor: "text-[#004a99]",
                icon: <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />,
              },
              {
                label: "Patients",
                value: "12,450",
                delta: "+20",
                deltaColor: "text-[#059669]",
                bg: "bg-[#ecfdf5]",
                border: "border-[#d1fae5]",
                iconColor: "text-[#059669]",
                icon: <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />,
              },
              {
                label: "Staff",
                value: "342",
                bg: "bg-[#fff7ed]",
                border: "border-[#ffedd5]",
                iconColor: "text-[#ea580c]",
                icon: <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />,
              },
              {
                label: "Appointments",
                value: "1,204",
                delta: "+114",
                deltaColor: "text-[#2563eb]",
                bg: "bg-[#eff6ff]",
                border: "border-[#dbeafe]",
                iconColor: "text-[#2563eb]",
                icon: <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />,
              },
              {
                label: "Prescription Generated",
                value: "8,432",
                delta: "124",
                deltaColor: "text-red-400",
                bg: "bg-[#f1f5f9]",
                border: "border-[#e2e8f0]",
                iconColor: "text-slate-600",
                icon: <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />,
              },
              {
                label: "Bills Generated",
                value: "2700",
                delta: "+160",
                deltaColor: "text-[#004a99]",
                bg: "bg-[#eef2ff]",
                border: "border-[#e0e7ff]",
                iconColor: "text-[#004a99]",
                icon: <path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />,
              },
            ].map(({ label, value, delta, deltaColor, bg, border, iconColor, icon }) => (
              <div
                key={label}
                className={`${bg} p-5 rounded-2xl border ${border} relative overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.05)]`}
              >
                {delta && (
                  <div className={`absolute top-2 right-3 text-xs font-bold ${deltaColor}`}>{delta}</div>
                )}
                <div className="w-10 h-10 bg-white/60 rounded-lg flex items-center justify-center mb-4">
                  <svg className={`w-6 h-6 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {icon}
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-800 leading-tight">{value}</h3>
                <p className="text-xs font-medium text-slate-500">{label}</p>
              </div>
            ))}
          </section>

          {/* ── Admin Overview ── */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Admin Overview</h2>
                <p className="text-sm text-slate-400">Real-time performance across all branches.</p>
              </div>
              <button className="bg-[#004a99] text-white px-5 py-2 rounded-lg text-sm font-semibold flex items-center shadow-lg hover:bg-[#003d80] transition-colors">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} />
                </svg>
                New Appointment
              </button>
            </div>

            {/* Data Table Card */}
            <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-hidden">
              {/* Table Header / Tabs */}
              <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
                <div className="flex space-x-8">
                  {tabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`text-sm font-semibold pb-4 transition-colors ${
                        activeTab === tab
                          ? "text-[#004a99] border-b-2 border-[#004a99]"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="flex items-center space-x-4">
                  {/* Search */}
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center">
                      <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                      </svg>
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className="bg-slate-50 border-none rounded-lg pl-10 pr-4 py-1.5 text-sm w-64 focus:ring-1 focus:ring-[#004a99] outline-none"
                    />
                  </div>

                  {/* Date Nav */}
                  <div className="flex items-center space-x-2">
                    <button className="p-1.5 bg-white border border-slate-200 rounded text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                      </svg>
                    </button>
                    <button className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-600">
                      Today
                    </button>
                    <button className="p-1.5 bg-white border border-slate-200 rounded text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                      </svg>
                    </button>
                  </div>

                  {/* Filter */}
                  <button className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                    </svg>
                    <span>Filters</span>
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <tr>
                      {["Name", "Role/Dept", "Branch", "Status", "Actions"].map((h, i) => (
                        <th
                          key={h}
                          className={`px-6 py-3 ${i === 4 ? "text-right" : ""}`}
                        >
                          {h}
                          {i < 4 && <span className="ml-1 text-slate-300">↑↓</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {activeTab === "Doctors" &&
                      filteredDoctors.map((doc) => <DoctorRow key={doc.id} doc={doc} />)}
                    {activeTab !== "Doctors" && (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-400">
                          No data for {activeTab} yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center text-xs text-slate-400">
                  Showing 1–10 of 124
                  <select className="ml-4 bg-transparent border-none focus:ring-0 text-slate-600 font-bold cursor-pointer text-xs">
                    <option>10</option>
                    <option>25</option>
                    <option>50</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-1 text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                    </svg>
                  </button>
                  <button className="w-7 h-7 flex items-center justify-center rounded-full bg-[#004a99] text-white text-xs font-bold shadow-md">
                    1
                  </button>
                  <button className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 text-xs font-bold">
                    2
                  </button>
                  <button className="p-1 text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ── Bottom Widgets ── */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Branch Performance */}
            <div className="bg-white p-6 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Branch Performance</h3>
                  <p className="text-xs text-slate-400 font-medium">Efficiency</p>
                </div>
                <div className="p-2 bg-slate-50 rounded text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                  </svg>
                </div>
              </div>
              <div className="space-y-6">
                {[
                  { name: "Central Hospital", pct: 92 },
                  { name: "City Clinic", pct: 78 },
                ].map(({ name, pct }) => (
                  <div key={name}>
                    <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1.5">
                      <span>{name}</span>
                      <span className="text-[#004a99]">{pct}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-[#004a99] h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* System Integrity */}
            <div className="bg-white p-6 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">System Integrity</h3>
                  <p className="text-xs text-slate-400 font-medium">Alerts</p>
                </div>
                <button className="text-[10px] font-bold text-slate-400 border border-slate-200 px-3 py-1 rounded-full hover:bg-slate-50 transition-colors uppercase">
                  View All
                </button>
              </div>
              <div className="space-y-4 flex-1">
                {/* Alert: Access Granted */}
                <div className="p-2.5 border-l-2 border-[#004a99] bg-blue-50/50 rounded-r-lg">
                  <div className="flex items-center text-[#004a99] mb-0.5">
                    <svg className="w-3.5 h-3.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                    </svg>
                    <span className="text-xs font-bold uppercase">Admin Access Granted</span>
                  </div>
                  <p className="text-[11px] text-slate-500 ml-5">John Doe (IT) authorized for DB.</p>
                </div>

                {/* Alert: Server Latency */}
                <div className="p-2.5 rounded-r-lg">
                  <div className="flex items-center text-red-500 mb-0.5">
                    <svg className="w-3.5 h-3.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                    </svg>
                    <span className="text-xs font-bold uppercase">Server Latency</span>
                  </div>
                  <p className="text-[11px] text-slate-500 ml-5">Billing module experiencing delays.</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Floating Action Button */}
      <button
        className="fixed bottom-8 right-8 w-12 h-12 bg-[#004a99] text-white rounded-xl shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        aria-label="New action"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
        </svg>
      </button>
    </div>
  );
}
