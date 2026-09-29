import {
    Bell,
    Building2,
    CalendarCheck,
    CalendarClock,
    CalendarDays,
    CalendarX,
    Clock,
    FileText,
    FlaskConical,
    HeartPulse,
    LayoutDashboard,
    Pill,
    Stethoscope,
    User,
    Users,
    type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AIPerformedAction } from "@/api/ai-chat.api";

/* ------------------------------------------------------------------
   Dashboard spec: every chatbot tool result is mapped to this one
   shape so all answers render with the same header / stat tiles /
   detail cards layout.
------------------------------------------------------------------ */

type Tone = "blue" | "green" | "purple" | "amber" | "red" | "slate";

interface Stat {
    label: string;
    value: string | number;
    tone: Tone;
}

interface Field {
    label: string;
    value: string;
}

interface Badge {
    text: string;
    tone: Tone;
}

interface Card {
    icon: LucideIcon;
    title: string;
    subtitle?: string;
    badge?: Badge;
    fields: Field[];
    footer?: { icon: LucideIcon; text: string };
}

interface ScheduleGroup {
    label: string;
    rows: { lead: string; primary: string; secondary?: string }[];
}

type Section =
    | { kind: "cards"; title: string; cards: Card[] }
    | { kind: "fields"; title: string; fields: Field[] }
    | { kind: "schedule"; title: string; noun: string; leadLabel: string; mainLabel: string; groups: ScheduleGroup[] }
    | { kind: "chips"; title: string; chips: Badge[] };

export interface DashboardSpec {
    icon: LucideIcon;
    title: string;
    subtitle?: string;
    stats: Stat[];
    sections: Section[];
}

/* ------------------------------------------------------------------
   Value helpers
------------------------------------------------------------------ */

const isBlank = (v: unknown) => v === null || v === undefined || String(v).trim() === "" || v === "-";

const text = (v: unknown, fallback = "—") => (isBlank(v) ? fallback : String(v).trim());

const joinName = (...parts: unknown[]) =>
    parts.filter((p) => !isBlank(p)).map((p) => String(p).trim()).join(" ");

const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;

const drName = (name: unknown) => (isBlank(name) ? "" : `Dr. ${String(name).replace(/^Dr\.?\s*/i, "")}`);

/* "2026-09-28" / "2026-09-28T00:00:00.000Z" -> "2026-09-28" */
const toDateKey = (v: unknown): string | null => {
    const m = isBlank(v) ? null : String(v).match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : null;
};

const dateFromKey = (key: string) => {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d);
};

const fmtDay = (key: string) =>
    dateFromKey(key).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

const fmtLongDate = (key: string) =>
    dateFromKey(key).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

const fmtShortDate = (key: string) =>
    dateFromKey(key).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/* Postgres TIME comes as "1970-01-01T09:00:00.000Z" or "09:00[:00]". */
