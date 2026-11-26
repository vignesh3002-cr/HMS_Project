import React, { useEffect, useState, useMemo } from "react";
import { patientPortalApi, PatientPrescription } from "@/api/patientPortal.api";
import { PatientPrescriptionCard } from "@/components/patient-portal/PatientPrescriptionCard";
import {
  loadPatientDocuments,
  PatientDocumentItem,
  downloadDocument,
} from "@/utils/patientDocuments";
import { getUser } from "@/utils/token";
import WordImagesViewModal from "@/components/hms/WordImagesViewModal";
import CalendarPicker from "@/components/hms/Calender";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import {
  Search,
  Loader2,
  AlertCircle,
  FileText,
  Download,
  FolderOpen,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  X,
  RotateCcw,
} from "lucide-react";

export default function PatientPrescriptions() {
  const [prescriptions, setPrescriptions] = useState<PatientPrescription[]>([]);
  const [extraDocs, setExtraDocs] = useState<PatientDocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<PatientDocumentItem | null>(null);

  const user = getUser();
  const patientId = user?.patient_id || user?.patient_uhid || user?.uhid || "";

  useEffect(() => {
    let mounted = true;
    const fetchPrescriptionData = async () => {
      try {
        setLoading(true);
        const [rxResult, docsResult] = await Promise.all([
          patientPortalApi.getPrescriptions(),
          patientId ? loadPatientDocuments(patientId) : Promise.resolve([]),
        ]);

        if (mounted) {
          setPrescriptions(rxResult);

          // Find any documents in Document Library that are prescriptions but not in the prescription table
          const rxIds = new Set(rxResult.map((r) => r.prescription_id));
          const rxDocs = docsResult.filter(
            (d) =>
              (d.documentType === "PRESCRIPTION" ||
                d.name.toLowerCase().startsWith("prescription")) &&
              !Array.from(rxIds).some((id) => d.name.includes(id))
          );
          setExtraDocs(rxDocs);
          setError(null);
        }
      } catch (err: any) {
        if (mounted) {
          setError(
            err?.response?.data?.message ||
              err?.message ||
              "Failed to load prescription documents"
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchPrescriptionData();
    return () => {
      mounted = false;
    };
  }, [patientId]);

  // Extract all unique dates with prescriptions & their counts
  const { availableDates, dateCounts } = useMemo(() => {
    const datesMap = new Map<string, Date>();
    const counts = new Map<string, number>();

    const recordDate = (dateStr?: string | null) => {
      if (!dateStr) return;
      try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const key = format(d, "yyyy-MM-dd");
          datesMap.set(key, d);
          counts.set(key, (counts.get(key) || 0) + 1);
        }
      } catch {}
    };

    prescriptions.forEach((rx) => recordDate(rx.prescription_date));
    extraDocs.forEach((doc) => recordDate(doc.uploadDate));

    // Sort dates descending (newest first)
    const sortedDates = Array.from(datesMap.values()).sort(
      (a, b) => b.getTime() - a.getTime()
    );

    return { availableDates: sortedDates, dateCounts: counts };
  }, [prescriptions, extraDocs]);

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

  // Filtered prescriptions based on search & selected date
  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter((rx) => {
      // Date filter
      if (selectedDate) {
        const rxDate = rx.prescription_date ? new Date(rx.prescription_date) : null;
        if (!rxDate || isNaN(rxDate.getTime()) || !isSameDay(rxDate, selectedDate)) {
          return false;
        }
      }

      // Search filter
      const q = search.toLowerCase().trim();
      if (!q) return true;
      const items = rx.prescription_items || [];
      return (
        rx.prescription_id.toLowerCase().includes(q) ||
        (rx.employees?.first_name || "").toLowerCase().includes(q) ||
        (rx.employees?.last_name || "").toLowerCase().includes(q) ||
        (rx.department_master?.department_name || "").toLowerCase().includes(q) ||
        (rx.diagnosis?.diagnosis_name || "").toLowerCase().includes(q) ||
        items.some(
          (i) =>
            (i.drug_name || "").toLowerCase().includes(q) ||
            (i.medicine_master?.medicine_name || "").toLowerCase().includes(q)
        )
      );
    });
  }, [prescriptions, search, selectedDate]);

  // Filtered extra documents based on search & selected date
  const filteredExtraDocs = useMemo(() => {
    return extraDocs.filter((doc) => {
      // Date filter
      if (selectedDate) {
        const docDate = doc.uploadDate ? new Date(doc.uploadDate) : null;
        if (!docDate || isNaN(docDate.getTime()) || !isSameDay(docDate, selectedDate)) {
          return false;
        }
      }

      // Search filter
      const q = search.toLowerCase().trim();
      if (!q) return true;
      return (
        doc.name.toLowerCase().includes(q) ||
        doc.originalName.toLowerCase().includes(q)
      );
    });
  }, [extraDocs, search, selectedDate]);

  const totalFilteredCount = filteredPrescriptions.length + filteredExtraDocs.length;
  const totalAllCount = prescriptions.length + extraDocs.length;

  // Format label for date button
  const getDateLabel = () => {
    if (!selectedDate) return "All Dates";
    if (isToday(selectedDate)) return "Today";
    if (isYesterday(selectedDate)) return "Yesterday";
    return format(selectedDate, "dd MMM yyyy");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#00488D]" />
        <p className="text-xs font-semibold text-slate-500">
          Loading stored prescription documents...
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
        <h3 className="text-sm font-bold text-slate-800">
          Unable to load prescriptions
        </h3>
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="text-red-500">
                <i className="fa-solid fa-file-pdf" />
              </span>
              <span>Prescription Documents</span>
            </h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 border border-slate-200">
              {totalFilteredCount} of {totalAllCount} file{totalAllCount !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Browse and download doctor-prescribed medications and consultation sheets. Use the calendar at the top to filter past dates.
          </p>
        </div>

        {/* Top Actions: Date Navigator & Search */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Date Navigator with Calendar Dropdown */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => navigateAvailableDate("prev")}
              disabled={availableDates.length === 0}
              className="flex items-center justify-center w-8 h-8 border-r border-slate-200 transition-colors hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
              title="Previous record date"
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
                    Navigate Prescriptions by Date
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
                    {availableDates.length} date{availableDates.length !== 1 ? "s" : ""} on record
                  </span>
                </div>
              </PopoverContent>
            </Popover>

            <button
              type="button"
              onClick={() => navigateAvailableDate("next")}
              disabled={availableDates.length === 0}
              className="flex items-center justify-center w-8 h-8 border-l border-slate-200 transition-colors hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
              title="Next record date"
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

          {/* Search Input */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search medicine, doctor, or ID..."
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-[#00488D] w-52 sm:w-60 shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* ================= ACTIVE DATE FILTER BANNER ================= */}
      {selectedDate && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-xs">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[#00488D]" />
            <span className="text-slate-800">
              Showing prescriptions for{" "}
              <strong className="text-[#00488D]">{format(selectedDate, "EEEE, MMMM d, yyyy")}</strong>{" "}
              ({totalFilteredCount} found)
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

      {/* ================= MAIN RECORDS LIST ================= */}
      <section className="space-y-4">
        {/* Section Heading */}
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Prescription Library
          </h3>
          <span className="text-[11px] text-slate-400">
            Showing {totalFilteredCount} document{totalFilteredCount !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Empty State */}
        {totalFilteredCount === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-400 shadow-2xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <FolderOpen className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-700">No Prescriptions Found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {selectedDate
                ? `No prescriptions were recorded on ${format(selectedDate, "dd MMM yyyy")}.`
                : search
                ? "No prescription documents matched your search filter."
                : "No prescription documents are currently filed for your profile."}
            </p>
            {selectedDate && (
              <div className="mt-4 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="px-4 py-1.5 rounded-lg bg-[#00488D] text-white text-xs font-semibold hover:bg-blue-800 transition-colors cursor-pointer"
                >
                  View All Dates
                </button>
                {availableDates.length > 0 && (
                  <p className="text-[11px] text-slate-400">
                    Previous records are available on {availableDates.length} other dates. Pick a date using the calendar at the top.
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Prescriptions from prescription table */}
            {filteredPrescriptions.map((rx) => (
              <PatientPrescriptionCard
                key={rx.prescription_id}
                prescription={rx}
              />
            ))}

            {/* Any standalone prescription documents in patient_document */}
            {filteredExtraDocs.map((doc) => (
              <div
                key={doc.id}
                className="group relative rounded-xl border border-blue-100 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-blue-300 flex flex-col justify-between"
              >
                <div>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-red-500 text-lg flex-shrink-0">
                        <i className="fa-solid fa-file-pdf" />
                      </span>
                      <span className="rounded-full bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 text-[10px] font-bold">
                        PDF
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        Prescription
                      </span>
                    </div>
                  </div>

                  <h4
                    className="mb-1 text-sm font-bold text-slate-900 truncate"
                    title={doc.name}
                  >
                    {doc.name}
                  </h4>
                  <p className="mb-3 text-[11px] text-slate-500">
                    {doc.info}
                  </p>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(doc)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 cursor-pointer"
                  >
                    <i className="fa-regular fa-eye text-xs" />
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadDocument(doc)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 transition-colors hover:bg-slate-50 cursor-pointer"
                  >
                    <i className="fa-solid fa-download text-xs" />
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Shared Word/PDF preview modal */}
      {previewDoc && (
        <WordImagesViewModal
          documents={[previewDoc]}
          label={previewDoc.name}
          onClose={() => setPreviewDoc(null)}
          onDownload={() => downloadDocument(previewDoc)}
        />
      )}
    </div>
  );
}
