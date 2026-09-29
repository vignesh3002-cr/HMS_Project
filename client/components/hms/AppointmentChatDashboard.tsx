import React, { useState, useMemo } from "react";
import { 
    Calendar, 
    CalendarDays, 
    Clock, 
    User, 
    Stethoscope, 
    Building2, 
    ChevronDown, 
    ChevronUp, 
    AlertCircle,
    Inbox
} from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { AIPerformedAction } from "@/api/ai-chat.api";
import { cn } from "@/lib/utils";

interface AppointmentChatDashboardProps {
    action: AIPerformedAction;
}

interface AppointmentItem {
    appointment_id?: string | number;
    status?: string;
    appointment_date?: string;
    appointment_time?: string;
    token_number?: number;
    patient_id?: string;
    patient_name?: string | null;
    doctor_name?: string | null;
    specialization?: string | null;
    department?: string | null;
    branch?: string | null;
    reason_for_visit?: string | null;
}

/**
 * Normalizes any date string or Date object to "YYYY-MM-DD".
 */
function normalizeDateStr(val: any): string {
    if (!val) return "";
    if (typeof val === "string") {
        if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
            return val.slice(0, 10);
        }
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
            return d.toISOString().slice(0, 10);
        }
        return val;
    }
    if (val instanceof Date) {
        return val.toISOString().slice(0, 10);
    }
    return String(val);
}

/**
 * Format a date string "YYYY-MM-DD" into a friendly day & date display.
 */
function formatDateDetails(dateStr: string) {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return { fullDate: dateStr, dayOfWeek: "", relativeTag: "" };
    }

    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

    let relativeTag = "";
    if (dateStr === todayStr) relativeTag = "Today";
    else if (dateStr === tomorrowStr) relativeTag = "Tomorrow";

    const dayOfWeek = dateObj.toLocaleDateString("en-US", { weekday: "short" });
    const fullDate = dateObj.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
    });

    return { fullDate, dayOfWeek, relativeTag };
}

/**
 * Normalizes time format to e.g. "10:30 AM"
 */
function formatTimeDisplay(timeStr?: string): string {
    if (!timeStr) return "N/A";
    const trimmed = timeStr.trim();
    if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(trimmed)) {
        return trimmed.toUpperCase();
    }
    const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (match) {
        let hour = parseInt(match[1], 10);
        const min = match[2];
        const ampm = hour >= 12 ? "PM" : "AM";
        hour = hour % 12 || 12;
        return `${hour}:${min} ${ampm}`;
    }
    return trimmed;
}

/**
 * Generate all dates between start and end inclusive (YYYY-MM-DD).
 */
