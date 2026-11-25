import React, { useEffect, useState, useMemo } from "react";
import {
  patientPortalApi,
  PatientVitals,
  PatientAllergyItem,
  PatientAllergiesResponse,
} from "@/api/patientPortal.api";
import { PatientVitalsCard } from "@/components/patient-portal/PatientVitalsCard";
import CalendarPicker from "@/components/hms/Calender";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import {
  HeartPulse,
  Activity,
  AlertOctagon,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Pill,
  Calendar as CalendarIcon,
  User,
  Search,
  FileText,
  Loader2,
  AlertCircle,
  FileHeart,
  Droplets,
  Thermometer,
  Scale,
  Wind,
  Info,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  X,
  RotateCcw,
} from "lucide-react";

export default function PatientHealthHistory() {
  const [vitalsList, setVitalsList] = useState<PatientVitals[]>([]);
  const [allergiesData, setAllergiesData] = useState<PatientAllergiesResponse>({
    total: 0,
    active_count: 0,
    allergies: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [vitalsRes, allergiesRes] = await Promise.all([
          patientPortalApi.getVitalsHistory().catch((err) => {
            console.error("Error fetching vitals history:", err);
            return [] as PatientVitals[];
          }),
          patientPortalApi.getAllergies().catch((err) => {
            console.error("Error fetching allergies:", err);
            return { total: 0, active_count: 0, allergies: [] } as PatientAllergiesResponse;
          }),
        ]);

        if (mounted) {
          setVitalsList(vitalsRes || []);
          setAllergiesData(allergiesRes || { total: 0, active_count: 0, allergies: [] });
          setError(null);
        }
      } catch (err: any) {
        if (mounted) {
          setError(
            err?.response?.data?.message ||
              err?.message ||
              "Failed to load clinical health history"
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      mounted = false;
    };
  }, []);

  // Extract all unique dates with recorded vitals
  const { availableDates, dateCounts } = useMemo(() => {
    const datesMap = new Map<string, Date>();
    const counts = new Map<string, number>();

    vitalsList.forEach((v) => {
      if (v.visit_date) {
        try {
          const d = new Date(v.visit_date);
          if (!isNaN(d.getTime())) {
            const key = format(d, "yyyy-MM-dd");
            datesMap.set(key, d);
            counts.set(key, (counts.get(key) || 0) + 1);
          }
        } catch {}
      }
    });

    const sortedDates = Array.from(datesMap.values()).sort(
      (a, b) => b.getTime() - a.getTime()
    );

    return { availableDates: sortedDates, dateCounts: counts };
  }, [vitalsList]);

  // Handle selecting a date on the calendar (click selected date again to clear)
  const handleDateSelect = (date: Date | null) => {
    if (!date) {
      setSelectedDate(null);
      return;
    }
    if (selectedDate && isSameDay(selectedDate, date)) {
      setSelectedDate(null);
    } else {
      setSelectedDate(date);
    }
  };

  // Navigate to previous/next available date
  const navigateAvailableDate = (direction: "prev" | "next") => {
    if (availableDates.length === 0) return;
    if (!selectedDate) {
      setSelectedDate(availableDates[0]);
      return;
    }

    const currentIndex = availableDates.findIndex((d) => isSameDay(d, selectedDate));
    if (currentIndex === -1) {
      setSelectedDate(availableDates[0]);
      return;
    }

    if (direction === "prev") {
      // earlier date = higher index in descending array
      if (currentIndex < availableDates.length - 1) {
        setSelectedDate(availableDates[currentIndex + 1]);
      }
    } else {
      // newer date = lower index in descending array
      if (currentIndex > 0) {
        setSelectedDate(availableDates[currentIndex - 1]);
      }
    }
  };

  // Format label for date button
  const getDateLabel = () => {
    if (!selectedDate) return "All Dates";
    if (isToday(selectedDate)) return "Today";
    if (isYesterday(selectedDate)) return "Yesterday";
    return format(selectedDate, "dd MMM yyyy");
  };

  // Filtered vitals by doctor, notes, or selected date
  const filteredVitals = useMemo(() => {
    return vitalsList.filter((v) => {
      // 1. Date filter
      if (selectedDate) {
        const vDate = v.visit_date ? new Date(v.visit_date) : null;
        if (!vDate || isNaN(vDate.getTime()) || !isSameDay(vDate, selectedDate)) {
          return false;
        }
      }

      // 2. Search keyword filter
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase().trim();
      const doc = (v.treating_doctor_name || "").toLowerCase();
      const visitType = (v.visit_type || "").toLowerCase();
      const notes = (v.clinical_notes || "").toLowerCase();
      const allergies = (v.allergy_history || "").toLowerCase();
      const date = v.visit_date ? String(v.visit_date).toLowerCase() : "";
      return (
        doc.includes(term) ||
        visitType.includes(term) ||
        notes.includes(term) ||
        allergies.includes(term) ||
        date.includes(term)
      );
    });
  }, [vitalsList, searchTerm, selectedDate]);

  // Latest recorded vitals record (or the first in the filtered list if date is picked)
  const latestVitals = selectedDate && filteredVitals.length > 0
    ? filteredVitals[0]
    : vitalsList.length > 0
    ? vitalsList[0]
    : null;

  // Check if any active allergy is severe
  const hasSevereAllergy = useMemo(() => {
    return allergiesData.allergies.some((a) => {
      const sev = (a.severity || "").toUpperCase();
      return (
        a.status?.toUpperCase() === "ACTIVE" &&
        (sev.includes("SEVERE") ||
          sev.includes("LIFE") ||
          sev.includes("ANAPHYLACTIC") ||
          sev.includes("HIGH"))
      );
    });
  }, [allergiesData.allergies]);

  // Format date helper
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Temperature formatting
  const formatTemp = (temp?: number | string | null) => {
    const t = Number(temp);
    if (!t || isNaN(t)) return "--";
    if (t < 50) {
      const f = Math.round(((t * 9) / 5 + 32) * 10) / 10;
      return `${t}°C (${f}°F)`;
    }
    const c = Math.round((((t - 32) * 5) / 9) * 10) / 10;
    return `${t}°F (${c}°C)`;
  };

  // BMI calculation
  const computedLatestBmi =
    latestVitals?.bmi ||
    (latestVitals?.weight && latestVitals?.height && Number(latestVitals.height) > 0
      ? Number(
          (
            Number(latestVitals.weight) /
            Math.pow(Number(latestVitals.height) / 100, 2)
          ).toFixed(1)
        )
      : null);

  const getBmiStatus = (bmi?: number | string | null) => {
    if (!bmi) return null;
    const val = Number(bmi);
    if (!val || isNaN(val)) return null;
    if (val < 18.5) return { label: "Underweight", color: "text-amber-700 bg-amber-50 border-amber-200" };
    if (val < 25) return { label: "Normal Weight", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    if (val < 30) return { label: "Overweight", color: "text-orange-700 bg-orange-50 border-orange-200" };
    return { label: "Obese", color: "text-red-700 bg-red-50 border-red-200" };
  };

  const bmiStatus = getBmiStatus(computedLatestBmi);

  // Helper for allergy severity badge styling
  const getSeverityBadge = (severity?: string | null) => {
    const s = (severity || "").toUpperCase();
    if (s.includes("SEVERE") || s.includes("LIFE") || s.includes("ANAPHYLACTIC")) {
      return {
        label: "Severe / Anaphylactic",
        bg: "bg-red-50 text-red-700 border-red-200",
        icon: <AlertOctagon className="h-3.5 w-3.5 text-red-600 shrink-0" />,
      };
    }
    if (s.includes("MODERATE") || s.includes("MEDIUM")) {
      return {
        label: "Moderate",
        bg: "bg-amber-50 text-amber-700 border-amber-200",
        icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />,
      };
    }
    return {
      label: s ? s.charAt(0) + s.slice(1).toLowerCase() : "Mild",
      bg: "bg-blue-50 text-blue-700 border-blue-200",
      icon: <Info className="h-3.5 w-3.5 text-blue-600 shrink-0" />,
    };
  };

  // Helper for substance type badge styling
  const getSubstanceTypeBadge = (type?: string | null) => {
    const t = (type || "").toUpperCase();
    if (t.includes("DRUG") || t.includes("MEDICATION")) {
      return { label: "Medication", bg: "bg-purple-50 text-purple-700 border-purple-200" };
    }
    if (t.includes("FOOD")) {
      return { label: "Food Allergen", bg: "bg-orange-50 text-orange-700 border-orange-200" };
    }
    if (t.includes("ENVIRON") || t.includes("INSECT") || t.includes("DUST")) {
      return { label: "Environmental", bg: "bg-teal-50 text-teal-700 border-teal-200" };
    }
    if (t.includes("HISTORICAL") || t.includes("CONSULTATION")) {
      return { label: "Consultation Note", bg: "bg-slate-100 text-slate-700 border-slate-200" };
    }
    return { label: type || "Allergen", bg: "bg-slate-100 text-slate-700 border-slate-200" };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#00488D]" />
        <p className="text-xs font-semibold text-slate-600">
          Loading your clinical health records & allergies...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">Unable to load health records</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 rounded-lg bg-[#00488D] text-white text-xs font-semibold hover:bg-blue-800 transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-[Manrope,sans-serif]">
      {/* ================= PAGE HEADER ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#00488D] flex items-center justify-center border border-blue-100">
              <HeartPulse className="h-5 w-5 text-[#00488D]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Health Records & Clinical History
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Comprehensive record of recorded allergies, drug alerts, and vital examination signs from your hospital visits.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Summary Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
              allergiesData.active_count > 0
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}
          >
            {allergiesData.active_count > 0 ? (
              <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            )}
            <span>
              {allergiesData.active_count > 0
                ? `${allergiesData.active_count} Active ${allergiesData.active_count === 1 ? "Allergy" : "Allergies"}`
                : "No Allergies (NKDA)"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold">
            <Activity className="h-3.5 w-3.5 text-blue-600" />
            <span>{vitalsList.length} Recorded Visits</span>
          </div>
        </div>
      </div>

      {/* ================= SECTION 1: KNOWN ALLERGIES & CLINICAL ALERTS ================= */}
      <section className="space-y-3" aria-labelledby="allergies-heading">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h2 id="allergies-heading" className="text-sm font-bold text-slate-900">
                Known Allergies & Clinical Alerts
              </h2>
              <p className="text-[11px] text-slate-500">
                High-priority medical warnings shared with your clinical team before medications or procedures.
              </p>
            </div>
          </div>

          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
              allergiesData.allergies.length > 0
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}
          >
            {allergiesData.allergies.length} Recorded
          </span>
        </div>

        {/* High Alert Banner for Severe Allergies */}
        {hasSevereAllergy && (
          <div className="p-3.5 rounded-xl bg-red-50/90 border border-red-200 flex items-start gap-3 text-xs text-red-800 shadow-2xs">
            <AlertOctagon className="h-5 w-5 text-red-600 shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-1">
              <p className="font-bold text-red-900">
                Critical Safety Alert: Severe / Anaphylactic Allergies Recorded
              </p>
              <p className="text-red-700 leading-relaxed text-[11.5px]">
                Please verify that your attending physicians and nurses review these documented allergies before administering any oral, intravenous, or subcutaneous medications during consultations and hospital admissions.
              </p>
            </div>
          </div>
        )}

        {/* Allergies Cards Grid */}
        {allergiesData.allergies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {allergiesData.allergies.map((allergy) => {
              const sevBadge = getSeverityBadge(allergy.severity);
              const typeBadge = getSubstanceTypeBadge(allergy.substance_type);
              const isActive = allergy.status?.toUpperCase() === "ACTIVE";

              return (
                <div
                  key={allergy.id}
                  className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between gap-3 relative overflow-hidden"
                >
                  {/* Active Indicator Top Border Bar */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 ${
                      isActive
                        ? allergy.severity?.toUpperCase().includes("SEVERE")
                          ? "bg-red-500"
                          : "bg-amber-500"
                        : "bg-slate-300"
                    }`}
                  />

                  <div>
                    {/* Header: Substance name + Type Badge */}
                    <div className="flex items-start justify-between gap-2 pt-1">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-sm text-slate-900">
                            {allergy.substance_name}
                          </span>
                          {allergy.substance_code && (
                            <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                              {allergy.substance_code}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${typeBadge.bg}`}
                          >
                            {typeBadge.label}
                          </span>
                          <span
                            className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${sevBadge.bg}`}
                          >
                            {sevBadge.icon}
                            <span>{sevBadge.label}</span>
                          </span>
                        </div>
                      </div>

                      {/* Status indicator */}
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                          }`}
                        />
                        {allergy.status || "Active"}
                      </span>
                    </div>

                    {/* Allergic Reaction */}
                    {allergy.reaction && (
                      <div className="mt-3 p-2 rounded-lg bg-rose-50/70 border border-rose-100 text-xs">
                        <span className="font-bold text-rose-900">Adverse Reaction: </span>
                        <span className="text-rose-800 font-medium">{allergy.reaction}</span>
                      </div>
                    )}

                    {/* Clinical Notes / Warning instructions */}
                    {allergy.clinical_notes && (
                      <div className="mt-2 text-[11.5px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="font-semibold text-slate-800">Notes: </span>
                        <span>{allergy.clinical_notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer: Diagnosed By & Identified Date */}
                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-1 truncate max-w-[170px]" title={allergy.doctor_name || "Clinical Team"}>
                      <User className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="truncate">{allergy.doctor_name || "Hospital Clinician"}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 text-slate-500">
                      <CalendarIcon className="h-3 w-3 text-slate-400" />
                      <span>{formatDate(allergy.identified_at)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Safe Reassuring Empty State */
          <div className="bg-emerald-50/40 rounded-xl p-6 border border-emerald-200/80 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                <span>No Known Drug Allergies (NKDA) Recorded</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </h3>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Your medical chart has no recorded adverse reactions to medications, food, or environmental agents. If you develop rash, hives, or swelling after taking any prescription, notify your doctor immediately.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ================= SECTION 2: LATEST RECORDED VITALS SNAPSHOT ================= */}
      {latestVitals && (
        <section className="space-y-3" aria-labelledby="latest-vitals-heading">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#00488D] flex items-center justify-center border border-blue-100">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h2 id="latest-vitals-heading" className="text-sm font-bold text-slate-900">
                  {selectedDate ? "Recorded Vitals Snapshot for Selected Date" : "Latest Recorded Vitals Snapshot"}
                </h2>
                <p className="text-[11px] text-slate-500">
                  Physiological readings recorded on {formatDate(latestVitals.visit_date)}
                  {latestVitals.treating_doctor_name ? ` by ${latestVitals.treating_doctor_name}` : ""}.
                </p>
              </div>
            </div>

            {latestVitals.visit_type && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {latestVitals.visit_type}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Blood Pressure */}
            <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-100 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-rose-900">Blood Pressure</span>
                <Activity className="h-4 w-4 text-rose-600" />
              </div>
              <div className="mt-2">
                <div className="text-base font-extrabold text-slate-900">
                  {latestVitals.systolic_bp && latestVitals.diastolic_bp
                    ? `${latestVitals.systolic_bp}/${latestVitals.diastolic_bp}`
                    : latestVitals.systolic_bp
                    ? `${latestVitals.systolic_bp}`
                    : "--"}
                  <span className="text-[10px] font-normal text-slate-500 ml-1">mmHg</span>
                </div>
                <span className="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700">
                  BP Reading
                </span>
              </div>
            </div>

            {/* Heart Rate / Pulse */}
            <div className="p-3.5 rounded-xl bg-red-50/70 border border-red-100 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-red-900">Heart Rate</span>
                <HeartPulse className="h-4 w-4 text-red-600" />
              </div>
              <div className="mt-2">
                <div className="text-base font-extrabold text-slate-900">
                  {latestVitals.pulse || "--"}
                  <span className="text-[10px] font-normal text-slate-500 ml-1">bpm</span>
                </div>
                <span className="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-700">
                  Pulse
                </span>
              </div>
            </div>

            {/* Oxygen (SpO2) */}
            <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-100 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-sky-900">Blood Oxygen</span>
                <Droplets className="h-4 w-4 text-sky-600" />
              </div>
              <div className="mt-2">
                <div className="text-base font-extrabold text-slate-900">
                  {latestVitals.oxygen_saturation || "--"}
                  <span className="text-[10px] font-normal text-slate-500 ml-1">%</span>
                </div>
                <span className="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-100 text-sky-700">
                  SpO2 Saturation
                </span>
              </div>
            </div>

            {/* Temperature */}
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-100 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-amber-900">Temperature</span>
                <Thermometer className="h-4 w-4 text-amber-600" />
              </div>
              <div className="mt-2">
                <div className="text-sm font-extrabold text-slate-900">
                  {formatTemp(latestVitals.temperature)}
                </div>
                <span className="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-700">
                  Body Temp
                </span>
              </div>
            </div>

            {/* Respiratory Rate */}
            <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-100 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-teal-900">Respiratory</span>
                <Wind className="h-4 w-4 text-teal-600" />
              </div>
              <div className="mt-2">
                <div className="text-base font-extrabold text-slate-900">
                  {latestVitals.respiratory_rate || "--"}
                  <span className="text-[10px] font-normal text-slate-500 ml-1">/min</span>
                </div>
                <span className="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-teal-100 text-teal-700">
                  Breathing
                </span>
              </div>
            </div>

            {/* BMI & Weight */}
            <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-indigo-900">BMI / Weight</span>
                <Scale className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="mt-2">
                <div className="text-base font-extrabold text-slate-900">
                  {computedLatestBmi || "--"}
                  <span className="text-[10px] font-normal text-slate-500 ml-1">kg/m²</span>
                </div>
                {bmiStatus ? (
                  <span
                    className={`inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded border ${bmiStatus.color}`}
                  >
                    {bmiStatus.label}
                  </span>
                ) : (
                  <span className="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700">
                    {latestVitals.weight ? `${latestVitals.weight} kg` : "Calculated"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================= SECTION 3: PAST RECORDED VITALS DETAILS ================= */}
      <section className="space-y-4" aria-labelledby="vitals-details-heading">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#00488D] flex items-center justify-center border border-blue-100">
              <FileHeart className="h-4 w-4 text-[#00488D]" />
            </div>
            <div>
              <h2 id="vitals-details-heading" className="text-sm font-bold text-slate-900">
                Past Recorded Vitals Details
              </h2>
              <p className="text-[11px] text-slate-500">
                Detailed timeline of vital sign assessments and clinician observations across your visits.
              </p>
            </div>
          </div>

          {/* Top Actions: Date Navigator + Search */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quick Date Navigator with Calendar Dropdown */}
            <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
              <button
                type="button"
                onClick={() => navigateAvailableDate("prev")}
                disabled={availableDates.length === 0}
                className="flex items-center justify-center w-8 h-8 border-r border-slate-200 transition-colors hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
                title="Previous visit date"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={`flex items-center justify-center h-8 px-3 text-xs font-semibold transition-colors duration-150 hover:bg-slate-50 cursor-pointer ${
                      selectedDate ? "text-[#00488D] bg-blue-50/70 font-bold" : "text-slate-700 bg-white"
                    }`}
                  >
                    <CalendarIcon className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                    <span>{getDateLabel()}</span>
                  </button>
                </PopoverTrigger>

                <PopoverContent className="w-auto p-0 border border-slate-200 shadow-xl z-50 rounded-2xl overflow-hidden" align="end">
                  <div className="p-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <span className="text-xs font-bold text-slate-800">
                      Navigate Vitals by Visit Date
                    </span>
                    {selectedDate && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDate(null);
                          setIsCalendarOpen(false);
                        }}
                        className="text-xs text-[#00488D] hover:underline font-semibold cursor-pointer"
                      >
                        Clear Filter
                      </button>
                    )}
                  </div>

                  <CalendarPicker
                    selected={selectedDate}
                    highlightDates={availableDates}
                    hideThemePicker
                    onSelect={(date) => {
                      handleDateSelect(date instanceof Date ? date : null);
                      setIsCalendarOpen(false);
                    }}
                  />

                  <div className="p-2.5 border-t border-slate-100 flex items-center justify-between text-xs bg-slate-50">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDate(null);
                        setIsCalendarOpen(false);
                      }}
                      className="text-[#00488D] hover:text-blue-900 font-bold cursor-pointer"
                    >
                      Show All Dates
                    </button>
                    <span className="text-[11px] text-slate-500">
                      {availableDates.length} visit date{availableDates.length !== 1 ? "s" : ""} on record
                    </span>
                  </div>
                </PopoverContent>
              </Popover>

              <button
                type="button"
                onClick={() => navigateAvailableDate("next")}
                disabled={availableDates.length === 0}
                className="flex items-center justify-center w-8 h-8 border-l border-slate-200 transition-colors hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
                title="Next visit date"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Reset Date Pill (if date selected) */}
            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-blue-50 text-[#00488D] border border-blue-200 font-semibold hover:bg-blue-100 transition-colors cursor-pointer"
                title="Clear date filter and show all"
              >
                <RotateCcw className="w-3 h-3" />
                <span>All Dates</span>
              </button>
            )}

            {/* Search / Filter input */}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search visits, doctor, notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00488D] focus:border-transparent bg-white shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Active Date Filter Banner */}
        {selectedDate && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-xs">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-[#00488D]" />
              <span className="text-slate-800">
                Showing recorded vitals for{" "}
                <strong className="text-[#00488D]">{format(selectedDate, "EEEE, MMMM d, yyyy")}</strong>{" "}
                ({filteredVitals.length} found)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="flex items-center gap-1 font-bold text-[#00488D] hover:underline cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              <span>Show All Dates</span>
            </button>
          </div>
        )}

        {/* Vitals History Cards */}
        {filteredVitals.length > 0 ? (
          <div className="space-y-4">
            {filteredVitals.map((vitals, idx) => (
              <PatientVitalsCard
                key={vitals.id || vitals.patient_history_id || idx}
                vitals={vitals}
                compact={false}
              />
            ))}
          </div>
        ) : vitalsList.length > 0 ? (
          /* Search or Date Filter found 0 results */
          <div className="bg-white rounded-xl p-8 border border-slate-200 text-center flex flex-col items-center justify-center">
            <Search className="h-8 w-8 text-slate-400 mb-2" />
            <h3 className="text-xs font-bold text-slate-800">No matching vitals records found</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {selectedDate
                ? `No clinical vitals were recorded on ${format(selectedDate, "dd MMM yyyy")}.`
                : `No clinical visits match "${searchTerm}". Try clearing the search query.`}
            </p>
            <div className="mt-3 flex items-center gap-2">
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="px-3 py-1.5 rounded-lg bg-[#00488D] text-white text-xs font-semibold hover:bg-blue-800 transition-colors cursor-pointer"
                >
                  View All Dates
                </button>
              )}
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Clear Search
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Zero historical records */
          <div className="bg-white rounded-xl p-12 border border-slate-200 text-center flex flex-col items-center justify-center shadow-2xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <FileHeart className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Recorded Vitals Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Your physiological vital signs (Blood Pressure, Heart Rate, Body Temperature, SpO2) and clinical consultation observations will appear here once recorded during your hospital OPD visits.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
