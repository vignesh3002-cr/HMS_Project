const DIGITS_ONLY = /[^\d]/g;

function digits(value: string | null | undefined): string {
  return (value ?? "").replace(DIGITS_ONLY, "");
}

export function formatAadhaar(value: string | null | undefined): string {
  const d = digits(value);
  if (!d) return value || "";
  return d
    .slice(0, 12)
    .match(/.{1,4}/g)
    ?.join("-") ?? d;
}

export function formatPan(value: string | null | undefined): string {
  const clean = (value ?? "").toUpperCase().trim();
  if (!clean) return value || "";
  return clean.replace(/[^A-Z0-9]/g, "").slice(0, 10);
}

export function formatLicenseNo(value: string | null | undefined): string {
  return formatGeneralId(value);
}

export function formatPassportNo(value: string | null | undefined): string {
  return formatGeneralId(value);
}

function formatGeneralId(value: string | null | undefined): string {
  const clean = (value ?? "").toUpperCase().trim();
  if (!clean) return value || "";
  const filtered = clean.replace(/[^A-Z0-9]/g, "");
  return filtered.replace(/(.{4})/g, "$1 ").trim();
}

export function formatMobile(value: string | null | undefined): string {
  const d = digits(value);
  if (!d) return value || "";
  const local = d.length > 10 ? d.slice(-10) : d;
  if (local.length < 10) return local;
  const cc = d.length > 10 ? d.slice(0, d.length - 10) : "91";
  return `+${cc}-${local.slice(0, 5)}-${local.slice(5)}`;
}

export function formatDoctorIdField(
  kind: "aadhaar" | "pan" | "license" | "passport" | "mobile",
  value: string | null | undefined,
): string {
  if (!value) return value || "";
  switch (kind) {
    case "aadhaar":
      return formatAadhaar(value);
    case "pan":
      return formatPan(value);
    case "license":
      return formatLicenseNo(value);
    case "passport":
      return formatPassportNo(value);
    case "mobile":
      return formatMobile(value);
  }
}

// ─── Input (live masking) formatters ─────────────────────────────────────────
// Applied while the user types so fields show formatted values immediately.
// All are idempotent and null/partial-safe so they can run on every keystroke.

export function formatInputAadhaar(value: string): string {
  const d = digits(value);
  return d.slice(0, 12).replace(/(\d{4})(?=\d)/g, "$1-");
}

export function formatInputPan(value: string): string {
  const cleaned = (value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  let out = "";
  for (let i = 0; i < cleaned.length && i < 10; i++) {
    const ch = cleaned[i];
    const isLetter = /[A-Z]/.test(ch);
    const wantLetter = i < 5 || i === 9;
    if ((wantLetter && isLetter) || (!wantLetter && !isLetter)) {
      out += ch;
    }
  }
  return out;
}

export function formatInputGst(value: string): string {
  const clean = (value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return clean.slice(0, 15);
}

export function formatInputLicense(value: string): string {
  return formatGeneralId(value);
}

export function formatInputPassport(value: string): string {
  return formatInputIndianPassport(value);
}

export function formatInputIndianPassport(value: string): string {
  const cleaned = (value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  let out = "";
  for (let i = 0; i < cleaned.length && i < 8; i++) {
    const ch = cleaned[i];
    const isLetter = /[A-Z]/.test(ch);
    const wantLetter = i < 2;
    if ((wantLetter && isLetter) || (!wantLetter && !isLetter)) {
      out += ch;
    }
  }
  return out;
}

export function formatInputFax(value: string): string {
  const d = digits(value);
  if (!d) return "";
  return d.slice(0, 20);
}

// ─── Generic input formatters (character-type filtering) ─────────────────────
// These strip characters as the user types so a field can only ever hold a
// given character set. All are idempotent and partial-safe.

const ALPHA_ONLY = /[^A-Za-z ]/g;
const ALNUM_SPACE = /[^A-Za-z0-9 ]/g;

// Numbers only, no decimals/spaces.
export function formatInputDigits(value: string, max = 20): string {
  const d = digits(value);
  return d.slice(0, max);
}

// Letters + spaces only (names, area, nationality, relations, etc.).
export function formatInputAlpha(value: string, max = 60): string {
  const clean = (value ?? "").replace(ALPHA_ONLY, "");
  return clean.slice(0, max);
}

// Letters + numbers + spaces (addresses, policy numbers, insurance names).
export function formatInputAlnum(value: string, max = 120): string {
  const clean = (value ?? "").replace(ALNUM_SPACE, "");
  return clean.slice(0, max);
}

// Letters + numbers + typical address chars (street no., /, -, ., #).
export function formatInputAddress(value: string, max = 255): string {
  const clean = (value ?? "").replace(/[^A-Za-z0-9 .,/#-]/g, "");
  return clean.slice(0, max);
}

// Emails and URLs: strip spaces only (type=email/url already constrain).
export function formatInputNoSpaces(value: string, max = 120): string {
  const clean = (value ?? "").replace(/\s+/g, "");
  return clean.slice(0, max);
}

// Experience field: allow digits with an optional "years" suffix.
export function formatInputExperience(value: string): string {
  const clean = (value ?? "").replace(/[^0-9 ]/g, "");
  return clean.slice(0, 12);
}

// Per-country government-ID config outline (frontend only).
export const governmentIdTypes = {
  IN: [
    { code: "AADHAAR", name: "Aadhaar", validation: /^[0-9]{12}$/ },
    { code: "PAN", name: "PAN", validation: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/ },
    { code: "PASSPORT", name: "Passport", validation: /^[A-Z]{2}[0-9]{6}$/ },
  ],
  US: [
    { code: "SSN", name: "Social Security Number", validation: /^[0-9]{9}$/ },
    { code: "PASSPORT", name: "Passport", validation: /^[A-Z0-9]{6,9}$/ },
  ],
} as const;

/**
 * Parse any time representation (ISO date string, HH:mm:ss, HH:mm, or 12h) to total minutes from midnight
 */
export function parseTimeToMinutes(time?: string | null): number | null {
  if (!time) return null;
  const str = String(time).trim();
  if (str.includes("T")) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d.getUTCHours() * 60 + d.getUTCMinutes();
  }
  const isPM = /pm/i.test(str);
  const isAM = /am/i.test(str);
  const cleaned = str.replace(/[^\d:]/g, "");
  const parts = cleaned.split(":").map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
  let hours = parts[0];
  const minutes = parts[1];
  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

/**
 * Format any time representation (ISO date string, "1970-01-01T09:00:00.000Z", "09:00", etc.) to 12-hour format e.g. "09:00 AM"
 */
export function formatTimeSlot(time?: string | null): string {
  const totalMin = parseTimeToMinutes(time);
  if (totalMin == null) return time ? String(time) : "";
  const h24 = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
}

/**
 * Format appointment date safely without UTC timezone shift (e.g. "Tuesday, 24 Nov 2026")
 */
export function formatAppointmentDisplayDate(
  dateStr?: string | null,
  compact: boolean = false
): string {
  if (!dateStr) return "";
  try {
    const raw = String(dateStr).split("T")[0];
    const parts = raw.split("-").map(Number);
    if (
      parts.length === 3 &&
      !isNaN(parts[0]) &&
      !isNaN(parts[1]) &&
      !isNaN(parts[2])
    ) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return d.toLocaleDateString("en-US", {
        weekday: compact ? "short" : "long",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString("en-US", {
          weekday: compact ? "short" : "long",
          year: "numeric",
          month: "short",
          day: "numeric",
        });
  } catch {
    return String(dateStr);
  }
}