function generateDateRange(startStr: string, endStr: string): string[] {
    const dates: string[] = [];
    if (!startStr || !endStr) return dates;
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [startStr];

    const current = new Date(start);
    while (current <= end && dates.length < 35) {
        dates.push(current.toISOString().slice(0, 10));
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

export function AppointmentChatDashboard({ action }: AppointmentChatDashboardProps) {
    // Track which dates are expanded with "Show More"
    const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

    const toggleExpandDate = (dateKey: string) => {
        setExpandedDates(prev => ({
            ...prev,
            [dateKey]: !prev[dateKey]
        }));
    };

    // Extract raw appointment rows and total
    const result = action?.result || {};
    const rawAppointments: AppointmentItem[] = useMemo(() => {
        if (Array.isArray(result?.appointments)) return result.appointments;
        if (Array.isArray(result?.data)) return result.data;
        if (Array.isArray(result)) return result;
        return [];
    }, [result]);

    const args = action?.args || {};

    // Determine query date range
    const { dateKeys, dateRangeLabel, totalDays } = useMemo(() => {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

        let rangeStart = "";
        let rangeEnd = "";

        if (args.dateFrom && args.dateTo) {
            rangeStart = normalizeDateStr(args.dateFrom);
            rangeEnd = normalizeDateStr(args.dateTo);
        } else if (args.date) {
            rangeStart = normalizeDateStr(args.date);
            rangeEnd = rangeStart;
        } else if (action.tool === "get_today_appointments") {
            rangeStart = todayStr;
            rangeEnd = todayStr;
        } else if (rawAppointments.length > 0) {
            // derive from returned appointments
            const distinctDates = Array.from(new Set(rawAppointments.map(a => normalizeDateStr(a.appointment_date)).filter(Boolean))).sort();
            rangeStart = distinctDates[0] || todayStr;
            rangeEnd = distinctDates[distinctDates.length - 1] || rangeStart;
        } else {
            rangeStart = todayStr;
            rangeEnd = todayStr;
        }

        // Generate date list
        let allDates: string[] = [];
        if (rangeStart && rangeEnd && rangeStart !== rangeEnd) {
            allDates = generateDateRange(rangeStart, rangeEnd);
        } else if (rangeStart) {
            allDates = [rangeStart];
        }

        // Also ensure any dates that came back in rawAppointments are included
        for (const apt of rawAppointments) {
            const d = normalizeDateStr(apt.appointment_date);
            if (d && !allDates.includes(d)) {
                allDates.push(d);
            }
        }
        allDates.sort();

        // Compute readable range label
        let rangeLabel = "";
        if (rangeStart === rangeEnd) {
            const { fullDate, relativeTag } = formatDateDetails(rangeStart);
            rangeLabel = relativeTag ? `${relativeTag} (${fullDate})` : fullDate;
        } else {
            const startDetails = formatDateDetails(rangeStart);
            const endDetails = formatDateDetails(rangeEnd);
            rangeLabel = `${startDetails.fullDate} — ${endDetails.fullDate}`;
        }

        const daysCount = allDates.length;

        return {
            dateKeys: allDates,
            dateRangeLabel: rangeLabel,
            totalDays: daysCount
        };
    }, [args, action.tool, rawAppointments]);

    // Group appointments by date
    const groupedAppointments = useMemo(() => {
        const groups: Record<string, AppointmentItem[]> = {};
        for (const date of dateKeys) {
            groups[date] = [];
        }

        for (const apt of rawAppointments) {
            const dateStr = normalizeDateStr(apt.appointment_date);
            if (!groups[dateStr]) {
                groups[dateStr] = [];
            }
            groups[dateStr].push(apt);
        }

        // Sort appointments within each day by time or token_number
        for (const date of Object.keys(groups)) {
            groups[date].sort((a, b) => {
                const timeA = a.appointment_time || "";
                const timeB = b.appointment_time || "";
                if (timeA && timeB) return timeA.localeCompare(timeB);
                return (a.token_number || 0) - (b.token_number || 0);
            });
        }

        return groups;
    }, [dateKeys, rawAppointments]);

    const totalCount = rawAppointments.length;
    const doctorFilter = rawAppointments[0]?.doctor_name || args.doctor_name || null;

    if (!action.success) {
        return (
            <div className="my-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
                <div className="flex items-center gap-2 font-semibold">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                    <span>Failed to retrieve appointments</span>
                </div>
                <p className="mt-1 text-red-600/90">{action.error || "An error occurred while fetching appointments."}</p>
            </div>
        );
    }

    return (
        <div className="my-2.5 flex flex-col overflow-hidden rounded-2xl border border-[#D0E1FD] bg-[#F7F9FC] shadow-sm">
            {/* Top Summary Banner */}
            <div className="border-b border-[#E2E8F0] bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#004785]/10 text-[#004785]">
                            <CalendarDays className="h-4 w-4" />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-[#0F172A] tracking-tight">
                                Appointments Schedule
                            </h4>
                            <p className="text-[11px] font-medium text-[#64748B]">
                                {dateRangeLabel}
                            </p>
                        </div>
                    </div>

                    {/* Summary Metric Pills */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#EBF3FF] px-2.5 py-0.5 text-[11px] font-bold text-[#004785] border border-[#BFDBFE]">
                            {totalCount} {totalCount === 1 ? "Apt" : "Apts"}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[11px] font-semibold text-[#475569] border border-[#E2E8F0]">
                            {totalDays} {totalDays === 1 ? "Day" : "Days"}
                        </span>
                    </div>
                </div>

                {doctorFilter && (
                    <div className="mt-2 flex items-center gap-1 text-[11px] text-[#475569]">
                        <Stethoscope className="h-3 w-3 text-[#004785]" />
                        <span className="font-semibold text-[#004785]">Doctor:</span>
                        <span>{doctorFilter}</span>
                    </div>
                )}
            </div>

            {/* Scrollable Date Groups Container */}
            <div className="max-h-[380px] overflow-y-auto p-3 space-y-3">
                {dateKeys.length === 0 || (totalCount === 0 && dateKeys.length === 1 && groupedAppointments[dateKeys[0]]?.length === 0) ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#EBF3FF] text-[#004785]">
                            <Inbox className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-semibold text-[#334155]">No appointments scheduled.</p>
                        <p className="mt-0.5 text-[11px] text-[#94A3B8]">
                            There are no appointments found for this period.
                        </p>
                    </div>
                ) : (
                    dateKeys.map((dateKey) => {
                        const { fullDate, relativeTag } = formatDateDetails(dateKey);
                        const dayAppointments = groupedAppointments[dateKey] || [];
                        const count = dayAppointments.length;
                        const isExpanded = !!expandedDates[dateKey];
                        const INITIAL_LIMIT = 3;
                        const hasMore = count > INITIAL_LIMIT;
                        const visibleAppointments = isExpanded ? dayAppointments : dayAppointments.slice(0, INITIAL_LIMIT);

                        return (
                            <div 
                                key={dateKey} 
                                className="rounded-xl border border-[#E2E8F0] bg-white shadow-xs overflow-hidden"
                            >
                                {/* Date Header */}
                                <div className="flex items-center justify-between border-b border-[#F1F5F9] bg-[#FAFCFF] px-3 py-2 text-xs">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-3.5 w-3.5 text-[#004785]" />
                                        <span className="font-bold text-[#1E293B]">
                                            {fullDate}
                                        </span>
                                        {relativeTag && (
                                            <span className="rounded bg-[#004785] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white">
                                                {relativeTag}
                                            </span>
                                        )}
                                    </div>
                                    <span className={cn(
                                        "rounded-full px-2 py-0.5 text-[10px] font-bold",
                                        count > 0 
                                            ? "bg-[#E0F2FE] text-[#0369A1]" 
                                            : "bg-gray-100 text-gray-500"
                                    )}>
                                        {count} {count === 1 ? "appointment" : "appointments"}
                                    </span>
                                </div>

                                {/* Date Body */}
                                <div className="p-2.5 space-y-2">
                                    {count === 0 ? (
                                        <div className="flex items-center justify-center py-2 text-[11px] italic text-[#94A3B8]">
                                            No appointments scheduled.
                                        </div>
                                    ) : (
                                        <>
                                            {visibleAppointments.map((apt, index) => {
                                                const patientName = apt.patient_name || "Unknown Patient";
                                                const patientId = apt.patient_id || apt.token_number ? `#${apt.patient_id || apt.token_number}` : null;
                                                const scheduledTime = formatTimeDisplay(apt.appointment_time);
                                                const doctorName = apt.doctor_name || "Specialist";
                                                const department = apt.department || "Outpatient";

                                                return (
                                                    <div 
                                                        key={apt.appointment_id ? String(apt.appointment_id) : `${dateKey}_${index}`}
                                                        className="group rounded-lg border border-[#E9EEF4] bg-[#FDFEFE] p-2.5 transition-all hover:border-[#BFDBFE] hover:shadow-xs"
                                                    >
                                                        {/* Top Row: Time, Status */}
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1E293B]">
                                                                <Clock className="h-3.5 w-3.5 text-[#004785]" />
                                                                <span>{scheduledTime}</span>
                                                            </div>
                                                            <StatusBadge status={apt.status || "scheduled"} />
                                                        </div>

                                                        {/* Middle Row: Patient Name & ID */}
                                                        <div className="mt-1.5 flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#0F172A] truncate">
                                                                <User className="h-3.5 w-3.5 text-[#64748B] shrink-0" />
                                                                <span className="truncate">{patientName}</span>
                                                            </div>
                                                            {patientId && (
                                                                <span className="shrink-0 rounded bg-[#F1F5F9] px-1.5 py-0.5 text-[10px] font-semibold text-[#475569]">
                                                                    ID: {patientId}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Bottom Row: Doctor & Department */}
                                                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#64748B]">
                                                            <div className="flex items-center gap-1 truncate max-w-[180px]">
                                                                <Stethoscope className="h-3 w-3 text-[#004785] shrink-0" />
                                                                <span className="truncate">{doctorName}</span>
                                                            </div>
                                                            {department && (
                                                                <div className="flex items-center gap-1 truncate">
                                                                    <Building2 className="h-3 w-3 text-[#94A3B8] shrink-0" />
                                                                    <span className="truncate text-[#475569]">{department}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {/* Show More / Show Less Toggle Button */}
                                            {hasMore && (
                                                <button
                                                    type="button"
                                                    onClick={() => toggleExpandDate(dateKey)}
                                                    className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] py-1.5 text-[11px] font-semibold text-[#004785] transition-colors hover:bg-[#EFF6FF] hover:border-[#93C5FD]"
                                                >
                                                    {isExpanded ? (
                                                        <>
                                                            <span>Show less</span>
                                                            <ChevronUp className="h-3.5 w-3.5" />
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span>Show +{count - INITIAL_LIMIT} more appointments</span>
                                                            <ChevronDown className="h-3.5 w-3.5" />
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
