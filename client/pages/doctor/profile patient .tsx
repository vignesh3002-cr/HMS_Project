import React, { useState } from "react";

export default function MedicalPortalReplica() {
  const [activeTab, setActiveTab] = useState("Order Summary");
  const [selectedDay, setSelectedDay] = useState("Day 1");
  const [showBranchMenu, setShowBranchMenu] = useState(false);

  const tabs = ["Order Summary", "Medications", "Discharge", "History", "Notes & Documents"];
  const days = [
    { label: "Day 1", date: "05 Jun 2026" },
    { label: "Day 2", date: "06 Jun 2026" },
    { label: "Day 3", date: "07 Jun 2026" },
  ];

  const handlePrint = () => window.print();

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
      <div className="font-[Inter,sans-serif] text-[#1e293b] antialiased flex h-screen overflow-hidden bg-[#f8fafc]">


{/* BEGIN: Main Content */}
<main className="flex-1 flex flex-col h-full overflow-hidden bg-[#f8fafc] relative">
{/* BEGIN: Top Header */}
<header className="h-[72px] bg-[#f8fafc] border-b border-[#e2e8f0] flex items-center justify-between px-8 shrink-0 z-10">
<div className="relative">
<button type="button" onClick={() => setShowBranchMenu(v => !v)} className="flex items-center text-sm font-medium text-[#1e293b] cursor-pointer hover:text-[#1d4ed8] transition-colors">
<i className="fa-solid fa-code-branch mr-2 text-[#64748b]"></i> Main Branch <i className="fa-solid fa-chevron-down ml-2 text-[10px] text-[#64748b]"></i>
</button>
<div className={`absolute top-9 left-0 z-30 bg-white border border-[#e2e8f0] rounded-lg shadow-lg p-2 w-44 ${showBranchMenu ? "block" : "hidden"}`}>
<button type="button" className="w-full text-left px-3 py-2 text-sm rounded hover:bg-slate-50">Main Branch</button>
<button type="button" className="w-full text-left px-3 py-2 text-sm rounded hover:bg-slate-50">Branch 02</button>
</div>
</div>
<div className="flex items-center space-x-6">
<button className="text-[#64748b] hover:text-[#1e293b] relative">
<i className="fa-regular fa-bell text-[20px]"></i>
<span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-2.5 w-2.5">
<span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#ef4444] border-2 border-[#f8fafc]"></span>
</span>
</button>
<div className="flex items-center space-x-3 cursor-pointer pl-6 border-l border-[#e2e8f0]">
<span className="text-sm font-bold text-[#1d4ed8]">HMS</span>
<div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white">
<i className="fa-solid fa-user text-sm"></i>
</div>
</div>
</div>
</header>
{/* END: Top Header */}
<div className="flex-1 overflow-y-auto relative">
<div className="p-8 max-w-[1400px] mx-auto pb-32">
{/* BEGIN: Patient Header Card */}
<div className="bg-white rounded-[16px] border border-[#e2e8f0] p-6 shadow-sm mb-6 flex justify-between items-center">
<div className="flex items-center">
<img alt="Vijaya Nallusamy" className="w-20 h-20 rounded-full border-4 border-white shadow-sm object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCVmv5vhpN6g6IwvwVBONWYZS06j9iELGi3guKAqt6M68HTL3HxSslWkIMAEQjWeTlKNOdnc-Pipmecvq47y_J4JkJpXBa7ODMic8izxEnar0D-CTbCOUggEhRCTr29jfsIrqPw9jJJRvmghxFC8vXF6U5zjzrn_8ajoH2ovseUywhLI0FurjCqa2DjfMMM3yvISAkY7jN2EjygmPh_WvJa_vc06-pRUGw2Xu4pFrWdOcPdAl4HggI"/>
<div className="ml-6">
<div className="flex items-center space-x-3 mb-1">
<h2 className="text-xl font-bold text-[#1e293b]">Vijaya Nallusamy</h2>
<span className="bg-slate-100 text-[#64748b] px-3 py-1 rounded-full text-xs font-semibold">ONC-2026-10025</span>
</div>
<div className="text-sm text-[#64748b] flex items-center space-x-3">
<span>51Y / Female</span>
<span className="w-1 h-1 rounded-full bg-slate-300"></span>
<span className="text-[#1d4ed8] font-semibold">Ductal Carcinoma Stage II</span>
</div>
</div>
</div>
<div className="flex items-center">
<div className="flex space-x-8 px-8 border-r border-[#e2e8f0]">
<div className="space-y-4">
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">HEIGHT</div>
<div className="font-bold text-sm">154 cm</div>
</div>
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">BP</div>
<div className="font-bold text-sm">118/74</div>
</div>
</div>
<div className="space-y-4">
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">WEIGHT</div>
<div className="font-bold text-sm">52 kg</div>
</div>
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">PULSE</div>
<div className="font-bold text-sm">78 bpm</div>
</div>
</div>
<div className="space-y-4">
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">BSA</div>
<div className="font-bold text-sm">1.49 m²</div>
</div>
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">TEMP</div>
<div className="font-bold text-sm">36.8 °C</div>
</div>
</div>
<div className="space-y-4">
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">BMI</div>
<div className="font-bold text-sm">21.93</div>
</div>
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mb-0.5">SPO2</div>
<div className="font-bold text-sm">99%</div>
</div>
</div>
</div>
<div className="pl-8">
<div className="bg-blue-50/50 border border-blue-100 rounded-[12px] p-4 w-[220px]">
<div className="text-[10px] font-bold text-[#1d4ed8] uppercase tracking-wider mb-1.5">INTENT: NEOADJUVANT</div>
<div className="text-[15px] font-bold text-[#1d4ed8] mb-2.5">TAXOL - WEEKLY</div>
<div className="flex items-center text-xs text-[#64748b] font-medium">
<span className="w-2 h-2 rounded-full bg-[#10b981] mr-2"></span> Active Protocol
                    </div>
</div>
</div>
</div>
</div>
{/* END: Patient Header Card */}
{/* BEGIN: Alerts Banner */}
<div className="flex items-center justify-between text-sm mb-8 border-b border-[#e2e8f0] pb-4">
<div className="flex items-center space-x-8">
<div className="flex items-center">
<i className="fa-solid fa-triangle-exclamation text-[#ef4444] mr-2"></i>
<span className="text-[#ef4444] font-semibold">Allergy:</span> <span className="ml-1 text-[#1e293b]">Penicillin</span>
</div>
<div className="flex items-center">
<i className="fa-solid fa-clock-rotate-left text-[#f59e0b] mr-2"></i>
<span className="text-[#f59e0b] font-semibold">Previous Cycle:</span> <span className="ml-1 text-[#1e293b]">Grade 2 Neutropenia</span>
</div>
<div className="flex items-center text-[#1d4ed8] font-medium">
<i className="fa-solid fa-link mr-2"></i>
<span>Central Line Available</span>
</div>
</div>
<a className="text-[#1d4ed8] font-semibold hover:underline" href="#">View Full Alerts (2)</a>
</div>
{/* END: Alerts Banner */}
{/* BEGIN: Tabs */}
<div className="border-b border-[#e2e8f0] mb-6">
<nav className="flex space-x-8">
{tabs.map((tab) => (
<button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`px-1 py-3 border-b-2 text-sm font-medium transition-colors ${activeTab === tab ? "border-[#1d4ed8] text-[#1d4ed8] font-semibold" : "border-transparent text-[#64748b] hover:text-[#1e293b] hover:border-slate-300"}`}>
{tab}
</button>
))}
</nav>
</div>
{/* END: Tabs */}
<div className="flex space-x-6 mb-8">
{/* Left Side (Timeline & Day Selector) */}
<div className="flex-1 space-y-6">
{/* BEGIN: Treatment Timeline */}
<div className="bg-white rounded-[16px] shadow-sm border border-[#e2e8f0] p-6 h-[200px]">
<div className="flex items-center mb-8">
<h3 className="text-lg font-bold text-[#1e293b]">Cycle 6</h3>
<div className="ml-3 text-sm text-[#64748b] flex items-center cursor-pointer hover:text-[#1e293b]">
                  (14 May - 21 May 2026) <i className="fa-solid fa-chevron-down text-[10px] ml-2"></i>
