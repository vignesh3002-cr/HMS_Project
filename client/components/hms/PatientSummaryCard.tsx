import { Droplet, VenusAndMars, Cake, User, MapPin, Calendar } from "lucide-react";
import type { PatientSummaryCardProps } from "@/types/patient";
import { val } from "@/utils/patient";

export function PatientSummaryCard({
  patient,
  patientName,
  patientDOB,
  patientAge,
  isActive,
  lastVisitDate,
}: PatientSummaryCardProps) {
  return (
    <section
      className="bg-white border border-[#edf0f4] rounded-[10px] p-[21px] mb-4"
      aria-labelledby="summary-heading"
    >
      <h2 id="summary-heading" className="text-lg font-semibold text-[#172033] mb-4 sr-only">
        Patient Summary
      </h2>
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-24 h-24 rounded-lg overflow-hidden shrink-0 bg-gray-200 flex items-center justify-center">
          {patient.patient_photo_url ? (
            <img
              src={patient.patient_photo_url}
              alt={`Photo of ${patientName}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-1/2 h-1/2 text-gray-400" strokeWidth={1.5} />
          )}
        </div>
        <div className="flex-1 grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-600 rounded-lg shrink-0">
              <User className="w-4 h-4" strokeWidth={2} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#222938]">Name</p>
              <p className="text-[#6d7480] text-xs leading-[18px] font-medium">{patientName}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
              <MapPin className="w-4 h-4" strokeWidth={2} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#222938]">Patient ID</p>
              <p className="text-[#6d7480] text-xs leading-[18px] font-medium">{val(patient.patient_id)}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 flex items-center justify-center bg-purple-50 text-purple-600 rounded-lg shrink-0">
              <Cake className="w-4 h-4" strokeWidth={2} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#222938]">DOB</p>
              <p className="text-[#6d7480] text-xs leading-[18px]">{patientDOB}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 flex items-center justify-center bg-amber-50 text-amber-600 rounded-lg shrink-0">
              <Calendar className="w-4 h-4" strokeWidth={2} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#222938]">Age</p>
              <p className="text-[#6d7480] text-xs leading-[18px]">{patientAge} yrs</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-600 rounded-lg shrink-0">
              <VenusAndMars className="w-4 h-4" strokeWidth={2} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#222938]">Gender</p>
              <p className="text-[#6d7480] text-xs leading-[18px]">{val(patient.patient_gender)}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-600 rounded-lg shrink-0">
              <Droplet className="w-4 h-4" strokeWidth={2} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#222938]">Blood Group</p>
              <p className="text-[#6d7480] text-xs leading-[18px]">{val(patient.patient_blood_group)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 pt-4 border-t border-[#edf0f4]">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
            isActive
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-600"
          }`}
          role="status"
          aria-live="polite"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
          {isActive ? "Active" : "Inactive"}
        </span>
        {lastVisitDate && (
          <span className="text-xs text-[#6d7480]">
            <Calendar className="w-3 h-3 inline-block mr-1" strokeWidth={2} />
            Last visit: {lastVisitDate}
          </span>
        )}
        {patient.branch?.branch_name && (
          <span className="text-xs text-[#6d7480]">
            <MapPin className="w-3 h-3 inline-block mr-1" strokeWidth={2} />
            {val(patient.branch.branch_name)}
          </span>
        )}
      </div>
    </section>
  );
}