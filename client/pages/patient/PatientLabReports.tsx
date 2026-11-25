import React, { useEffect, useState, useMemo } from "react";
import { patientPortalApi, PatientLabOrder } from "@/api/patientPortal.api";
import { PatientLabReportCard } from "@/components/patient-portal/PatientLabReportCard";
import CalendarPicker from "@/components/hms/Calender";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import {
  FileText,
  Search,
  Loader2,
  AlertCircle,
  FlaskConical,
  CheckCircle2,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  X,
  RotateCcw,
} from "lucide-react";

export default function PatientLabReports() {
  const [orders, setOrders] = useState<PatientLabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterReadyOnly, setFilterReadyOnly] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchReports = async () => {
      try {
        setLoading(true);
        const result = await patientPortalApi.getLabReports();
        if (mounted) {
          setOrders(result);
          setError(null);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.response?.data?.message || err?.message || "Failed to load lab reports");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchReports();
    return () => {
      mounted = false;
    };
  }, []);

  // Extract all unique dates with lab orders & reports
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

    orders.forEach((order) => {
      recordDate(order.order_date || order.created_at);
    });

    // Sort descending (newest first)
    const sortedDates = Array.from(datesMap.values()).sort(
      (a, b) => b.getTime() - a.getTime()
    );

    return { availableDates: sortedDates, dateCounts: counts };
  }, [orders]);

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

  // Filter orders by date, search keyword, and ready-only status
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Date filter
      if (selectedDate) {
        const orderDateStr = order.order_date || order.created_at;
        const oDate = orderDateStr ? new Date(orderDateStr) : null;
        if (!oDate || isNaN(oDate.getTime()) || !isSameDay(oDate, selectedDate)) {
          return false;
        }
      }

      // 2. Keyword search filter
      const q = search.toLowerCase().trim();
      const items = order.lab_order_item || [];
      const matchSearch =
        !q ||
        order.order_id.toLowerCase().includes(q) ||
        (order.employees?.first_name || "").toLowerCase().includes(q) ||
        (order.employees?.last_name || "").toLowerCase().includes(q) ||
        (order.department_master?.department_name || "").toLowerCase().includes(q) ||
        items.some((i) =>
          (i.lab_test_master?.test_name || i.test_name || "").toLowerCase().includes(q)
        );

      if (!matchSearch) return false;

      // 3. Ready only filter
      if (filterReadyOnly) {
        return items.some(
          (i) =>
            Boolean(i.is_ready && i.lab_report) ||
            Boolean(i.lab_report?.report_file) ||
            (Boolean(i.lab_report) &&
              ["REPORT GENERATED", "VERIFIED", "COMPLETED", "DELIVERED", "GENERATED"].includes(
                (i.lab_report?.report_status || "").toUpperCase()
              ))
        );
      }

      return true;
    });
  }, [orders, search, filterReadyOnly, selectedDate]);

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
        <p className="text-xs font-semibold text-slate-500">Loading your diagnostic reports...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">Unable to load lab reports</h3>
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
              <FlaskConical className="h-5 w-5 text-teal-700" />
              <span>Diagnostic & Pathology Reports</span>
            </h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 border border-slate-200">
              {filteredOrders.length} of {orders.length} order{orders.length !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Access verified pathology results, consolidated panel parameters, and download single accredited PDF documents.
          </p>
        </div>

        {/* Top Actions: Date Navigator + Search + Ready Only */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Date Navigator with Calendar Dropdown */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => navigateAvailableDate("prev")}
              disabled={availableDates.length === 0}
              className="flex items-center justify-center w-8 h-8 border-r border-slate-200 transition-colors hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
              title="Previous report date"
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
                    Navigate Reports by Date
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
              title="Next report date"
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
              placeholder="Search by test or doctor..."
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-[#00488D] w-48 sm:w-56 shadow-2xs"
            />
          </div>

          {/* Ready Only Filter */}
          <button
            type="button"
            onClick={() => setFilterReadyOnly(!filterReadyOnly)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer ${
              filterReadyOnly
                ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Ready Only</span>
          </button>
        </div>
      </div>

      {/* ================= ACTIVE DATE FILTER BANNER ================= */}
      {selectedDate && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-teal-50/80 border border-teal-200 text-xs">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-teal-700" />
            <span className="text-slate-800">
              Showing diagnostic orders from{" "}
              <strong className="text-teal-800">{format(selectedDate, "EEEE, MMMM d, yyyy")}</strong>{" "}
              ({filteredOrders.length} found)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedDate(null)}
            className="flex items-center gap-1 font-bold text-teal-800 hover:underline cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
            <span>Show All Dates</span>
          </button>
        </div>
      )}

      {/* ================= MAIN REPORTS LIST ================= */}
      <section className="space-y-4">
        {/* Section Heading */}
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Orders & Reports Timeline
          </h3>
          <span className="text-[11px] text-slate-400">
            Showing {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Reports List */}
        {filteredOrders.length > 0 ? (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <PatientLabReportCard key={order.order_id} order={order} compact={false} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-12 border border-slate-200 text-center flex flex-col items-center justify-center shadow-2xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Diagnostic Reports Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              {selectedDate
                ? `No diagnostic test orders were found for ${format(selectedDate, "dd MMM yyyy")}.`
                : search
                ? "No test orders matched your search criteria. Try a different keyword."
                : "No diagnostic lab reports are recorded for your patient profile."}
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
                    Previous reports are available on {availableDates.length} other dates. Pick a date using the calendar at the top.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