</div>
</div>
<div className="relative px-8 mt-4">
<div className="absolute top-[18px] left-[60px] right-[60px] h-[2px] bg-slate-200"></div>
<div className="flex justify-between relative z-10">
<div className="flex flex-col items-center">
<div className="w-10 h-10 rounded-full bg-[#1d4ed8] text-white flex items-center justify-center font-bold ring-[6px] ring-white">1</div>
<div className="mt-3 text-center">
<div className="text-sm font-semibold text-[#1e293b]">Day 1</div>
<div className="text-[11px] text-[#64748b] mt-1">05 Jun 2026</div>
</div>
</div>
<div className="flex flex-col items-center">
<div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold ring-[6px] ring-white">2</div>
<div className="mt-3 text-center">
<div className="text-sm font-medium text-[#64748b]">Day 2</div>
<div className="text-[11px] text-slate-400 mt-1">06 Jun 2026</div>
</div>
</div>
<div className="flex flex-col items-center">
<div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold ring-[6px] ring-white">3</div>
<div className="mt-3 text-center">
<div className="text-sm font-medium text-[#64748b]">Day 3</div>
<div className="text-[11px] text-slate-400 mt-1">07 Jun 2026</div>
</div>
</div>
<div className="flex flex-col items-center">
<div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold ring-[6px] ring-white"><i className="fa-regular fa-map"></i></div>
<div className="mt-3 text-center">
<div className="text-sm font-medium text-[#64748b]">Follow-up</div>
<div className="text-[11px] text-slate-400 mt-1">21 Jun 2026</div>
</div>
</div>
</div>
</div>
</div>
{/* END: Treatment Timeline */}
{/* BEGIN: Day Selector */}
<div className="flex items-center">
<span className="text-sm font-semibold text-[#1e293b] mr-4">Select Day</span>
<div className="flex bg-white rounded-[12px] border border-[#e2e8f0] shadow-sm p-1">
{days.map((day) => (
<button key={day.label} type="button" onClick={() => setSelectedDay(day.label)} className={`px-6 py-2 rounded-[8px] shadow-sm text-center min-w-[100px] transition-colors ${selectedDay === day.label ? "bg-[#1d4ed8] text-white" : "text-[#1e293b] hover:bg-slate-50"}`}>
<div className="text-sm font-semibold">{day.label}</div>
<div className={`text-[10px] font-normal mt-0.5 ${selectedDay === day.label ? "opacity-90" : "text-[#64748b]"}`}>{day.date}</div>
</button>
))}
<button className="px-6 py-2 text-[#1d4ed8] hover:bg-blue-50 transition-colors rounded-[8px] text-sm font-semibold flex items-center justify-center">
<i className="fa-solid fa-plus mr-1.5"></i> Add Day
                  </button>
