import { Droplet, Mail, MapPin, Phone, Users as UsersIcon } from "lucide-react";

interface PatientPreviewProps {
  firstName: string;
  lastName: string;
  gender: string;
  dob: string;
  primaryMobile: string;
  email: string;
  currentCity: string;
  bloodGroup: string;
  patientType: string;
  emergencyName: string;
  emergencyMobile: string;
  photoDataUrl?: string;
}

function PreviewRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#F2F4F6] text-gray-500 shrink-0">
        <Icon className="w-3.5 h-3.5" />
      </span>
      {value ? (
        <span className="text-sm text-gray-700 truncate">{value}</span>
      ) : (
        <span className="text-sm text-gray-300">{label}</span>
      )}
    </div>
  );
}

export default function PatientPreview({
  firstName,
  lastName,
  gender,
  dob,
  primaryMobile,
  email,
  currentCity,
  bloodGroup,
  patientType,
  emergencyName,
  emergencyMobile,
  photoDataUrl,
}: PatientPreviewProps) {
  const fullName = `${firstName} ${lastName}`.trim();
  const initials =
    ((firstName[0] ?? "") + (lastName[0] ?? "")).toUpperCase() || "?";

  return (
    <div className="w-full lg:sticky lg:top-6 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-6">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">
        Preview
      </p>

      <div className="flex flex-col items-center text-center mb-6">
        {photoDataUrl ? (
          <img
            src={photoDataUrl}
            alt={fullName || "Patient"}
            className="w-20 h-20 rounded-full object-cover border border-gray-200"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-[#D6E3FF] text-[#00488D] flex items-center justify-center text-xl font-bold">
            {initials}
          </div>
        )}
        <h3 className="mt-3 text-base font-bold text-gray-900">
          {fullName || "New Patient"}
        </h3>
        {(gender || dob) && (
          <p className="text-xs text-gray-500">
            {[gender, dob].filter(Boolean).join(" • ")}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <PreviewRow icon={Phone} label="Mobile number" value={primaryMobile} />
        <PreviewRow icon={Mail} label="Email address" value={email} />
        <PreviewRow icon={MapPin} label="Current city" value={currentCity} />
        <PreviewRow icon={Droplet} label="Blood group" value={bloodGroup} />
        <PreviewRow icon={UsersIcon} label="Patient type" value={patientType} />
      </div>

      {(emergencyName || emergencyMobile) && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
            Emergency contact
          </p>
          <p className="text-sm font-semibold text-gray-900">
            {emergencyName || "—"}
          </p>
          <p className="text-xs text-gray-500">{emergencyMobile || "—"}</p>
        </div>
      )}
    </div>
  );
}