const toMinutes = (v: unknown): number | null => {
    if (isBlank(v)) return null;
    const m = String(v).match(/(?:T|^)(\d{1,2}):(\d{2})/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

const fmtMinutes = (min: number) => {
    const h = Math.floor(min / 60);
    return `${h % 12 || 12}:${String(min % 60).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

const fmtTime = (v: unknown) => {
    const min = toMinutes(v);
    return min == null ? "—" : fmtMinutes(min);
};

const fmtTimeRange = (start: unknown, end: unknown) => {
    const s = toMinutes(start);
    const e = toMinutes(end);
    if (s == null) return "—";
    return e == null ? fmtMinutes(s) : `${fmtMinutes(s)} – ${fmtMinutes(e)}`;
};

/* Timestamp -> "Sep 28, 2026, 10:30 AM" */
const fmtDateTime = (v: unknown) => {
    if (isBlank(v)) return "—";
    const d = new Date(String(v));
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
};

const titleCase = (v: unknown) =>
    text(v)
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

const humanizeKey = (key: string) =>
    key
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/_/g, " ")
        .replace(/\bid\b/gi, "ID")
        .replace(/\b\w/g, (c) => c.toUpperCase());

const statusTone = (status: unknown): Tone => {
    const s = String(status || "").toUpperCase();
    if (/CANCEL|NO_SHOW|REJECT|FAIL|INACTIVE/.test(s)) return "red";
    if (/COMPLETE|CHECKED_OUT|DONE|ACTIVE|APPROVED|AVAILABLE/.test(s)) return "green";
    if (/CONSULT|CHECKED_IN|PROGRESS/.test(s)) return "purple";
    if (/PENDING|RESCHEDULE|NOT_CHECKED/.test(s)) return "amber";
    return "blue";
};

const shiftTone = (shift: string): Tone => {
    const s = shift.toLowerCase();
    if (s.includes("morning")) return "green";
    if (s.includes("afternoon")) return "amber";
    if (s.includes("evening") || s.includes("night")) return "blue";
    return "purple";
};

const fields = (...pairs: [string, unknown][]): Field[] =>
    pairs.filter(([, v]) => !isBlank(v)).map(([label, v]) => ({ label, value: String(v) }));

const distinct = (values: unknown[]) => new Set(values.filter((v) => !isBlank(v)).map(String)).size;

/* Unwrap list results that come as { appointments: [...] }, { data: [...] }, etc. */
const asList = (result: any, ...keys: string[]): any[] | null => {
    if (Array.isArray(result)) return result;
    for (const key of [...keys, "data", "items", "results"]) {
        if (Array.isArray(result?.[key])) return result[key];
    }
    return null;
};

/* ------------------------------------------------------------------
   Builders — one per chatbot tool
------------------------------------------------------------------ */

type Builder = (result: any, args?: any) => DashboardSpec | null;

function appointmentView(a: any) {
    const bio = a?.patient_bio_data;
    const emp = a?.employees;
    const minutes = toMinutes(a?.appointment_time);
    return {
        id: text(a?.appointment_id, ""),
        dateKey: toDateKey(a?.appointment_date),
        minutes: minutes ?? 24 * 60,
        time: minutes == null ? "—" : fmtMinutes(minutes),
        patient: joinName(bio?.patient_first_name, bio?.patient_middle_name, bio?.patient_last_name) || text(a?.patient_id, "Unknown patient"),
        doctor: drName(emp?.first_name ? joinName(emp.first_name, emp.last_name) : a?.doctor_name),
        department: text(a?.department_master?.department_name || emp?.specialization, ""),
        branch: text(a?.branch?.branch_name, ""),
        status: text(a?.status, ""),
        token: a?.token_number,
        reason: text(a?.reason_for_visit, ""),
    };
}

const appointmentList: Builder = (result) => {
    const list = asList(result, "appointments");
    if (!list || list.length === 0) return null;
    const rows = list.map(appointmentView).filter((r) => r.dateKey);
    if (rows.length === 0) return null;
    rows.sort((a, b) => a.dateKey!.localeCompare(b.dateKey!) || a.minutes - b.minutes);

    const groups = new Map<string, typeof rows>();
    for (const r of rows) {
        if (!groups.has(r.dateKey!)) groups.set(r.dateKey!, []);
        groups.get(r.dateKey!)!.push(r);
    }
    const days = [...groups.keys()];
    const first = days[0];
    const last = days[days.length - 1];

    return {
        icon: CalendarDays,
        title: "Appointments Overview",
        subtitle: first === last ? fmtLongDate(first) : `${fmtShortDate(first)} – ${fmtShortDate(last)}`,
        stats: [
            { label: "Total Appointments", value: rows.length, tone: "blue" },
            { label: "Total Days", value: days.length, tone: "green" },
            { label: "Doctors", value: distinct(rows.map((r) => r.doctor)), tone: "purple" },
        ],
        sections: [
            {
                kind: "schedule",
                title: "Daily Appointment Schedule",
                noun: "appointment",
                leadLabel: "Time",
                mainLabel: "Patient / Doctor",
                groups: days.map((day) => ({
                    label: fmtDay(day),
                    rows: groups.get(day)!.map((r) => ({
                        lead: r.time,
                        primary: r.patient,
                        secondary: [r.doctor, r.department, r.status && titleCase(r.status)].filter(Boolean).join(" · "),
                    })),
                })),
            },
        ],
    };
};

const singleAppointment = (title: string, icon: LucideIcon): Builder => (result) => {
    const a = result?.appointment ?? result;
    if (!a || typeof a !== "object" || Array.isArray(a)) return null;
    const v = appointmentView(a);
    return {
        icon,
        title,
        subtitle: v.dateKey ? fmtLongDate(v.dateKey) : undefined,
        stats: [
            { label: "Time", value: v.time, tone: "blue" },
            { label: "Token No.", value: text(v.token), tone: "green" },
            { label: "Status", value: titleCase(v.status), tone: statusTone(v.status) === "red" ? "red" : "purple" },
        ],
        sections: [
            {
                kind: "cards",
                title: "Appointment Details",
                cards: [
                    {
                        icon: User,
                        title: v.patient,
                        subtitle: v.id ? `Appointment No: ${v.id}` : undefined,
                        badge: v.status ? { text: titleCase(v.status), tone: statusTone(v.status) } : undefined,
                        fields: fields(["Doctor", v.doctor], ["Department", v.department], ["Branch", v.branch], ["Reason for Visit", v.reason]),
                        footer: { icon: Clock, text: v.dateKey ? `${fmtDay(v.dateKey)} · ${v.time}` : v.time },
                    },
                ],
            },
        ],
    };
};

const doctorsOnDuty: Builder = (result) => {
    const list = asList(result, "doctors");
    if (!list) return null;
    const dateKey = toDateKey(result?.date);

    // One card per doctor + branch; several shifts merge into one card.
    const merged = new Map<string, any>();
    for (const d of list) {
        const key = `${d.employee_id}|${d.branch_id}`;
        const entry = merged.get(key) ?? { ...d, shifts: [] as string[], times: [] as string[] };
        entry.shifts.push(text(d.shift, ""));
        entry.times.push(fmtTimeRange(d.start_time, d.end_time));
        merged.set(key, entry);
    }
    const doctors = [...merged.values()];

    return {
        icon: Stethoscope,
        title: dateKey && dateKey !== new Date().toLocaleDateString("en-CA") ? "Doctors On Duty" : "Doctors Present Today",
        subtitle: dateKey ? fmtLongDate(dateKey) : undefined,
        stats: [
            { label: "Doctors on Duty", value: distinct(doctors.map((d) => d.employee_id)), tone: "blue" },
            { label: "Branches", value: distinct(doctors.map((d) => d.branch_id)), tone: "green" },
            { label: "Departments", value: distinct(doctors.map((d) => d.department || d.specialization)), tone: "purple" },
        ],
        sections: [
            {
                kind: "cards",
                title: "Doctor Details",
                cards: doctors.map((d) => {
                    const shift = [...new Set(d.shifts.filter(Boolean))].join(" · ");
                    return {
                        icon: User,
                        title: drName(d.name),
                        subtitle: `Employee ID: ${text(d.employee_id)}`,
                        badge: shift ? { text: shift, tone: shiftTone(shift) } : undefined,
                        fields: fields(
                            ["Specialization", d.specialization || d.department],
                            ["Branch", d.branch ? `${d.branch}${d.branch_id ? ` (${d.branch_id})` : ""}` : d.branch_id],
                        ),
                        footer: { icon: Clock, text: d.times.join(" · ") },
                    };
                }),
            },
        ],
    };
};

const doctorList: Builder = (result) => {
    const list = asList(result) ?? (result && typeof result === "object" ? [result] : null);
    if (!list || list.length === 0) return null;
    const single = !Array.isArray(result);
    return {
        icon: Stethoscope,
        title: single ? "Doctor Profile" : "Doctor Search Results",
        subtitle: single ? undefined : plural(list.length, "doctor") + " found",
        stats: [
            { label: "Doctors", value: list.length, tone: "blue" },
            { label: "Departments", value: distinct(list.map((d) => d.department)), tone: "green" },
            { label: "Specializations", value: distinct(list.map((d) => d.specialization)), tone: "purple" },
        ],
        sections: [
            {
                kind: "cards",
                title: "Doctor Details",
                cards: list.map((d) => ({
                    icon: User,
                    title: drName(d.name),
                    subtitle: `Employee ID: ${text(d.employee_id)}`,
                    badge: d.designation ? { text: text(d.designation), tone: "blue" } : undefined,
                    fields: fields(
                        ["Specialization", d.specialization],
                        ["Department", d.department],
                        ["Mobile", d.mobile],
                        ["Email", d.email],
                    ),
                    footer: d.license_no ? { icon: FileText, text: `License: ${d.license_no}` } : undefined,
                })),
            },
        ],
    };
};

const doctorSchedule: Builder = (result) => {
    const list = asList(result);
    if (!list || list.length === 0) return null;
    return {
        icon: CalendarClock,
        title: "Doctor Weekly Schedule",
        subtitle: plural(list.length, "shift"),
        stats: [
            { label: "Shifts", value: list.length, tone: "blue" },
            { label: "Working Days", value: distinct(list.map((s) => s.day)), tone: "green" },
            { label: "Branches", value: distinct(list.map((s) => s.branch_id || s.branch)), tone: "purple" },
        ],
        sections: [
            {
                kind: "cards",
                title: "Schedule Details",
                cards: list.map((s) => {
                    const shift = text(s.shift, "");
                    return {
                        icon: CalendarDays,
                        title: titleCase(s.day),
                        badge: shift ? { text: shift, tone: shiftTone(shift) } : undefined,
                        fields: fields(
                            ["Branch", s.branch],
                            ["Consultation Time", s.consultation_minutes ? `${s.consultation_minutes} min per patient` : null],
                        ),
                        footer: { icon: Clock, text: fmtTimeRange(s.start_time, s.end_time) },
                    };
                }),
            },
        ],
    };
};

const availableSlots: Builder = (result) => {
    const slots = asList(result, "slots");
    if (!slots) return null;
    const dateKey = toDateKey(result?.date);
    const free = slots.filter((s) => s.is_available !== false);
    return {
        icon: CalendarCheck,
        title: "Available Slots",
        subtitle: dateKey ? fmtLongDate(dateKey) : undefined,
        stats: [
            { label: "Available", value: free.length, tone: "green" },
            { label: "Booked", value: slots.length - free.length, tone: "red" },
            { label: "Total Slots", value: slots.length, tone: "blue" },
        ],
        sections: result?.is_on_leave
            ? [{ kind: "fields", title: "Doctor Status", fields: fields(["Status", "On leave"], ["Reason", result.leave_reason]) }]
            : [
                  {
                      kind: "chips",
                      title: "Slot Timings",
                      chips: slots.map((s) => ({
                          text: fmtTime(s.time ?? s.start_time),
                          tone: s.is_available === false ? "slate" : "green",
                      })),
                  },
              ],
    };
};

const patientList: Builder = (result) => {
    const list = asList(result, "patients");
    if (!list || list.length === 0) return null;
    return {
        icon: Users,
        title: "Patient Search Results",
        subtitle: plural(list.length, "patient") + " found",
        stats: [
            { label: "Patients Found", value: list.length, tone: "blue" },
            { label: "Active", value: list.filter((p) => p.active !== false).length, tone: "green" },
            { label: "Patient Types", value: distinct(list.map((p) => p.type)), tone: "purple" },
        ],
        sections: [
            {
                kind: "cards",
                title: "Patient Details",
                cards: list.map((p) => ({
                    icon: User,
                    title: text(p.name || joinName(p.patient_first_name, p.patient_last_name)),
                    subtitle: `Patient ID: ${text(p.patient_id)}`,
                    badge: p.type ? { text: text(p.type), tone: "blue" } : undefined,
                    fields: fields(
                        ["Gender", p.gender && titleCase(p.gender)],
                        ["Age", p.age],
                        ["Date of Birth", toDateKey(p.dob) && fmtShortDate(toDateKey(p.dob)!)],
                        ["Email", p.email],
                    ),
                    footer: p.mobile ? { icon: User, text: `Mobile: ${p.mobile}` } : undefined,
                })),
            },
        ],
    };
};

const patientProfile: Builder = (p) => {
    if (!p || typeof p !== "object" || Array.isArray(p)) return null;
    const dob = toDateKey(p.patient_dob);
    return {
        icon: User,
        title: joinName(p.patient_first_name, p.patient_middle_name, p.patient_last_name) || "Patient Profile",
        subtitle: `Patient ID: ${text(p.patient_id)}`,
        stats: [
            { label: "Age", value: text(p.patient_age), tone: "blue" },
            { label: "Gender", value: titleCase(p.patient_gender), tone: "green" },
            { label: "Blood Group", value: text(p.patient_blood_group), tone: "red" },
        ],
        sections: [
            {
                kind: "fields",
                title: "Patient Information",
                fields: fields(
                    ["Mobile", p.patient_primary_mobile],
                    ["Email", p.patient_email],
                    ["Date of Birth", dob && fmtShortDate(dob)],
                    ["Patient Type", p.patient_type],
                    ["Address", p.current_address],
                    ["Emergency Contact", joinName(p.emergency_name, p.emergency_relation && `(${p.emergency_relation})`)],
                    ["Emergency Mobile", p.emergency_mobile],
                ),
            },
        ],
    };
};

function vitalFields(v: any): Field[] {
    return fields(
        ["Blood Pressure", !isBlank(v.systolic_bp) ? `${v.systolic_bp}/${text(v.diastolic_bp)} mmHg` : null],
        ["Pulse", !isBlank(v.pulse) ? `${v.pulse} bpm` : null],
        ["Temperature", !isBlank(v.temperature) ? `${v.temperature} °F` : null],
        ["SpO₂", !isBlank(v.spo2) ? `${v.spo2} %` : null],
        ["Respiratory Rate", !isBlank(v.respiratory_rate) ? `${v.respiratory_rate} /min` : null],
        ["Blood Sugar", !isBlank(v.blood_sugar) ? `${v.blood_sugar} mg/dL` : null],
        ["Pain Score", !isBlank(v.pain_score) ? `${v.pain_score} / 10` : null],
        ["Height", !isBlank(v.height) ? `${v.height} cm` : null],
        ["Weight", !isBlank(v.weight) ? `${v.weight} kg` : null],
        ["BMI", v.bmi],
    );
}

const vitalsStats = (v: any): Stat[] => [
    { label: "Blood Pressure", value: !isBlank(v.systolic_bp) ? `${v.systolic_bp}/${text(v.diastolic_bp)}` : "—", tone: "blue" },
    { label: "Pulse", value: text(v.pulse), tone: "green" },
    { label: "SpO₂", value: !isBlank(v.spo2) ? `${v.spo2}%` : "—", tone: "purple" },
];

const latestVitals: Builder = (v) => {
    if (!v || typeof v !== "object") return null;
    return {
        icon: HeartPulse,
        title: "Latest Vital Signs",
        subtitle: [v.encounter_no && `Encounter ${v.encounter_no}`, fmtDateTime(v.date)].filter(Boolean).join(" · "),
        stats: vitalsStats(v),
        sections: [{ kind: "fields", title: "Vital Details", fields: vitalFields(v) }],
    };
};

const vitalsHistory: Builder = (result) => {
    const list = asList(result);
    if (!list || list.length === 0) return null;
    return {
        icon: HeartPulse,
        title: "Vital Signs History",
        subtitle: plural(list.length, "record"),
        stats: vitalsStats(list[0]),
        sections: [
            {
                kind: "cards",
                title: "Recorded Vitals",
                cards: list.map((v) => ({
                    icon: HeartPulse,
                    title: fmtDateTime(v.date),
                    subtitle: v.encounter_no ? `Encounter: ${v.encounter_no}` : undefined,
                    fields: vitalFields(v),
                })),
            },
        ],
    };
};

const departmentList: Builder = (result) => {
    const list = asList(result);
    if (!list || list.length === 0) return null;
    return {
        icon: Building2,
        title: "Departments",
        subtitle: plural(list.length, "department"),
        stats: [{ label: "Total Departments", value: list.length, tone: "blue" }],
        sections: [
            {
                kind: "chips",
                title: "Department List",
                chips: list.map((d) => ({ text: text(d.department_name), tone: "purple" as Tone })),
            },
        ],
    };
};

const medicineList: Builder = (result) => {
    const list = asList(result);
    if (!list || list.length === 0) return null;
    return {
        icon: Pill,
        title: "Medicine Search Results",
        subtitle: plural(list.length, "medicine") + " found",
        stats: [
            { label: "Medicines", value: list.length, tone: "blue" },
            { label: "Dosage Forms", value: distinct(list.map((m) => m.dosage_form)), tone: "green" },
            { label: "Manufacturers", value: distinct(list.map((m) => m.manufacturer)), tone: "purple" },
        ],
        sections: [
            {
                kind: "cards",
                title: "Medicine Details",
                cards: list.map((m) => ({
                    icon: Pill,
                    title: text(m.name),
                    subtitle: m.generic_name ? `Generic: ${m.generic_name}` : undefined,
                    badge: m.dosage_form ? { text: text(m.dosage_form), tone: "blue" } : undefined,
                    fields: fields(["Strength", m.strength], ["Route", m.route], ["Manufacturer", m.manufacturer]),
                    footer: !isBlank(m.selling_price) ? { icon: FileText, text: `Price: ₹${m.selling_price}` } : undefined,
                })),
            },
        ],
    };
};

const dashboardSummary: Builder = (s) => {
    if (!s || typeof s !== "object") return null;
    const breakdown: Record<string, number> = s.status_breakdown || {};
    const count = (re: RegExp) =>
        Object.entries(breakdown).reduce((sum, [k, n]) => (re.test(k) ? sum + Number(n || 0) : sum), 0);
    const dateKey = toDateKey(s.date);
    return {
        icon: LayoutDashboard,
        title: "Today's Summary",
        subtitle: dateKey ? fmtLongDate(dateKey) : undefined,
        stats: [
            { label: "Appointments", value: text(s.total_appointments, "0"), tone: "blue" },
            { label: "Checked In", value: text(s.checked_in_today, "0"), tone: "green" },
            { label: "Completed", value: count(/COMPLETE/), tone: "purple" },
        ],
        sections: Object.keys(breakdown).length
            ? [
                  {
                      kind: "fields",
                      title: "Status Breakdown",
                      fields: Object.entries(breakdown).map(([k, n]) => ({ label: titleCase(k), value: String(n) })),
                  },
              ]
            : [],
    };
};

const notificationList: Builder = (result) => {
    const list = asList(result, "notifications");
    if (!list) return null;
    const unread = result?.unreadCount ?? list.filter((n) => n.is_read === false).length;
    return {
        icon: Bell,
        title: "Notifications",
        subtitle: plural(list.length, "notification"),
        stats: [
            { label: "Total", value: list.length, tone: "blue" },
            { label: "Unread", value: unread, tone: "amber" },
        ],
        sections: list.length
            ? [
                  {
                      kind: "cards",
                      title: "Recent Notifications",
                      cards: list.map((n) => ({
                          icon: Bell,
                          title: text(n.title || titleCase(n.notification_type)),
                          badge: n.is_read === false ? { text: "Unread", tone: "amber" as Tone } : undefined,
                          fields: fields(["Message", n.message || n.body]),
                          footer: n.created_at ? { icon: Clock, text: fmtDateTime(n.created_at) } : undefined,
                      })),
                  },
              ]
            : [],
    };
};

/* Fallback for tools without a dedicated builder (prescriptions, lab
   orders, encounters, created/updated records): cards from scalar fields. */
function scalarFields(obj: any, limit = 8): Field[] {
    return Object.entries(obj ?? {})
        .filter(([k, v]) => !isBlank(v) && typeof v !== "object" && !/password|token|hash|photo|url/i.test(k))
        .slice(0, limit)
        .map(([k, v]) => {
            const dateKey = typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v) ? v : null;
            return {
                label: humanizeKey(k),
                value: typeof v === "boolean" ? (v ? "Yes" : "No") : dateKey ? fmtDateTime(dateKey) : String(v),
            };
        });
}

const cardTitleOf = (obj: any) =>
    text(
        obj?.name ??
            obj?.title ??
            obj?.medicine_name ??
            obj?.test_name ??
            obj?.lab_test_master?.test_name ??
            obj?.encounter_no ??
            obj?.prescription_id ??
            obj?.order_id ??
            obj?.id,
        "Record",
    );

const genericFor = (title: string, icon: LucideIcon): Builder => (result) => {
    const list = asList(result);
    if (list) {
        if (list.length === 0) return null;
        return {
            icon,
            title,
            subtitle: plural(list.length, "record"),
            stats: [{ label: "Total Records", value: list.length, tone: "blue" }],
            sections: [
                {
                    kind: "cards",
                    title: "Details",
                    cards: list.map((item) => ({
                        icon,
                        title: cardTitleOf(item),
                        badge: item?.status ? { text: titleCase(item.status), tone: statusTone(item.status) } : undefined,
                        fields: scalarFields(item),
                    })),
                },
            ],
        };
    }
    if (result && typeof result === "object") {
        const nested = Object.entries(result).filter(([, v]) => Array.isArray(v) && v.length && typeof v[0] === "object");
        return {
            icon,
            title,
            subtitle: result.status ? titleCase(result.status) : undefined,
            stats: [],
            sections: [
                { kind: "fields", title: "Details", fields: scalarFields(result, 12) },
                ...nested.map(([k, v]) => ({
                    kind: "cards" as const,
                    title: humanizeKey(k),
                    cards: (v as any[]).map((item) => ({ icon, title: cardTitleOf(item), fields: scalarFields(item) })),
                })),
            ],
        };
    }
    return null;
};

const BUILDERS: Record<string, Builder> = {
    get_today_appointments: appointmentList,
    search_appointments: appointmentList,
    get_appointment: singleAppointment("Appointment Details", CalendarDays),
    create_appointment: singleAppointment("Appointment Booked", CalendarCheck),
    reschedule_appointment: singleAppointment("Appointment Rescheduled", CalendarClock),
    cancel_appointment: singleAppointment("Appointment Cancelled", CalendarX),
    get_available_slots: availableSlots,
    get_doctors_on_duty: doctorsOnDuty,
    search_doctor: doctorList,
    get_doctor: doctorList,
    get_doctor_schedule: doctorSchedule,
    search_patient: patientList,
    get_patient: patientProfile,
    create_patient: patientProfile,
    update_patient: patientProfile,
    get_latest_vitals: latestVitals,
    get_patient_vitals: vitalsHistory,
    search_department: departmentList,
    get_department: departmentList,
    search_medicine: medicineList,
    get_dashboard_summary: dashboardSummary,
    get_notifications: notificationList,
    get_patient_prescriptions: genericFor("Prescriptions", FileText),
    get_prescription: genericFor("Prescription Details", FileText),
    get_patient_lab_orders: genericFor("Lab Orders", FlaskConical),
    get_patient_encounters: genericFor("Patient Encounters", Stethoscope),
};

/* Build the dashboard for an AI message from its tool results. The last
   successful tool with data wins (e.g. search_patient -> get_latest_vitals
   shows the vitals). Returns null when there is nothing to render. */
export function buildDashboard(actions?: AIPerformedAction[]): DashboardSpec | null {
    if (!actions?.length) return null;
    for (let i = actions.length - 1; i >= 0; i--) {
        const action = actions[i];
        if (!action.success || action.result == null) continue;
        const builder = BUILDERS[action.tool] ?? genericFor(humanizeKey(action.tool), FileText);
        try {
            const spec = builder(action.result);
            if (spec) return spec;
        } catch (err) {
            console.warn("AI dashboard render skipped for", action.tool, err);
        }
    }
    return null;
}

/* ------------------------------------------------------------------
   Rendering
------------------------------------------------------------------ */

const TONE: Record<Tone, { tile: string; label: string; value: string; badge: string }> = {
    blue: { tile: "bg-[#E8F0FE]", label: "text-[#1E40AF]", value: "text-[#1E40AF]", badge: "bg-[#E8F0FE] text-[#2563EB]" },
    green: { tile: "bg-[#E6F4EA]", label: "text-[#166534]", value: "text-[#166534]", badge: "bg-[#DCF5E3] text-[#15803D]" },
    purple: { tile: "bg-[#F3E8FF]", label: "text-[#6B21A8]", value: "text-[#7E22CE]", badge: "bg-[#F3E8FF] text-[#7E22CE]" },
    amber: { tile: "bg-[#FEF3C7]", label: "text-[#92400E]", value: "text-[#B45309]", badge: "bg-[#FEF3C7] text-[#B45309]" },
    red: { tile: "bg-[#FEE2E2]", label: "text-[#991B1B]", value: "text-[#B91C1C]", badge: "bg-[#FEE2E2] text-[#B91C1C]" },
    slate: { tile: "bg-[#F1F5F9]", label: "text-[#475569]", value: "text-[#334155]", badge: "bg-[#F1F5F9] text-[#94A3B8] line-through" },
};

function BadgePill({ badge }: { badge: Badge }) {
    return (
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", TONE[badge.tone].badge)}>
            {badge.text}
        </span>
    );
}

function DetailCard({ card }: { card: Card }) {
    const Icon = card.icon;
    const Footer = card.footer?.icon;
    return (
        <div className="rounded-lg border border-[#E5E7EB] px-3 py-2.5">
            <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E8F0FE]">
                    <Icon className="h-4 w-4 text-[#2563EB]" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-[#191C1E]">{card.title}</p>
                    {card.subtitle && <p className="truncate text-[10px] text-[#64748B]">{card.subtitle}</p>}
                </div>
                {card.badge && <BadgePill badge={card.badge} />}
            </div>
            {(card.fields.length > 0 || card.footer) && (
                <div className="mt-2.5 space-y-1.5 border-t border-[#EEF0F3] pt-2">
                    {card.fields.map((f) => (
                        <div key={f.label}>
                            <p className="text-[10px] text-[#64748B]">{f.label}</p>
                            <p className="break-words text-[12px] font-medium text-[#191C1E]">{f.value}</p>
                        </div>
                    ))}
                    {card.footer && Footer && (
                        <p className="flex items-center gap-1.5 pt-0.5 text-[12px] font-semibold text-[#191C1E]">
                            <Footer className="h-3.5 w-3.5 text-[#64748B]" />
                            {card.footer.text}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

function SectionView({ section }: { section: Section }) {
    return (
        <div>
            <h4 className="mb-2 mt-4 text-[13px] font-semibold text-[#191C1E]">{section.title}</h4>

            {section.kind === "cards" && (
                <div className="space-y-2">
                    {section.cards.map((card, i) => (
                        <DetailCard key={`${card.title}-${i}`} card={card} />
                    ))}
                </div>
            )}

            {section.kind === "fields" && (
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-lg border border-[#E5E7EB] px-3 py-2.5">
                    {section.fields.map((f) => (
                        <div key={f.label} className="min-w-0">
                            <p className="text-[10px] text-[#64748B]">{f.label}</p>
                            <p className="break-words text-[12px] font-medium text-[#191C1E]">{f.value}</p>
                        </div>
                    ))}
                </div>
            )}

            {section.kind === "chips" && (
                <div className="flex flex-wrap gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-2.5">
                    {section.chips.map((chip, i) => (
                        <BadgePill key={`${chip.text}-${i}`} badge={chip} />
                    ))}
                </div>
            )}

            {section.kind === "schedule" && (
                <div className="space-y-2">
                    {section.groups.map((group) => (
                        <div key={group.label} className="rounded-lg border border-[#E5E7EB] px-3 py-2.5">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[13px] font-semibold text-[#191C1E]">{group.label}</span>
                                <BadgePill badge={{ text: plural(group.rows.length, section.noun), tone: "blue" }} />
                            </div>
                            <div className="mt-2 grid grid-cols-[72px_1fr] border-b border-[#EEF0F3] pb-1 text-[10px] text-[#64748B]">
                                <span>{section.leadLabel}</span>
                                <span>{section.mainLabel}</span>
                            </div>
                            {group.rows.map((row, i) => (
                                <div
                                    key={`${row.primary}-${i}`}
                                    className="grid grid-cols-[72px_1fr] border-b border-[#EEF0F3] py-1.5 last:border-b-0"
                                >
                                    <span className="text-[12px] text-[#191C1E]">{row.lead}</span>
                                    <div className="min-w-0">
                                        <p className="truncate text-[12px] text-[#191C1E]">{row.primary}</p>
                                        {row.secondary && <p className="truncate text-[10px] text-[#64748B]">{row.secondary}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export function AIDashboardView({ spec }: { spec: DashboardSpec }) {
    const Icon = spec.icon;
    return (
        <div className="w-full rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-sm">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F0FE]">
                    <Icon className="h-5 w-5 text-[#2563EB]" />
                </div>
                <div className="min-w-0">
                    <h3 className="truncate text-[15px] font-semibold text-[#191C1E]">{spec.title}</h3>
                    {spec.subtitle && <p className="truncate text-[11px] text-[#64748B]">{spec.subtitle}</p>}
                </div>
            </div>

            {spec.stats.length > 0 && (
                <div
                    className="mt-3 grid gap-2"
                    style={{ gridTemplateColumns: `repeat(${spec.stats.length}, minmax(0, 1fr))` }}
                >
                    {spec.stats.map((s) => (
                        <div key={s.label} className={cn("min-w-0 rounded-lg px-2.5 py-2", TONE[s.tone].tile)}>
                            <p className={cn("truncate text-[10px]", TONE[s.tone].label)}>{s.label}</p>
                            <p className={cn("truncate text-xl font-semibold", TONE[s.tone].value)}>{s.value}</p>
                        </div>
                    ))}
                </div>
            )}

            {spec.sections.map((section, i) => (
                <SectionView key={`${section.title}-${i}`} section={section} />
            ))}
        </div>
    );
}