</div>
</div>
{/* END: Day Selector */}
</div>
{/* Right Side (Cards) */}
<div className="flex space-x-6">
{/* BEGIN: Next Appointment */}
<div className="bg-white rounded-[16px] shadow-sm border border-[#e2e8f0] p-6 w-[220px] h-[200px] flex flex-col justify-between">
<div>
<h4 className="text-sm font-bold text-[#1e293b] mb-5">Next Appointment</h4>
<div className="flex items-start">
<div className="w-10 h-10 rounded-[10px] bg-blue-50 flex items-center justify-center text-[#1d4ed8] shrink-0 mr-3">
<i className="fa-regular fa-calendar text-lg"></i>
</div>
<div>
<div className="text-sm font-bold text-[#1e293b]">06 Jun 2026</div>
<div className="text-xs text-[#64748b] mt-1">09:30 AM</div>
<div className="text-xs text-[#64748b] mt-1">Day 2 Treatment</div>
</div>
</div>
</div>
<button className="w-full py-2 border border-[#e2e8f0] rounded-[8px] text-sm font-semibold text-[#1e293b] hover:bg-slate-50 transition-colors">Reschedule</button>
</div>
{/* END: Next Appointment */}
{/* BEGIN: Treatment Progress */}
<div className="bg-white rounded-[16px] shadow-sm border border-[#e2e8f0] p-6 w-[220px] h-[200px] flex flex-col justify-between">
<h4 className="text-sm font-bold text-[#1e293b] mb-2">Treatment Progress</h4>
<div className="flex items-center justify-between">
<div className="relative w-16 h-16 rounded-full bg-[conic-gradient(#1d4ed8_0%_33%,#e2e8f0_33%_100%)] flex items-center justify-center">
<div className="absolute inset-[6px] rounded-full bg-white"></div>
<span className="relative z-10 text-sm font-bold text-[#1e293b]">33%</span>
</div>
<div className="text-right">
<div className="text-[10px] text-[#64748b] uppercase tracking-wide font-semibold mb-1">Completed</div>
<div className="text-sm font-bold text-[#1e293b] mb-3">1 / 3 <span className="text-xs font-medium text-[#64748b] normal-case tracking-normal">Days</span></div>
<div className="text-[10px] text-[#64748b] uppercase tracking-wide font-semibold mb-1">Remaining</div>
<div className="text-sm font-bold text-[#1e293b]">2 Days</div>
</div>
</div>
<div className="pt-4 flex justify-between items-center text-xs">
<span className="text-[#64748b] font-medium">Next Visit</span>
<span className="font-bold text-[#1e293b]">06 Jun 2026</span>
</div>
</div>
{/* END: Treatment Progress */}
</div>
</div>
{/* BEGIN: Bottom Grid */}
<div className="grid grid-cols-12 gap-6">
{/* Left Column */}
<div className="col-span-3 space-y-6">
<div className="bg-white rounded-[16px] shadow-sm border border-[#e2e8f0] p-5">
<h4 className="text-sm font-bold text-[#1e293b] mb-4">Cycle &amp; Schedule</h4>
<div className="grid grid-cols-3 gap-4 mb-5">
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase mb-1">CYCLE</div>
<div className="font-bold text-sm">6</div>
</div>
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase mb-1">DAY</div>
<div className="font-bold text-sm">1</div>
</div>
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase mb-1">TOTAL DAYS</div>
<div className="font-bold text-sm">3</div>
</div>
</div>
<div className="grid grid-cols-3 gap-4">
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase mb-1">START DATE</div>
<div className="font-bold text-sm">14 May<br/>2026</div>
</div>
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase mb-1">END DATE</div>
<div className="font-bold text-sm">21 May<br/>2026</div>
</div>
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase mb-1">NEXT DAY</div>
<div className="font-bold text-sm">06 Jun<br/>2026</div>
</div>
</div>
</div>
<div className="bg-white rounded-[16px] shadow-sm border border-[#e2e8f0] p-5">
<h4 className="text-sm font-bold text-[#1e293b] mb-4">Clinical Info</h4>
<div className="grid grid-cols-2 gap-4 mb-5">
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase mb-1">TYPE</div>
<div className="font-bold text-sm">Ductal<br/>Carcinoma</div>
</div>
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase mb-1">STAGE</div>
<div className="font-bold text-sm">Stage II</div>
</div>
</div>
<div>
<div className="text-[10px] text-[#64748b] font-semibold uppercase mb-1">GRADE</div>
<div className="font-bold text-sm">G3</div>
</div>
</div>
</div>
{/* Middle Column */}
<div className="col-span-4 space-y-6">
<div className="bg-white rounded-[16px] shadow-sm border border-[#e2e8f0] p-5">
<div className="flex items-center mb-4">
<h4 className="text-sm font-bold text-[#1e293b] mr-3">Lab Validation</h4>
<span className="px-2 py-0.5 bg-green-50 text-[#10b981] text-[10px] font-bold uppercase rounded border border-green-100">Approved</span>
</div>
<table className="w-full text-left text-sm mb-4">
<thead>
<tr className="text-[10px] text-[#64748b] uppercase border-b border-slate-100">
<th className="pb-2 font-semibold">PARAMETER</th>
<th className="pb-2 font-semibold">RESULT</th>
<th className="pb-2 font-semibold">RANGE</th>
<th className="pb-2 font-semibold">STATUS</th>
</tr>
</thead>
<tbody>
<tr className="border-b border-slate-50">
<td className="py-3 text-[#64748b]">Hb</td>
<td className="py-3 font-semibold">12.6 g/dL</td>
<td className="py-3 text-[#64748b]">11 - 15</td>
<td className="py-3 font-semibold text-[#10b981] flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-[#10b981] mr-2"></div>Normal</td>
</tr>
<tr className="border-b border-slate-50">
<td className="py-3 text-[#64748b]">WBC</td>
<td className="py-3 font-semibold">6,200 /μL</td>
<td className="py-3 text-[#64748b]">4,000 - 11,000</td>
<td className="py-3 font-semibold text-[#10b981] flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-[#10b981] mr-2"></div>Normal</td>
</tr>
<tr className="border-b border-slate-50">
<td className="py-3 text-[#64748b]">Platelets</td>
<td className="py-3 font-semibold">2.45 L</td>
<td className="py-3 text-[#64748b]">1.50 - 4.00</td>
<td className="py-3 font-semibold text-[#f59e0b] flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] mr-2"></div>Borderline</td>
</tr>
<tr>
<td className="py-3 text-[#64748b]">Creatinine</td>
<td className="py-3 font-semibold">0.8 mg/dL</td>
<td className="py-3 text-[#64748b]">0.6 - 1.2</td>
<td className="py-3 font-semibold text-[#10b981] flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-[#10b981] mr-2"></div>Normal</td>
</tr>
</tbody>
</table>
<div className="border-t border-slate-100 pt-3 flex justify-between items-center text-sm">
<span className="text-[#64748b]">Chemo Clearance :</span>
<span className="font-bold text-[#10b981] uppercase">Approved</span>
</div>
</div>
<div className="bg-blue-50/50 rounded-[16px] shadow-sm border border-blue-100 p-5 relative overflow-hidden">
<div className="flex items-center justify-between mb-5">
<div className="flex items-center text-[#1d4ed8]">
<i className="fa-solid fa-flask text-lg mr-2"></i>
<h4 className="text-sm font-bold uppercase">PROTOCOL: TAXOL - WEEKLY</h4>
</div>
<a className="text-xs text-[#1d4ed8] font-medium hover:underline flex items-center" href="#">View Protocol <i className="fa-solid fa-chevron-right text-[10px] ml-1"></i></a>
</div>
<div className="grid grid-cols-4 gap-4">
<div>
<div className="text-[10px] text-[#1d4ed8] font-semibold uppercase mb-1">DOSE</div>
<div className="font-bold text-sm text-[#1e293b]">80 mg/m²</div>
</div>
<div>
<div className="text-[10px] text-[#1d4ed8] font-semibold uppercase mb-1">PATIENT DOSE</div>
<div className="font-bold text-sm text-[#1e293b]">120 mg</div>
</div>
<div>
<div className="text-[10px] text-[#1d4ed8] font-semibold uppercase mb-1">ROUTE</div>
<div className="font-bold text-sm text-[#1e293b]">IV</div>
</div>
<div>
<div className="text-[10px] text-[#1d4ed8] font-semibold uppercase mb-1">DILUENT</div>
<div className="font-bold text-sm text-[#1e293b]">Dextrose</div>
</div>
<div>
<div className="text-[10px] text-[#1d4ed8] font-semibold uppercase mb-1">VOLUME</div>
<div className="font-bold text-sm text-[#1e293b]">100 ml</div>
</div>
<div>
<div className="text-[10px] text-[#1d4ed8] font-semibold uppercase mb-1">INF. TIME</div>
<div className="font-bold text-sm text-[#1e293b]">60 mins</div>
</div>
<div className="col-span-2 flex items-end justify-end space-x-2">
<span className="px-2 py-1 bg-blue-100 text-[#1d4ed8] text-[10px] font-bold rounded">WEEKLY</span>
<span className="px-2 py-1 bg-white border border-slate-200 text-[#64748b] text-[10px] font-bold rounded">IV BOLUS</span>
</div>
</div>
</div>
</div>
{/* Right Column */}
<div className="col-span-5 space-y-6">
<div className="bg-white rounded-[16px] shadow-sm border border-[#e2e8f0] overflow-hidden">
<div className="px-5 py-4 border-b border-[#e2e8f0] flex items-center text-purple-600">
<i className="fa-solid fa-pills mr-2"></i>
<h4 className="text-sm font-bold">Premedications</h4>
</div>
<div className="p-5">
<table className="w-full text-left text-sm">
<thead>
<tr className="text-[10px] text-[#64748b] uppercase border-b border-slate-100">
<th className="pb-2 font-semibold w-8">#</th>
<th className="pb-2 font-semibold">DRUG</th>
<th className="pb-2 font-semibold">DOSE</th>
<th className="pb-2 font-semibold">ROUTE</th>
<th className="pb-2 font-semibold">TIMING</th>
<th className="pb-2 font-semibold text-right">STATUS</th>
</tr>
</thead>
<tbody>
<tr className="border-b border-slate-50">
<td className="py-3 text-[#64748b]">1</td>
<td className="py-3 font-semibold text-[#1e293b]">Inj. Decadron</td>
<td className="py-3 text-[#64748b]">8 mg</td>
<td className="py-3 text-[#64748b]">IV Bolus</td>
<td className="py-3 text-[#64748b]">30m before</td>
<td className="py-3 font-semibold text-[#10b981] text-right"><i className="fa-solid fa-check mr-1"></i> Given</td>
</tr>
<tr className="border-b border-slate-50">
<td className="py-3 text-[#64748b]">2</td>
<td className="py-3 font-semibold text-[#1e293b]">Inj. Avil</td>
<td className="py-3 text-[#64748b]">2 cc</td>
<td className="py-3 text-[#64748b]">IV Bolus</td>
<td className="py-3 text-[#64748b]">30m before</td>
<td className="py-3 font-semibold text-[#10b981] text-right"><i className="fa-solid fa-check mr-1"></i> Given</td>
</tr>
<tr>
<td className="py-3 text-[#64748b]">3</td>
<td className="py-3 font-semibold text-[#1e293b]">Inj. Palzen</td>
<td className="py-3 text-[#64748b]">0.25 mg</td>
<td className="py-3 text-[#64748b]">IV Bolus</td>
<td className="py-3 text-[#64748b]">30m before</td>
<td className="py-3 font-semibold text-[#10b981] text-right"><i className="fa-solid fa-check mr-1"></i> Given</td>
</tr>
</tbody>
</table>
</div>
</div>
<div className="bg-white rounded-[16px] shadow-sm border border-[#e2e8f0] overflow-hidden">
<div className="px-5 py-4 border-b border-[#e2e8f0] flex items-center text-[#1d4ed8]">
<i className="fa-solid fa-prescription-bottle-medical mr-2"></i>
<h4 className="text-sm font-bold">Chemo Orders</h4>
</div>
<div className="p-5">
<table className="w-full text-left text-sm">
<thead>
<tr className="text-[10px] text-[#64748b] uppercase border-b border-slate-100">
<th className="pb-2 font-semibold w-8">#</th>
<th className="pb-2 font-semibold">DRUG</th>
<th className="pb-2 font-semibold">DOSE</th>
<th className="pb-2 font-semibold">ROUTE</th>
<th className="pb-2 font-semibold">DILUENT</th>
<th className="pb-2 font-semibold text-right">STATUS</th>
</tr>
</thead>
<tbody>
<tr className="border-b border-slate-50">
<td className="py-3 text-[#64748b]">1</td>
<td className="py-3 font-semibold text-[#1e293b]">Inj. Taxol</td>
<td className="py-3 text-[#64748b]">120 mg</td>
<td className="py-3 text-[#64748b]">IV</td>
<td className="py-3 text-[#64748b]">NS 100ml</td>
<td className="py-3 font-semibold text-[#10b981] text-right"><i className="fa-solid fa-check mr-1"></i> Given</td>
</tr>
<tr className="border-b border-slate-50">
<td className="py-3 text-[#64748b]">2</td>
<td className="py-3 font-semibold text-[#1e293b]">Inj. Herceptin</td>
<td className="py-3 text-[#64748b]">150 mg</td>
<td className="py-3 text-[#64748b]">IV</td>
<td className="py-3 text-[#64748b]">NS 250ml</td>
<td className="py-3 font-semibold text-[#f59e0b] text-right"><i className="fa-solid fa-clock mr-1"></i> Pending</td>
</tr>
<tr>
<td className="py-3 text-[#64748b]">3</td>
<td className="py-3 font-semibold text-[#1e293b]">Inj. Carboplatin</td>
<td className="py-3 text-[#64748b]">AUC 5</td>
<td className="py-3 text-[#64748b]">IV</td>
<td className="py-3 text-[#64748b]">Dextrose</td>
<td className="py-3 font-semibold text-[#64748b] text-right"><i className="fa-solid fa-ban mr-1"></i> Not Started</td>
</tr>
</tbody>
</table>
</div>
</div>
<div className="bg-white rounded-[16px] shadow-sm border border-[#e2e8f0] overflow-hidden">
<div className="px-5 py-4 border-b border-[#e2e8f0] flex items-center text-orange-500">
<i className="fa-solid fa-capsules mr-2"></i>
<h4 className="text-sm font-bold">Discharge Medication</h4>
</div>
<div className="p-5">
<table className="w-full text-left text-sm">
<thead>
<tr className="text-[10px] text-[#64748b] uppercase border-b border-slate-100">
<th className="pb-2 font-semibold w-8">#</th>
<th className="pb-2 font-semibold">DRUG</th>
<th className="pb-2 font-semibold">DOSE</th>
<th className="pb-2 font-semibold">FREQUENCY</th>
<th className="pb-2 font-semibold">DILUENT</th>
<th className="pb-2 font-semibold text-right">STATUS</th>
</tr>
</thead>
<tbody>
<tr className="border-b border-slate-50">
<td className="py-3 text-[#64748b]">1</td>
<td className="py-3 font-semibold text-[#1e293b]">Capecitabine</td>
<td className="py-3 text-[#64748b]">500 mg</td>
<td className="py-3 text-[#64748b]">2-0-2</td>
<td className="py-3 text-[#64748b]">After Food</td>
<td className="py-3 text-[#64748b] text-right">14 Days</td>
</tr>
<tr className="border-b border-slate-50">
<td className="py-3 text-[#64748b]">2</td>
<td className="py-3 font-semibold text-[#1e293b]">Domstal</td>
<td className="py-3 text-[#64748b]">10 mg</td>
<td className="py-3 text-[#64748b]">1-1-1</td>
<td className="py-3 text-[#64748b]">NS 250ml</td>
<td className="py-3 text-[#64748b] text-right">10 Days</td>
</tr>
<tr className="border-b border-slate-50">
<td className="py-3 text-[#64748b]">3</td>
<td className="py-3 font-semibold text-[#1e293b]">Loperamide</td>
<td className="py-3 text-[#64748b]">2 mg</td>
<td className="py-3 text-[#64748b]">0-0-1</td>
<td className="py-3 text-[#64748b]">Dextrose</td>
<td className="py-3 text-[#64748b] text-right">5 Days</td>
</tr>
<tr>
<td className="py-3 text-[#64748b]">4</td>
<td className="py-3 font-semibold text-[#1e293b]">Pantoprazole</td>
<td className="py-3 text-[#64748b]">40 mg</td>
<td className="py-3 text-[#64748b]">2-2-0</td>
<td className="py-3 text-[#64748b]">Dextrose</td>
<td className="py-3 text-[#64748b] text-right">8 Days</td>
</tr>
</tbody>
</table>
</div>
</div>
</div>
</div>
{/* END: Bottom Grid */}
{/* BEGIN: Instructions Card */}
<div className="mt-6 bg-white rounded-[16px] shadow-sm border border-[#e2e8f0] p-6 flex justify-between items-start">
<div>
<div className="flex items-center text-[#1d4ed8] mb-4">
<i className="fa-regular fa-file-lines mr-2"></i>
<h4 className="text-sm font-bold">Instructions</h4>
</div>
<p className="text-sm text-[#64748b] mb-3">Premedication tablets to take a day before:</p>
<ul className="space-y-2 text-sm text-[#1e293b] font-medium list-disc list-inside">
<li>Tab. Avil 25 mg (Night - After Food)</li>
<li>Tab. Dexamethasone 4 mg (Night - After Food)</li>
<li>Tab. Pantodac 40 mg (Night - Before Food)</li>
</ul>
<a className="inline-block mt-4 text-sm font-semibold text-[#1d4ed8] underline" href="#">Investigation for Next Cycle: TC, Sugar, CBC, LFT, Creatinine.</a>
</div>
<div className="bg-slate-50 border border-slate-200 rounded-[12px] p-5 flex flex-col items-center justify-center w-[160px] h-full">
<div className="text-[10px] text-[#1d4ed8] font-bold uppercase tracking-wider mb-2">NEXT CYCLE</div>
<div className="flex items-center text-sm font-bold text-[#1d4ed8]">
<i className="fa-regular fa-calendar mr-2"></i> 21 May 2026
              </div>
