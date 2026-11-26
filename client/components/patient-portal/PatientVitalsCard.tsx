import React from "react";
import { PatientVitals } from "@/api/patientPortal.api";
import {
  Heart,
  Activity,
  Thermometer,
  Wind,
  Droplets,
  Scale,
  Calendar,
  AlertTriangle,
  FileText,
  User,
} from "lucide-react";

interface PatientVitalsCardProps {
  vitals: PatientVitals;
  compact?: boolean;
}

export const PatientVitalsCard: React.FC<PatientVitalsCardProps> = ({
  vitals,
  compact = false,
}) => {
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-US", {
        weekday: compact ? undefined : "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const bpText =
    vitals.systolic_bp && vitals.diastolic_bp
      ? `${vitals.systolic_bp}/${vitals.diastolic_bp}`
      : vitals.systolic_bp
      ? `${vitals.systolic_bp}`
      : null;

  const computedBmi =
    vitals.bmi ||
    (vitals.weight && vitals.height && Number(vitals.height) > 0
      ? Number(
          (
            Number(vitals.weight) /
            Math.pow(Number(vitals.height) / 100, 2)
          ).toFixed(1)
        )
      : null);

  const getBmiCategory = (bmi?: number | string | null) => {
    const val = Number(bmi);
    if (!val || isNaN(val)) return null;
    if (val < 18.5) return { label: "Underweight", color: "text-amber-700 bg-amber-50" };
    if (val < 25) return { label: "Normal", color: "text-emerald-700 bg-emerald-50" };
    if (val < 30) return { label: "Overweight", color: "text-orange-700 bg-orange-50" };
    return { label: "Obese", color: "text-red-700 bg-red-50" };
  };

  const bmiCat = getBmiCategory(computedBmi);

  const formatTemperature = (temp?: number | string | null) => {
    const t = Number(temp);
    if (!t || isNaN(t)) return "--";
    if (t < 50) {
      // Value is in Celsius
      const f = Math.round(((t * 9) / 5 + 32) * 10) / 10;
      return `${t} °C (${f} °F)`;
    }
    // Value is in Fahrenheit
    const c = Math.round((((t - 32) * 5) / 9) * 10) / 10;
    return `${t} °F (${c} °C)`;
  };

  const vitalsGrid = [
    {
      title: "Blood Pressure",
      value: bpText ? `${bpText} mmHg` : "--",
      icon: <Activity className="h-4 w-4 text-rose-600" />,
      bg: "bg-rose-50/70 border-rose-100",
    },
    {
      title: "Heart Rate",
      value: vitals.pulse ? `${vitals.pulse} bpm` : "--",
      icon: <Heart className="h-4 w-4 text-red-600" />,
      bg: "bg-red-50/70 border-red-100",
    },
    {
      title: "Oxygen (SpO2)",
      value: vitals.oxygen_saturation ? `${vitals.oxygen_saturation}%` : "--",
      icon: <Droplets className="h-4 w-4 text-sky-600" />,
      bg: "bg-sky-50/70 border-sky-100",
    },
    {
      title: "Temperature",
      value: formatTemperature(vitals.temperature),
      icon: <Thermometer className="h-4 w-4 text-amber-600" />,
      bg: "bg-amber-50/70 border-amber-100",
    },
    {
      title: "Respiratory Rate",
      value: vitals.respiratory_rate ? `${vitals.respiratory_rate} /min` : "--",
      icon: <Wind className="h-4 w-4 text-teal-600" />,
      bg: "bg-teal-50/70 border-teal-100",
    },
    {
      title: "BMI",
      value: computedBmi ? `${computedBmi} kg/m²` : "--",
      extra: bmiCat ? bmiCat.label : undefined,
      extraColor: bmiCat?.color,
      icon: <Scale className="h-4 w-4 text-indigo-600" />,
      bg: "bg-indigo-50/70 border-indigo-100",
    },
  ];

  if (compact) {
    return (
      <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs">
              <Activity className="h-4 w-4" />
            </span>
            <div>
              <h4 className="text-xs font-bold text-slate-800">Latest Recorded Vitals</h4>
              <p className="text-[11px] text-slate-500">
                {vitals.visit_date ? formatDate(vitals.visit_date) : "Recent check-up"}
              </p>
            </div>
          </div>
          {vitals.treating_doctor_name && (
            <span className="text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
              {vitals.treating_doctor_name}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {vitalsGrid.slice(0, 6).map((item) => (
            <div
              key={item.title}
              className={`p-2.5 rounded-lg border flex flex-col justify-between ${item.bg}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-500">{item.title}</span>
                {item.icon}
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xs font-bold text-slate-800">{item.value}</span>
                {item.extra && (
                  <span
                    className={`text-[9px] font-bold px-1 py-0.2 rounded ${item.extraColor}`}
                  >
                    {item.extra}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 hover:border-blue-300/80 transition-all shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800">
                Clinical Visit Examination
              </h3>
              {vitals.visit_type && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {vitals.visit_type}
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Doctor:{" "}
              <span className="text-slate-700 font-semibold">
                {vitals.treating_doctor_name || "Consultant Physician"}
              </span>{" "}
              • Date: {formatDate(vitals.visit_date)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          <span>{formatDate(vitals.visit_date)}</span>
        </div>
      </div>

      {/* Vitals Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 my-4">
        {vitalsGrid.map((item) => (
          <div
            key={item.title}
            className={`p-3 rounded-xl border flex flex-col justify-between ${item.bg}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-600">{item.title}</span>
              {item.icon}
            </div>
            <div className="mt-2">
              <div className="text-sm font-bold text-slate-800">{item.value}</div>
              {item.extra && (
                <span
                  className={`inline-block mt-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded ${item.extraColor}`}
                >
                  {item.extra}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Height / Weight */}
      {(vitals.height || vitals.weight) && (
        <div className="flex items-center gap-4 text-xs text-slate-500 px-1 mb-3">
          {vitals.height && (
            <span>
              Height: <strong className="text-slate-700">{vitals.height} cm</strong>
            </span>
          )}
          {vitals.weight && (
            <span>
              Weight: <strong className="text-slate-700">{vitals.weight} kg</strong>
            </span>
          )}
          {vitals.blood_sugar && (
            <span>
              Blood Sugar: <strong className="text-slate-700">{vitals.blood_sugar} mg/dL</strong>
            </span>
          )}
        </div>
      )}

      {/* Allergies / Clinical Notes */}
      {(vitals.allergy_history || vitals.chronic_disease || vitals.clinical_notes) && (
        <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
          {vitals.allergy_history && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 text-red-800 border border-red-100">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Allergy Alert: </span>
                <span>{vitals.allergy_history}</span>
              </div>
            </div>
          )}

          {vitals.chronic_disease && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-100">
              <FileText className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Chronic Conditions: </span>
                <span>{vitals.chronic_disease}</span>
              </div>
            </div>
          )}

          {vitals.clinical_notes && (
            <div className="p-2.5 rounded-lg bg-slate-50 text-slate-700 border border-slate-100">
              <span className="font-bold text-slate-800">Doctor's Consultation Notes: </span>
              <span>{vitals.clinical_notes}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
