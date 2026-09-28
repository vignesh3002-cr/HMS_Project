import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API, { getActiveBranchId } from "../../../api/axios";
import { getUser } from "../../../utils/token";
import { encounterApi } from "../../../api/encounter.api";
import { UserProfileDropdown } from "../../../components/ui/User_profile_dropdown";
import type { DischargeMedicineRecord, Drug, MeasurementValues } from "./types";
import {
  createChemotherapyPlanForPatient,
  findActiveEncounter,
  toIsoDate,
} from "./helpers";
import { ArrowLeftIcon, BellIcon, DoubleArrowIcon, PhoneIcon } from "./icons";

/* ============================================================
   DISCHARGE MEDICATION COMPONENT
   (combined from client/pages/doctor/discharge.tsx 
    renamed PatientDischargeMedication  DischargeMedication,
    Medication type renamed to DischargeMedicationItem to avoid
    clashing with the Medication interface above, duplicate
    React import and icon definitions removed,
    CheckIcon / DoubleArrowIcon reused from above,
    embedded prop added so it can live in this file)
============================================================ */

type DischargeMedicationItem = {
  id: number;
  drugName: string;
  dosage: string;
  frequency: string;
  instruction: string;
  duration: string;
};

const MailIcon = () => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <rect
      x="3"
      y="5"
      width="18"
      height="14"
      rx="2"
    />
    <path
      d="M3 7l9 6 9-6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DischargeMedication: React.FC<{
  embedded?: boolean;
  patientId?: string;
  appointmentId?: string;
  branchId?: string;
  encounterNo?: string;
  measurements?: MeasurementValues;
  onNext?: () => void;
}> = ({
  embedded = false,
  patientId,
  appointmentId,
  branchId,
  encounterNo,
  measurements,
  onNext,
}) => {
  const resolvedPatientId = patientId || "";
  const navigate = useNavigate();

  const [userAvatarUrl, setUserAvatarUrl] = useState<string>(() => localStorage.getItem("user_photo") || "");
  const [avatarLoading, setAvatarLoading] = useState<boolean>(() => !localStorage.getItem("user_photo"));

  const [medications, setMedications] = useState<DischargeMedicationItem[]>(
    []
  );

  const [activeStep, setActiveStep] = useState(1);
  const [savingMeds, setSavingMeds] = useState(false);
  const [medsError, setMedsError] = useState("");
  const [medsLoading, setMedsLoading] = useState(false);
  const [medsProtocolId, setMedsProtocolId] = useState("");

  /* ============================================================
     LOAD DISCHARGE MEDICINES
     Real take-home rows from
     GET /chemotherapy/regimen-protocols/:protocolId/discharge-medicines.
     The protocol is the one selected in the Treatment Plan step
     (localStorage), falling back to the patient's chemotherapy plan.
     ============================================================ */

  useEffect(() => {
    if (!resolvedPatientId) return;

    let cancelled = false;
    setMedsProtocolId("");

    const mapRecord = (
      item: DischargeMedicineRecord,
      index: number,
    ): DischargeMedicationItem => ({
      id: index,
      drugName:
        item.medicine_master?.medicine_name ||
        item.medicine_master?.generic_name ||
        "",
      dosage:
        item.patient_dose != null && item.patient_dose !== ""
          ? `${item.patient_dose} ${
              item.patient_dose_unit ?? item.medicine_master?.unit ?? ""
            }`.trim()
          : "",
      frequency: item.frequency || "",
      instruction:
        item.administration_detail || item.comment || item.composition || "",
      duration: item.duration || "",
    });

    setMedsLoading(true);
    setMedsError("");

    const resolveProtocolId = async (): Promise<string> => {
      const savedProtocolId = localStorage.getItem(
        `hms_selected_protocol_id_${resolvedPatientId}`
      );
      if (savedProtocolId) return savedProtocolId;

      try {
        const draft = JSON.parse(
          localStorage.getItem(`hms_treatment_plan_${resolvedPatientId}`) ??
            ""
        ) as { protocol?: string } | null;
        if (draft?.protocol) return draft.protocol;
      } catch {
        // Malformed draft - continue with the plan lookup.
      }

      // Prefer the branch-independent latest-plan lookup (returns data:null
      // cleanly instead of a branch-scope 403), then fall back to the
      // scoped /plans listing.
      try {
        const latest = await API.get<{
          success: boolean;
          data: {
            chemotherapy_regimen_protocol?: { protocol_id?: string } | null;
          } | null;
        }>("/chemotherapy/plans/latest-for-patient", {
          params: { patient_id: resolvedPatientId },
        });
        const plan = latest.data.data;
        if (plan?.chemotherapy_regimen_protocol?.protocol_id) {
          return plan.chemotherapy_regimen_protocol.protocol_id;
        }
      } catch (error: any) {
        console.warn(
          "Latest plan fallback failed:",
          error?.response?.data?.message ?? error?.message
        );
      }

      const response = await API.get<{
        success: boolean;
        data: {
          chemotherapy_regimen_protocol?: {
            protocol_id?: string;
          } | null;
        }[];
      }>("/chemotherapy/plans", {
        params: {
          patient_id: resolvedPatientId,
          branchId:
            getActiveBranchId() ?? getUser()?.branch_id ?? undefined,
        },
      });
      const plan = response.data.data?.[0];
      return plan?.chemotherapy_regimen_protocol?.protocol_id ?? "";
    };

    resolveProtocolId()
      .then(async (protocolId) => {
        setMedsProtocolId(protocolId);
        if (!protocolId) return [];

        const response = await API.get<{
          success: boolean;
          data: DischargeMedicineRecord[];
        }>(
          `/chemotherapy/regimen-protocols/${encodeURIComponent(
            protocolId
          )}/discharge-medicines`
        );

        return [...(response.data.data ?? [])].sort(
          (a, b) => (a.drug_sequence ?? 0) - (b.drug_sequence ?? 0)
        );
      })
      .then((records) => {
        if (cancelled) return;
        setMedications(records.map(mapRecord));
      })
      .catch((error: any) => {
        console.error("Failed to load discharge medicines:", error);
        if (cancelled) return;
        setMedications([]);
        setMedsError(
          error?.response?.data?.message ||
            error?.message ||
            "Failed to load discharge medicines."
        );
      })
      .finally(() => {
        if (!cancelled) setMedsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [resolvedPatientId]);

  const resolveEncounterNo = async () => {
    if (encounterNo) return encounterNo;
    if (!patientId) return "";
    const { encounter: found } = await findActiveEncounter(
      patientId,
      appointmentId,
      branchId,
    );
    return found?.encounter_no ?? "";
  };

  const handleNext = async () => {
    if (savingMeds) return;

    const hasMedications = medications.some((item) => item.drugName.trim());
    if (!hasMedications) {
      setMedsError(
        "Please select or enter the important field in the previous form."
      );
      return;
    }

    try {
      setSavingMeds(true);
      setMedsError("");

      const chemoOrderDraftKey = `hms_chemo_order_${resolvedPatientId}`;
      const draft = (() => {
        try {
          const raw = localStorage.getItem(chemoOrderDraftKey);
          return raw
            ? (JSON.parse(raw) as {
                cycleDay?: string;
                startDate?: string;
                drugs?: Drug[];
                premedicationDrugs?: Drug[];
                supportiveDrugs?: Drug[];
              })
            : null;
        } catch (error) {
          console.error("Failed to read chemotherapy order draft:", error);
          return null;
        }
      })();

      const planItems: Array<{
        medicine_id: string;
        drug_role: string;
        drug_sequence: number;
        dosage?: number;
        dosage_unit?: string;
        administration_route?: string;
        remarks?: string;
      }> = [];

      (draft?.drugs ?? []).forEach((drug, index) => {
        if (drug.medicineId) {
          planItems.push({
            medicine_id: drug.medicineId,
            drug_role: "PRIMARY",
            drug_sequence: index + 1,
            ...(drug.dose ? { dosage: Number(drug.dose) || undefined } : {}),
            ...(drug.unit ? { dosage_unit: drug.unit } : {}),
            administration_route: "IV",
          });
        }
      });

      (draft?.premedicationDrugs ?? []).forEach((drug, index) => {
        if (drug.medicineId) {
          planItems.push({
            medicine_id: drug.medicineId,
            drug_role: "PREMEDICATION",
            drug_sequence: 90 + index,
            ...(drug.dose ? { dosage: Number(drug.dose) || undefined } : {}),
            ...(drug.unit ? { dosage_unit: drug.unit } : {}),
            administration_route: "IV",
          });
        }
      });

      (draft?.supportiveDrugs ?? []).forEach((drug, index) => {
        if (drug.medicineId) {
          planItems.push({
            medicine_id: drug.medicineId,
            drug_role: "SUPPORTIVE",
            drug_sequence: 100 + index,
            ...(drug.dose ? { dosage: Number(drug.dose) || undefined } : {}),
            ...(drug.unit ? { dosage_unit: drug.unit } : {}),
            administration_route: "IV",
          });
        }
      });

      const planStartDate =
        toIsoDate(draft?.startDate) ||
        toIsoDate(
          localStorage.getItem(`hms_planned_start_date_${resolvedPatientId}`)
        ) ||
        toIsoDate(new Date().toISOString());

      const { planId, error } = await createChemotherapyPlanForPatient(
        resolvedPatientId,
        planStartDate,
        planItems.length > 0 ? planItems : undefined,
        undefined
      );
      if (error) {
        setMedsError(error);
        return;
      }
      if (planId) {
        localStorage.setItem(
          `hms_planned_start_date_${resolvedPatientId}`,
          planStartDate ?? ""
        );
      }

      const targetEncounterNo = await resolveEncounterNo();

      if (!targetEncounterNo) {
        setMedsError(
          "No active encounter found. Cannot save discharge medications."
        );
        return;
      }

      const medicationLines = medications
        .filter((item) => item.drugName.trim())
        .map(
          (item, index) =>
            `${index + 1}. ${[
              item.drugName,
              item.dosage,
              item.frequency,
              item.instruction,
              item.duration,
            ]
              .filter(Boolean)
              .join(" | ")}`
        );

      const encounterResponse = await encounterApi.getByNumber(
        targetEncounterNo
      );
      const existingAdvice = encounterResponse.data.data?.advice ?? "";
      const cleanedAdvice = existingAdvice
        .replace(/\n*\[Discharge Medication\][\s\S]*$/, "")
        .trimEnd();

      const adviceParts = [cleanedAdvice];
      if (medicationLines.length > 0) {
        adviceParts.push("[Discharge Medication]", ...medicationLines);
      }
      const advice = adviceParts.filter(Boolean).join("\n\n").trim();

      const payload: { advice?: string } = {};
      if (advice) payload.advice = advice;

      await encounterApi.update(targetEncounterNo, payload);

      if (activeStep < 3) {
        setActiveStep((current) => current + 1);
      }

      onNext?.();
    } catch (error: any) {
      console.error("Failed to save discharge medications:", error);
      setMedsError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to save discharge medications. Please try again."
      );
    } finally {
      setSavingMeds(false);
    }
  };

  const handleBack = () => {
    window.history.back();
  };

  const handleViewProfile = () => {
    if (!resolvedPatientId) return;
    navigate("/doctor/patient-details", {
      state: { patientId: resolvedPatientId },
    });
  };

if (embedded) {

  return (
    <div className="w-full">
      {/* MEDICATION CARD */}
      <div className="mb-8 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="w-1/4 px-8 py-5 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                  Drug Name
                </th>

                <th className="w-1/6 px-8 py-5 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                  Dosage
                </th>

                <th className="w-1/6 px-8 py-5 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                  Frequency
                </th>

                <th className="w-1/4 px-8 py-5 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                  Instruction
                </th>

                <th className="w-1/6 px-8 py-5 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                  Duration
                </th>
              </tr>
            </thead>

            <tbody className="text-sm text-gray-500">
              {medsLoading && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-8 py-8 text-center text-sm text-gray-500"
                  >
                    Loading discharge medicines...
                  </td>
                </tr>
              )}

              {!medsLoading && !medsError && medications.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-8 py-8 text-center text-sm text-gray-500"
                  >
                    {medsProtocolId
                      ? "No discharge medicines recorded on this patient's protocol yet."
                      : "No treatment protocol selected yet. Select a protocol in the Treatment Plan step to load its discharge medicines."}
                  </td>
                </tr>
              )}

              {medsError && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-8 py-8 text-center text-sm text-red-500"
                  >
                    {medsError}
                  </td>
                </tr>
              )}

              {medications.map((medication) => (
                <tr
                  key={medication.id}
                  className="border-b border-gray-100 transition-colors hover:bg-gray-50 last:border-gray-200"
                >
                  <td className="px-8 py-6 text-gray-800">
                    {medication.drugName}
                  </td>

                  <td className="px-8 py-6">
                    {medication.dosage}
                  </td>

                  <td className="px-8 py-6">
                    {medication.frequency}
                  </td>

                  <td className="px-8 py-6">
                    {medication.instruction}
                  </td>

                  <td className="px-8 py-6">
                    {medication.duration}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER ACTION */}
      <div className="mb-8 flex w-full flex-col items-end gap-2">
        {medsError && (
          <div className="text-sm font-medium text-red-600">{medsError}</div>
        )}
        <button
          type="button"
          onClick={handleNext}
          disabled={savingMeds}
          className="flex items-center gap-2 rounded-md bg-[#1d4ed8] px-8 py-3 font-bold text-white shadow-sm transition-colors hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <DoubleArrowIcon />
          {savingMeds ? "Saving" : "Next"}
        </button>
      </div>
    </div>
  );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans text-gray-800 antialiased">
      {/* SIDEBAR */}
      <aside className="relative z-20 flex min-h-screen w-80 shrink-0 flex-col border-r border-gray-200 bg-white">
        {/* Profile Summary */}
        <div className="flex flex-col items-center border-b border-gray-200 p-8">
          <div className="relative mb-6 h-32 w-32 overflow-hidden rounded-full ring-4 ring-[#eab308] shadow-sm">
            <img
              src=""
              alt=""
              className="h-full w-full object-cover"
            />
          </div>

          <h2 className="mb-2 text-[22px] font-bold text-gray-900">
            {""}
          </h2>

          <p className="mb-4 text-[15px] text-gray-500">
            {""}
          </p>

          <span className="mb-6 rounded-full bg-gray-100 px-4 py-1.5 text-xs font-semibold text-gray-600">
            {""}
          </span>

          <p className="text-center text-sm font-bold tracking-wide text-blue-700">
            {""}
          </p>
        </div>

        {/* Contact */}
        <div className="space-y-6 border-b border-gray-200 p-8">
          <div className="flex items-start gap-4">
            <PhoneIcon />

            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Phone
              </p>

              <p className="text-[15px] font-medium text-gray-700">
                {""}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <MailIcon />

            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Email
              </p>

              <p className="text-[15px] font-medium text-gray-700">
                {""}
              </p>
            </div>
          </div>
        </div>

        {/* Vitals */}
        <div className="flex-grow space-y-8 p-8">
          <div className="grid grid-cols-2 gap-x-4 gap-y-6">
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Height
              </p>

              <p className="text-[15px] font-bold text-gray-900">
                {measurements.height}
              </p>
            </div>

            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Weight
              </p>

              <p className="text-[15px] font-bold text-gray-900">
                {measurements.weight}
              </p>
            </div>

            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                BSA
              </p>

              <p className="text-[15px] font-bold text-gray-900">
                {measurements.bsa}
              </p>
            </div>

            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                BMI
              </p>

              <p className="text-[15px] font-bold text-gray-900">
                {measurements.bmi}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleViewProfile}
            className="mt-8 w-full rounded-md border border-blue-600 px-4 py-2.5 font-semibold text-blue-600 transition-colors duration-200 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            View Full Profile
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="relative z-10 flex min-w-0 flex-1 flex-col bg-gray-50">
        {/* TOP HEADER */}
        <header className="relative z-20 flex h-20 shrink-0 items-center justify-between bg-white px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleBack}
              aria-label="Back"
              className="-ml-2 rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100"
            >
              <ArrowLeftIcon />
            </button>

            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Patients
            </h1>
          </div>

          <div className="flex items-center gap-6">
            {/* Notification */}
            <button
              type="button"
              aria-label="Notifications"
              className="relative rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100"
            >
              <BellIcon />

              <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-red-500" />
            </button>

            {/* User */}
            <UserProfileDropdown
              userName={getUser()?.username || "Doctor"}
              userSubtext={getUser()?.role || "Doctor"}
              userAvatar={userAvatarUrl || undefined}
              avatarLoading={avatarLoading}
              onLogout={() => { localStorage.clear(); window.location.href = '/login'; }}
              profilePath="/doctor/profile"
              notificationsPath="/doctor/notifications"
            />
          </div>
        </header>

        {/* Background under stepper */}
        <div className="absolute left-0 right-0 top-20 z-0 h-40 border-b border-gray-200 bg-white" />

        {/* CONTENT */}
        <div className="relative z-10 flex-1 overflow-y-auto p-8 pt-0">
          <div className="mx-auto max-w-[1200px]">
            {/* MEDICATION CARD */}
            <div className="mx-auto mb-8 max-w-[1200px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="w-1/4 px-8 py-5 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                        Drug Name
                      </th>

                      <th className="w-1/6 px-8 py-5 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                        Dosage
                      </th>

                      <th className="w-1/6 px-8 py-5 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                        Frequency
                      </th>

                      <th className="w-1/4 px-8 py-5 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                        Instruction
                      </th>

                      <th className="w-1/6 px-8 py-5 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                        Duration
                      </th>
                    </tr>
                  </thead>

                  <tbody className="text-sm text-gray-500">
                    {medsLoading && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-8 py-8 text-center text-sm text-gray-500"
                        >
                          Loading discharge medicines...
                        </td>
                      </tr>
                    )}

                    {!medsLoading && !medsError && medications.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-8 py-8 text-center text-sm text-gray-500"
                        >
                          {medsProtocolId
                            ? "No discharge medicines recorded on this patient's protocol yet."
                            : "No treatment protocol selected yet. Select a protocol in the Treatment Plan step to load its discharge medicines."}
                        </td>
                      </tr>
                    )}

                    {medsError && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-8 py-8 text-center text-sm text-red-500"
                        >
                          {medsError}
                        </td>
                      </tr>
                    )}

                    {medications.map((medication) => (
                      <tr
                        key={medication.id}
                        className="border-b border-gray-100 transition-colors hover:bg-gray-50 last:border-gray-200"
                      >
                        <td className="px-8 py-6 text-gray-800">
                          {medication.drugName}
                        </td>

                        <td className="px-8 py-6">
                          {medication.dosage}
                        </td>

                        <td className="px-8 py-6">
                          {medication.frequency}
                        </td>

                        <td className="px-8 py-6">
                          {medication.instruction}
                        </td>

                        <td className="px-8 py-6">
                          {medication.duration}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* FOOTER ACTION */}
            <div className="mx-auto mb-8 flex max-w-[1200px] justify-end">
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 rounded-md bg-[#1d4ed8] px-8 py-3 font-bold text-white shadow-sm transition-colors hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <DoubleArrowIcon />
                Next
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DischargeMedication;