</div>
</div>
{/* END: Instructions Card */}
</div>
</div>
{/* BEGIN: Footer */}
<footer className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#e2e8f0] px-8 py-4 flex items-center justify-between z-20">
<div>
<div className="text-xs text-[#64748b]">Created by <span className="font-medium text-[#1e293b]">Dr. Naveen</span> on 05 Jun 2026, 09:30 AM</div>
<div className="text-xs text-[#64748b] mt-1">Last updated by <span className="font-medium text-[#1e293b]">Admin</span> on 05 Jun 2026, 04:35 PM</div>
</div>
<div className="flex items-center space-x-4">
<button type="button" onClick={handlePrint} className="px-4 py-2 border border-[#e2e8f0] rounded-[8px] text-sm font-semibold text-[#1e293b] hover:bg-slate-50 transition-colors flex items-center">
<i className="fa-solid fa-print mr-2"></i> Print
          </button>
<button className="px-4 py-2 border border-[#e2e8f0] rounded-[8px] text-sm font-semibold text-[#1e293b] hover:bg-slate-50 transition-colors flex items-center">
<i className="fa-solid fa-share-nodes mr-2"></i> Share
          </button>
<button className="px-4 py-2 border border-[#e2e8f0] rounded-[8px] text-sm font-semibold text-[#1e293b] hover:bg-slate-50 transition-colors flex items-center">
<i className="fa-regular fa-copy mr-2"></i> Duplicate Cycle
          </button>
<button className="px-6 py-2 bg-[#1d4ed8] text-white rounded-[8px] text-sm font-semibold hover:bg-blue-700 transition-colors">
            Update Order
          </button>
</div>
</footer>
{/* END: Footer */}
</main>
{/* END: Main Content */}

      </div>
    </>
  );
}