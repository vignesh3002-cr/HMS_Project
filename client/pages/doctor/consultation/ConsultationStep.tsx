import React, { useEffect, useRef, useState } from "react";
import { appointmentApi } from "../../../api/appointment.api";
import type { PatientRecord } from "../../../api/patient.api";
import { encounterApi, type EncounterRecord } from "../../../api/encounter.api";
import {
  consultationApi,
  type ImmunizationRecord,
  type DrugConsumptionRecord,
  type PersonalHistoryItem,
} from "../../../api/consultation.api";
import type { LabTestMasterRecord } from "../../../api/labTestMaster.api";
import { Calendar } from "../../../components/ui/calendar";
import {
  ClinicalDetailsSection,
  type ClinicalDetailsSectionHandle,
} from "../../../components/hms/ClinicalDetailsSection";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../components/ui/popover";
import { MultiSelectDropdown } from "../../../components/ui/multi-select-dropdown";
import VoiceToText from "@/components/ui/voicetotext";
import AdviceSection, {
  type AdviceSaveResult,
  type AdviceSectionHandle,
} from "./AdviceSection";
import type { ConsultationState } from "./types";
import {
  formatDateDMY,
  formatPickedDate,
  formatTimeAMPM,
  parsePickedDate,
  PAST_HISTORY_MARKER,
} from "./helpers";

/* ============================================================
   CONSULTATION STEP
   The Consultation tab of the patient consultation page: visit
   summary, history, examination, previous reports, investigations
   and Advice. The page keeps this step mounted (hidden on the
   other steps) so unsaved input survives step switches.
   ============================================================ */

/* Treatment types selectable under the Past History section. Picking a
   type reveals the date / brief note / treatment response fields. */
const TREATMENT_TYPES = [
  "Chemotherapy",
  "Radiotherapy",
  "Surgery",
  "Immunotherapy",
  "Targeted Therapy",
  "Hormone Therapy",
  "Bone Marrow Transplant",
  "Other",
];

interface ConsultationStepProps {
  consultationState: ConsultationState | null;
  patient: PatientRecord | null;
  patientName: string;
  patientDisplayId: string;
  encounter: EncounterRecord | null;
  encounterError: string;
  visitDate: string;
  onVisitDateChange: (value: string) => void;
  /* Investigations live in the page: Lab Review orders the selected tests. */
  labTests: LabTestMasterRecord[];
  labTestsLoading: boolean;
  labTestsError: string;
  selectedInvestigations: string[];
  onSelectedInvestigationsChange: React.Dispatch<React.SetStateAction<string[]>>;
  onToast: (message: string) => void;
  /* Called after the consultation is saved by Proceed to Next. */
  onProceed: () => void;
}

const ConsultationStep: React.FC<ConsultationStepProps> = ({
  consultationState,
  patient,
  patientName,
  patientDisplayId,
  encounter,
  encounterError,
  visitDate,
  onVisitDateChange: setVisitDate,
  labTests,
  labTestsLoading,
  labTestsError,
  selectedInvestigations,
  onSelectedInvestigationsChange: setSelectedInvestigations,
  onToast: showToast,
  onProceed,
}) => {
  const adviceSectionRef = useRef<AdviceSectionHandle>(null);

  /* Advice rows are saved together with the consultation. */
  const saveAdvice = (targetEncounter: EncounterRecord) =>
    adviceSectionRef.current?.save(targetEncounter) ??
    Promise.resolve<AdviceSaveResult>("empty");

  const [consultationNotes, setConsultationNotes] = useState("");

  const [historyOfPresentIllness, setHistoryOfPresentIllness] = useState("");

  const [patientHistory, setPatientHistory] = useState("");
  const [pastHistory, setPastHistory] = useState("");
  const [pastHistoryTreatmentType, setPastHistoryTreatmentType] = useState("");
  const [pastHistoryTreatmentDate, setPastHistoryTreatmentDate] = useState("");
  const [pastHistoryTreatmentNote, setPastHistoryTreatmentNote] = useState("");
  const [pastHistoryTreatmentResponse, setPastHistoryTreatmentResponse] =
    useState("");

  const [reportsTest, setReportsTest] = useState("");
  const [reportsTestDate, setReportsTestDate] = useState("");
  const [reportsTestResult, setReportsTestResult] = useState("");
  const [reportsTestImpression, setReportsTestImpression] = useState("");
  const [reportsText, setReportsText] = useState("");

  const [chiefComplaint, setChiefComplaint] = useState("");
  const [reasonOfVisit, setReasonOfVisit] = useState("");

  const [otherInvestigationExpanded, setOtherInvestigationExpanded] =
    useState(false);
  const [otherInvestigationName, setOtherInvestigationName] = useState("");
  const [customInvestigations, setCustomInvestigations] = useState<string[]>(
    []
  );

  const [investigationNotes, setInvestigationNotes] = useState<
    Record<string, string>
  >({});

  const [generalExamIcterus, setGeneralExamIcterus] = useState(false);
  const [generalExamPallor, setGeneralExamPallor] = useState(false);
  const [generalExamClubbing, setGeneralExamClubbing] = useState(false);
  const [generalExamCyanosis, setGeneralExamCyanosis] = useState(false);
  const [generalExamOedema, setGeneralExamOedema] = useState(false);
  const [generalExamLymphadenopathy, setGeneralExamLymphadenopathy] =
    useState(false);

  const [systemicCns, setSystemicCns] = useState("");
  const [systemicCvs, setSystemicCvs] = useState("");
  const [systemicRespiratory, setSystemicRespiratory] = useState("");
  const [systemicPerAbdomen, setSystemicPerAbdomen] = useState("");
  const [systemicClinicalFindings, setSystemicClinicalFindings] = useState("");
  const [allVitalsNormal, setAllVitalsNormal] = useState(false);

  const [immunizationOptions, setImmunizationOptions] = useState<
    ImmunizationRecord[]
  >([]);
  const [drugConsumptionOptions, setDrugConsumptionOptions] = useState<
    DrugConsumptionRecord[]
  >([]);
  const [dietTypeOptions, setDietTypeOptions] = useState<string[]>([]);
  const [selectedImmunizations, setSelectedImmunizations] = useState<string[]>(
    []
  );
  const [selectedDrugConsumptions, setSelectedDrugConsumptions] = useState<
    string[]
  >([]);
  const [immunizationOthers, setImmunizationOthers] = useState("");
  const [drugConsumptionOthers, setDrugConsumptionOthers] = useState("");
  const [dietType, setDietType] = useState("");

  const [proceeding, setProceeding] = useState(false);

  const clinicalDetailsRef = useRef<ClinicalDetailsSectionHandle>(null);

  /* ============================================================
     SYNC HISTORY OF PRESENT ILLNESS FROM ACTIVE ENCOUNTER
     Seed the free-text HOPI box with the encounter's saved
     symptoms when the encounter loads. Only applied on load so
     it never stomps in-progress typing after an update.
   ============================================================ */

  useEffect(() => {
    setHistoryOfPresentIllness(
      encounter?.history_of_present_illness ?? encounter?.symptoms ?? ""
    );
    setChiefComplaint(encounter?.chief_complaint ?? "");
    setPatientHistory(encounter?.chief_complaint ?? "");
    setSystemicCns(encounter?.cns_examination ?? "");
    setSystemicCvs(encounter?.cvs_examination ?? "");
    setSystemicPerAbdomen(encounter?.per_abdomen_examination ?? "");
    setSystemicRespiratory(encounter?.respiratory_examination ?? "");
    setSystemicClinicalFindings(encounter?.clinical_findings ?? "");

    setGeneralExamIcterus(!!encounter?.general_examination_icterus);
    setGeneralExamPallor(!!encounter?.general_examination_pallor);
    setGeneralExamClubbing(!!encounter?.general_examination_clubbing);
    setGeneralExamCyanosis(!!encounter?.general_examination_cyanosis);
    setGeneralExamOedema(!!encounter?.general_examination_oedema);
    setGeneralExamLymphadenopathy(
      !!encounter?.general_examination_lymphadenopathy
    );

    /* Past History treatment + Previous Reports free text. */
    setPastHistoryTreatmentType(encounter?.past_history_treatment_type ?? "");
    setPastHistoryTreatmentDate(
      encounter?.past_history_treatment_date
        ? encounter.past_history_treatment_date.slice(0, 10)
        : ""
    );
    setPastHistoryTreatmentNote(encounter?.past_history_treatment_note ?? "");
    setPastHistoryTreatmentResponse(
      encounter?.past_history_treatment_response ?? ""
    );
    setReportsText(encounter?.previous_reports ?? "");

    /* Consultation Notes and Past History share the encounter's
       clinical_notes column, separated by a [Past History] marker
       (see proceedNext). A saved draft takes precedence over the
       encounter so in-session work is never clobbered. */
    let draftNotes = "";
    let draftPast = "";
    try {
      const draft = JSON.parse(
        localStorage.getItem("hms_consultation_draft") ?? "{}"
      );
      draftNotes = draft.consultationNotes ?? "";
      draftPast = draft.pastHistory ?? "";
    } catch {
      /* Malformed draft - fall back to the encounter. */
    }

    if (draftNotes) {
      setConsultationNotes(draftNotes);
      setPastHistory(draftPast);
      return;
    }

    const rawNotes = encounter?.clinical_notes ?? "";
    const markerIndex = rawNotes.indexOf(PAST_HISTORY_MARKER);
    if (markerIndex === -1) {
      setConsultationNotes(rawNotes);
      setPastHistory("");
    } else {
      setConsultationNotes(rawNotes.slice(0, markerIndex).trim());
      setPastHistory(
        rawNotes.slice(markerIndex + PAST_HISTORY_MARKER.length).trim()
      );
    }
  }, [encounter?.encounter_no]);

  /* ============================================================
     LOAD PERSONAL HISTORY MASTER DATA
     Immunization / drug consumption options + diet types from
     the consultation module, plus any values already saved for
     the active encounter.
   ============================================================ */

  useEffect(() => {
    let cancelled = false;
    consultationApi
      .getImmunizations()
      .then((response) => {
        if (!cancelled) setImmunizationOptions(response.data.data ?? []);
      })
      .catch((error) =>
        console.error("Failed to load immunization options:", error)
      );
    consultationApi
      .getDrugConsumptions()
      .then((response) => {
        if (!cancelled) setDrugConsumptionOptions(response.data.data ?? []);
      })
      .catch((error) =>
        console.error("Failed to load drug consumption options:", error)
      );
    consultationApi
      .getDietTypes()
      .then((response) => {
        if (!cancelled) setDietTypeOptions(response.data.data ?? []);
      })
      .catch((error) => console.error("Failed to load diet types:", error));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const encounterNo = encounter?.encounter_no;
    if (!encounterNo) return;
    let cancelled = false;
    consultationApi
      .getPersonalHistory(encounterNo)
      .then((response) => {
        if (cancelled) return;
        const record = response.data.data;
        if (!record) return;

        const immunizationItems = record.immunization ?? [];
        setSelectedImmunizations(
          immunizationItems
            .filter((item) => !item.others)
            .map((item) => item.name)
        );
        setImmunizationOthers(
          immunizationItems
            .filter((item) => item.others)
            .map((item) => item.others ?? "")
            .join(", ")
        );

        const drugItems = record.drug_consumption ?? [];
        setSelectedDrugConsumptions(
          drugItems.filter((item) => !item.others).map((item) => item.name)
        );
        setDrugConsumptionOthers(
          drugItems
            .filter((item) => item.others)
            .map((item) => item.others ?? "")
            .join(", ")
        );

        setDietType(record.diet_type ?? "");
      })
      .catch((error) =>
        console.error("Failed to load personal history:", error)
      );
    return () => {
      cancelled = true;
    };
  }, [encounter?.encounter_no]);

  const buildPersonalHistoryItems = (
    selectedNames: string[],
    options: ImmunizationRecord[] | DrugConsumptionRecord[],
    others: string
  ): PersonalHistoryItem[] => {
    const items: PersonalHistoryItem[] = selectedNames.map((name) => {
      const match = options.find((option) => option.name === name);
      return { code: match?.code ?? "", name };
    });
    const othersTrimmed = others.trim();
    if (othersTrimmed) {
      items.push({
        code: "OTHERS",
        name: "Others",
        others: othersTrimmed,
      });
    }
    return items;
  };

  const savePersonalHistory = async (encounterNo: string) => {
    await consultationApi.savePersonalHistory(encounterNo, {
      immunization: buildPersonalHistoryItems(
        selectedImmunizations,
        immunizationOptions,
        immunizationOthers
      ),
      drug_consumption: buildPersonalHistoryItems(
        selectedDrugConsumptions,
        drugConsumptionOptions,
        drugConsumptionOthers
      ),
      diet_type: dietType || null,
    });
  };

  const registeredOn = patient
    ? formatDateDMY(patient.user_table?.created_at)
    : "";

  const visitTime = formatTimeAMPM(consultationState?.appointmentTime);

  /* ------------------------------------------------------------
     VISIT TYPE
     Primary source: visit_type passed by the Dashboard via router
     state (appointment_history.Patient_visit_type). If it was not
     supplied (or empty), fall back to the appointment linked to the
     active encounter.
  ------------------------------------------------------------ */

  const [fallbackVisitType, setFallbackVisitType] = useState("");

  useEffect(() => {
    const appointmentId = encounter?.appointment_id;
    if (!appointmentId) return;
    let cancelled = false;
    appointmentApi
      .getOne(appointmentId)
      .then((response) => {
        if (cancelled) return;
        if (!consultationState?.visit_type) {
          setFallbackVisitType(
            response.data?.data?.Patient_visit_type ?? ""
          );
        }
        setReasonOfVisit(response.data?.data?.reason_for_visit ?? "");
      })
      .catch((error) => {
        console.error("Failed to load appointment visit type:", error);
      });
    return () => {
      cancelled = true;
    };
  }, [consultationState?.visit_type, encounter?.appointment_id]);

  const visitType =
    consultationState?.visit_type || fallbackVisitType || "";

  const consultedBy = consultationState?.consultedBy || "";

/* ============================================================
     NOTIFICATIONS - Using global BellNotificationButton
   ============================================================ */

  /* ============================================================
     LOAD DRAFT
  ============================================================ */

  useEffect(() => {
    const saved = localStorage.getItem("hms_consultation_draft");

    if (!saved) return;

    try {
      const data = JSON.parse(saved);

      if (data.consultationNotes) {
        setConsultationNotes(data.consultationNotes);
      }
    } catch (error) {
      console.error("Draft loading failed", error);
    }
  }, []);

  /* ============================================================
     INVESTIGATION
  ============================================================ */

  /* Adds a user-typed custom investigation (Others... or the dropdown's
     "+ Add") as a selectable option. If the typed name matches a real
     lab test it just selects that test; otherwise it registers a custom
     option. */

  const addInvestigationByName = (name: string) => {
    const value = name.trim();
    if (!value) return;
    if (investigations.includes(value)) {
      setSelectedInvestigations((prev) =>
        prev.includes(value) ? prev : [...prev, value]
      );
    } else if (!customInvestigations.includes(value)) {
      setCustomInvestigations((prev) => [...prev, value]);
      setSelectedInvestigations((prev) =>
        prev.includes(value) ? prev : [...prev, value]
      );
    }
  };

  const addOtherInvestigation = () => {
    addInvestigationByName(otherInvestigationName);
    setOtherInvestigationName("");
    setOtherInvestigationExpanded(false);
  };

  /* The dropdown reports the full list of selected test names.
     Unselecting a custom investigation removes both its option and its
     selection (same behaviour as the old checkbox grid). */

  const handleInvestigationsChange = (names: string[]) => {
    setSelectedInvestigations(names);
    setCustomInvestigations((prev) => prev.filter((item) => names.includes(item)));
  };

  /* ============================================================
     PRINT
  ============================================================ */

  const printSummary = () => {
    window.print();
  };

  /* ============================================================
     SAVE DRAFT
  ============================================================ */

  const saveDraft = () => {
    const data = {
      patient: patientName,
      patientId: patientDisplayId,
      consultationNotes,
      pastHistory,
      adviceRows: adviceSectionRef.current?.getDraftRows() ?? [],
      adviceDiscussion: adviceSectionRef.current?.getDraftDiscussion() ?? "",
      investigations: selectedInvestigations,
    };

    localStorage.setItem(
      "hms_consultation_draft",
      JSON.stringify(data)
    );

    showToast("Consultation saved as draft");
  };

  /* ============================================================
     CANCEL
  ============================================================ */

  const cancelConsultation = () => {
    const result = window.confirm(
      "Are you sure you want to cancel this consultation?"
    );

    if (result) {
      showToast("Consultation cancelled");
    }
  };

  /* ============================================================
     NEXT
  ============================================================ */

  /* ============================================================
     CONSULTATION PERSIST (run by Proceed to Next)
     Builds the encounter update payload from the Consultation step
     form and writes it + personal history + reason of visit.
  ============================================================ */

  const buildConsultationSavePayload = () => {
    const payload: {
      clinical_notes?: string;
      symptoms?: string;
      chief_complaint?: string;
      history_of_present_illness?: string;
      cns_examination?: string;
      cvs_examination?: string;
      per_abdomen_examination?: string;
      clinical_findings?: string;
      respiratory_examination?: string;
      general_examination_icterus?: boolean;
      general_examination_pallor?: boolean;
      general_examination_clubbing?: boolean;
      general_examination_cyanosis?: boolean;
      general_examination_oedema?: boolean;
      general_examination_lymphadenopathy?: boolean;
      past_history_treatment_type?: string;
      past_history_treatment_date?: string;
      past_history_treatment_note?: string;
      past_history_treatment_response?: string;
      previous_reports?: string;
    } = {};

    /* Consultation Notes + Past History are combined into the single
       clinical_notes column, separated by the [Past History] marker so
       they can be split back on load. */
    const combinedNotes = [
      consultationNotes.trim(),
      ...(pastHistory.trim()
        ? [`${PAST_HISTORY_MARKER}\n${pastHistory.trim()}`]
        : []),
    ]
      .filter(Boolean)
      .join("\n\n");
    if (combinedNotes) {
      payload.clinical_notes = combinedNotes;
    }
    if (historyOfPresentIllness.trim()) {
      payload.symptoms = historyOfPresentIllness;
      payload.history_of_present_illness = historyOfPresentIllness;
    }
    if (chiefComplaint.trim() || patientHistory.trim()) {
      payload.chief_complaint = chiefComplaint.trim() || patientHistory.trim();
    }
    if (systemicCns.trim()) {
      payload.cns_examination = systemicCns.trim();
    }
    if (systemicCvs.trim()) {
      payload.cvs_examination = systemicCvs.trim();
    }
    if (systemicPerAbdomen.trim()) {
      payload.per_abdomen_examination = systemicPerAbdomen.trim();
    }
    if (systemicRespiratory.trim()) {
      payload.respiratory_examination = systemicRespiratory.trim();
    }
    if (systemicClinicalFindings.trim()) {
      payload.clinical_findings = systemicClinicalFindings.trim();
    }

    /* General Examination (positive findings persisted as booleans). */
    payload.general_examination_icterus = generalExamIcterus;
    payload.general_examination_pallor = generalExamPallor;
    payload.general_examination_clubbing = generalExamClubbing;
    payload.general_examination_cyanosis = generalExamCyanosis;
    payload.general_examination_oedema = generalExamOedema;
    payload.general_examination_lymphadenopathy = generalExamLymphadenopathy;

    /* Past History treatment details (type/date/note/response). */
    if (pastHistoryTreatmentType.trim()) {
      payload.past_history_treatment_type = pastHistoryTreatmentType.trim();
    }
    if (pastHistoryTreatmentDate.trim()) {
      payload.past_history_treatment_date = pastHistoryTreatmentDate.trim();
    }
    if (pastHistoryTreatmentNote.trim()) {
      payload.past_history_treatment_note = pastHistoryTreatmentNote.trim();
    }
    if (pastHistoryTreatmentResponse.trim()) {
      payload.past_history_treatment_response =
        pastHistoryTreatmentResponse.trim();
    }
    if (reportsText.trim()) {
      payload.previous_reports = reportsText.trim();
    }

    return payload;
  };

  const persistConsultation = async (targetEncounter: EncounterRecord) => {
    await encounterApi.update(
      targetEncounter.encounter_no,
      buildConsultationSavePayload()
    );

    try {
      await savePersonalHistory(targetEncounter.encounter_no);
    } catch (personalHistoryError: any) {
      console.error(
        "Failed to save personal history:",
        personalHistoryError?.response?.data?.message ??
          personalHistoryError?.message
      );
    }

    /* Reason of Visit lives on the linked appointment, not the
       encounter, so it must be persisted there separately. */
    if (targetEncounter.appointment_id && reasonOfVisit.trim()) {
      try {
        await appointmentApi.update(targetEncounter.appointment_id, {
          reason_for_visit: reasonOfVisit,
        });
      } catch (appointmentError: any) {
        console.error(
          "Failed to save reason for visit:",
          appointmentError?.response?.data?.message ??
            appointmentError?.message
        );
      }
    }
  };

  /* Persists the "Reports (Previous)" form (test/date/result/impression)
     into encounter_report, upserting the row for the selected test so
     repeated saves never duplicate it. */
  const persistReportsPrevious = async (targetEncounterNo: string) => {
    if (!reportsTest) return;
    try {
      const existingReports = await consultationApi.getReports(
        targetEncounterNo
      );
      const rows = existingReports.data?.data ?? [];
      const existing = rows.find(
        (report) => String(report.lab_test_id) === String(reportsTest)
      );
      const payload = {
        lab_test_id: reportsTest,
        report_completed_date: reportsTestDate || null,
        result: reportsTestResult || null,
        impression: reportsTestImpression || null,
      };
      if (existing) {
        await consultationApi.updateReport(
          existing.encounter_report_id,
          payload
        );
      } else {
        await consultationApi.addReport(targetEncounterNo, payload);
      }
    } catch (error: any) {
      console.error(
        "Failed to save previous reports:",
        error?.response?.data?.message ?? error?.message
      );
    }
  };

  /* ============================================================
     NEXT
     Saves the whole Consultation step, then moves on: the Clinical
     Details section (ECOG, symptoms, allergies, comorbidities), the
     encounter fields + personal history + reason of visit, the
     Reports (Previous) form, and the Advice section (medicines +
     Discussion). Every part is attempted; the step stays open when
     the clinical details or the Advice could not be saved so
     nothing is lost.
  ============================================================ */

  const proceedNext = async () => {
    if (proceeding) return;

    if (!encounter) {
      showToast(
        encounterError ||
          "No active encounter found. Cannot save consultation details."
      );
      return;
    }

    try {
      setProceeding(true);

      const clinicalSaved =
        (await clinicalDetailsRef.current?.handleSave()) ?? true;
      await persistConsultation(encounter);
      await persistReportsPrevious(encounter.encounter_no);
      const adviceResult = await saveAdvice(encounter);

      const failedParts = [
        ...(clinicalSaved ? [] : ["clinical details"]),
        ...(adviceResult === "failed" ? ["Advice"] : []),
      ];
      if (failedParts.length > 0) {
        showToast(
          `Consultation saved, but the ${failedParts.join(
            " and "
          )} could not be saved.`
        );
        return;
      }

      showToast("Consultation saved");

      onProceed();
    } catch (error: any) {
      console.error("Failed to save consultation details:", error);
      showToast(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to save consultation details."
      );
    } finally {
      setProceeding(false);
    }
  };

  /* ============================================================
     INVESTIGATIONS
     Real test names pulled from the lab_test_master table via
     GET /lab-test-master (see client/api/labTestMaster.api.ts)
   ============================================================ */

  const investigations = labTests
    .filter((test) => test.test_status === null || test.test_status === 1)
    .map((test) => test.test_name);

  return (
    <div
        className="relative flex w-full flex-col gap-5"
      >
      {/* =================================================
      CONSULTATION SUMMARY
    ================================================= */}

    <section className="flex w-full flex-col gap-5 rounded-xl border border-slate-200 bg-white p-5">

    <div className="text-lg font-bold leading-7 text-slate-800">
      Consultation Summary
    </div>

    {/* SUMMARY GRID */}

    <div className="grid w-full grid-cols-4 gap-x-4">

      {/* DATE */}

      <div className="flex min-w-0 flex-col gap-1">

        <label className="text-xs font-bold leading-4 text-slate-500">
          Visit Date &amp; Time
        </label>

        <div className="flex w-full gap-2">

          <Popover>
            <PopoverTrigger asChild>
              <div className="relative min-w-0 flex-1 cursor-pointer">

                <input
                  className="h-[38px] w-full rounded-md border border-slate-200 bg-white px-[13px] pl-[33px] text-[9px] leading-5 text-slate-700 outline-none"
                  value={visitDate}
                  readOnly
                />

                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="1.7"
                  className="pointer-events-none absolute left-2 top-2.5 h-4 w-4"
                >
                  <rect
                    x="3"
                    y="4"
                    width="18"
                    height="17"
                    rx="2"
                  />
                  <path d="M16 2v4" />
                  <path d="M8 2v4" />
                  <path d="M3 10h18" />
                </svg>

              </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={parsePickedDate(visitDate)}
                onSelect={(date) => {
                  if (date instanceof Date) {
                    setVisitDate(formatPickedDate(date));
                  }
                }}
              />
            </PopoverContent>
          </Popover>

          <div className="relative min-w-0 flex-1">

            <input
              className="h-[38px] w-full rounded-md border border-slate-200 bg-white px-[13px] pl-[33px] text-[11px] leading-5 text-slate-700 outline-none"
              value={visitTime}
              readOnly
            />

            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="1.7"
              className="pointer-events-none absolute left-2 top-2.5 h-4 w-4"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
              />
              <path d="M12 7v5l3 2" />
            </svg>

          </div>

        </div>

      </div>

      {/* FIRST VISIT */}

      <div className="flex min-w-0 flex-col gap-1">

        <label className="text-xs font-bold leading-4 text-slate-500">
          First Visit for this Treatment
        </label>

        <input
          className="h-[38px] w-full rounded-md border border-slate-200 bg-white px-[13px] text-sm leading-5 text-slate-700 outline-none"
          value={registeredOn}
          readOnly
        />

      </div>

      {/* CONSULTED BY */}

      <div className="flex min-w-0 flex-col gap-1">

        <label className="text-xs font-bold leading-4 text-slate-500">
          Consulted By
        </label>

        <div className="relative h-[38px]">

          <select
            defaultValue={consultedBy}
            className="h-[38px] w-full appearance-none rounded-md border border-slate-200 bg-white px-[13px] pr-10 text-sm leading-5 text-slate-700 outline-none"
          >

            {consultedBy && (
              <option value={consultedBy}>
                {consultedBy}
              </option>
            )}

          </select>

          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.8"
            className="pointer-events-none absolute right-3 top-2.5 h-4 w-4"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>

        </div>

      </div>

      {/* VISIT TYPE */}

      <div className="flex min-w-0 flex-col gap-1">

        <label className="text-xs font-bold leading-4 text-slate-500">
          Visit Type
        </label>

        <div className="relative h-[38px]">
            <input
              className="h-[38px] w-full rounded-md border border-slate-200 bg-white px-[13px] pl-[33px] text-[11px] leading-5 text-slate-700 outline-none"
              value={visitType}
              placeholder="Not recorded"
              readOnly
            />

        </div>

      </div>

    </div>

    {/* LOWER */}

    <div className="grid w-full grid-cols-2 gap-x-6 pt-2">

      {/* NOTES */}

      <div className="flex flex-col gap-2">

        <label className="text-xs font-bold leading-4 text-slate-500">
          Consultation Notes
        </label>

        <VoiceToText
          value={consultationNotes}
          onChange={(text) => setConsultationNotes(text)}
          placeholder="Enter consultation notes..."
        />

        {/* CHIEF COMPLAINT (free text) + REASON OF VISIT.
            Styled like the Symptoms / Allergies sections in
            ClinicalDetailsSection (uppercase tracked label +
            white bordered container). */}

        <div className="flex flex-col gap-2">

          <div className="flex flex-col gap-1">

            <div className="text-[10px] font-bold uppercase leading-[15px] tracking-[0.5px] text-slate-400">
              Chief Complaint
            </div>

            <VoiceToText
              value={chiefComplaint}
              onChange={(text) => setChiefComplaint(text)}
              placeholder="Type the chief complaint..."
            />

          </div>

          <div className="flex flex-col gap-1">

            <div className="text-[10px] font-bold uppercase leading-[15px] tracking-[0.5px] text-slate-400">
              Reason of Visit
            </div>

            <VoiceToText
              value={reasonOfVisit}
              onChange={(text) => setReasonOfVisit(text)}
              placeholder="Type the reason of visit..."
            />

          </div>

          </div>

      </div>

      {/* CLINICAL */}

      <div className="flex flex-col gap-4">

        {/* PERFORMANCE STATUS / SYMPTOMS / ALLERGIES /
            COMORBIDITIES ” backed by the Clinical Details
            API (see components/hms/ClinicalDetailsSection.tsx) */}

        {encounterError && (
          <div className="flex w-full flex-col gap-2 rounded-md border border-red-200 bg-red-50 p-3">
            <div className="text-xs font-medium leading-4 text-red-700">
              {encounterError}
            </div>
          </div>
        )}

        {encounter ? (
          <ClinicalDetailsSection
            ref={clinicalDetailsRef}
            patientId={consultationState?.patientId}
            encounterNo={encounter.encounter_no}
          />
        ) : (
          !encounterError && (
            <div className="flex items-center gap-2 text-xs leading-4 text-slate-500">
              Loading clinical details...
            </div>
          )
        )}

      </div>

    </div>

    </section>

    {/* =================================================
      PERSONAL HISTORY
    ================================================= */}

    <section className="flex w-full flex-col gap-5 rounded-xl border border-slate-200 bg-white p-5">

    <div className="text-lg font-bold leading-7 text-slate-800">
      Personal History
    </div>

    {/* PERSONAL HISTORY GRID */}

    <div className="grid w-full grid-cols-2 gap-x-6 gap-y-4 pt-2">

      {/* IMMUNIZATION */}

      <div className="flex flex-col gap-2">

        <label className="text-xs font-bold leading-4 text-slate-500">
          Immunization
        </label>

        <MultiSelectDropdown
          options={[
            ...immunizationOptions.map((option) => option.name),
            "Others",
          ]}
          value={selectedImmunizations}
          onValueChange={setSelectedImmunizations}
          placeholder="Select immunization(s)"
        />

        {selectedImmunizations.includes("Others") && (
          <input
            type="text"
            value={immunizationOthers}
            onChange={(event) =>
              setImmunizationOthers(event.target.value)
            }
            placeholder="Specify other immunization..."
            className="h-[38px] w-full rounded-md border border-slate-200 bg-white px-[13px] text-sm leading-5 text-slate-700 outline-none focus:border-slate-400"
          />
        )}

      </div>

      {/* DRUG CONSUMPTION */}

      <div className="flex flex-col gap-2">

        <label className="text-xs font-bold leading-4 text-slate-500">
          Drug Consumption
        </label>

        <MultiSelectDropdown
          options={[
            ...drugConsumptionOptions.map((option) => option.name),
            "Others",
          ]}
          value={selectedDrugConsumptions}
          onValueChange={setSelectedDrugConsumptions}
          placeholder="Select drug consumption(s)"
        />

        {selectedDrugConsumptions.includes("Others") && (
          <input
            type="text"
            value={drugConsumptionOthers}
            onChange={(event) =>
              setDrugConsumptionOthers(event.target.value)
            }
            placeholder="Specify other drug consumption..."
            className="h-[38px] w-full rounded-md border border-slate-200 bg-white px-[13px] text-sm leading-5 text-slate-700 outline-none focus:border-slate-400"
          />
        )}

      </div>

      {/* DIET TYPE */}

      <div className="flex flex-col gap-2">

        <label className="text-xs font-bold leading-4 text-slate-500">
          Diet Type
        </label>

        <div className="relative h-[38px]">

          <select
            value={dietType}
            onChange={(event) => setDietType(event.target.value)}
            className="h-[38px] w-full appearance-none rounded-md border border-slate-200 bg-white px-[13px] pr-10 text-sm leading-5 text-slate-700 outline-none"
          >

            <option value="">
             Select 
            </option>

            {dietTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}

          </select>

          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.8"
            className="pointer-events-none absolute right-3 top-2.5 h-4 w-4"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>

        </div>

      </div>

      {/* PATIENT HISTORY (REASON OF VISIT) */}

      <div className="flex flex-col gap-2">

        <label className="text-xs font-bold leading-4 text-slate-500">
          Patient History (Reason of Visit)
        </label>

        <VoiceToText
          value={reasonOfVisit}
          onChange={(text) => setReasonOfVisit(text)}
          placeholder="Type the reason of visit..."
        />

      </div>

    </div>

    </section>

    {/* =================================================
      GENERAL EXAMINATION
    ================================================= */}

    <section className="flex w-full flex-col gap-5 rounded-xl border border-slate-200 bg-white p-5">

    <div className="text-lg font-bold leading-7 text-slate-800">
      General Examination
    </div>

    <div className="grid w-full grid-cols-3 gap-x-6 gap-y-4 pt-2">

      {[
        { label: "Icterus", checked: generalExamIcterus, onChange: setGeneralExamIcterus },
        { label: "Pallor", checked: generalExamPallor, onChange: setGeneralExamPallor },
        { label: "Clubbing", checked: generalExamClubbing, onChange: setGeneralExamClubbing },
        { label: "Cyanosis", checked: generalExamCyanosis, onChange: setGeneralExamCyanosis },
        { label: "Oedema", checked: generalExamOedema, onChange: setGeneralExamOedema },
        { label: "Lymphadenopathy", checked: generalExamLymphadenopathy, onChange: setGeneralExamLymphadenopathy },
      ].map((item) => (
        <label
          key={item.label}
          className="flex items-center gap-3 cursor-pointer select-none"
        >
          <input
            type="checkbox"
            checked={item.checked}
            onChange={(e) => item.onChange(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-slate-700">
            {item.label}
          </span>
        </label>
      ))}

    </div>

    </section>

    {/* =================================================
      SYSTEMIC EXAMINATION
    ================================================= */}

    <section className="flex w-full flex-col gap-5 rounded-xl border border-slate-200 bg-white p-5">

    <div className="text-lg font-bold leading-7 text-slate-800">
      Systemic Examination
    </div>

    <div className="grid w-full grid-cols-1 gap-x-5 gap-y-6 pt-2 sm:grid-cols-2 lg:grid-cols-4">

      {[
        { label: "CNS", value: systemicCns, onChange: setSystemicCns },
        { label: "CVS", value: systemicCvs, onChange: setSystemicCvs },
        { label: "Respiratory", value: systemicRespiratory, onChange: setSystemicRespiratory },
        { label: "Per Abdomen", value: systemicPerAbdomen, onChange: setSystemicPerAbdomen },
      ].map((item) => (
        <div key={item.label} className="flex flex-col gap-2">
          <label className="text-xs font-bold leading-4 text-slate-500">
            {item.label}
          </label>
          <input
            type="text"
            value={item.value}
            onChange={(event) => item.onChange(event.target.value)}
            placeholder={`Type ${item.label.toLowerCase()} findings...`}
    className="block w-full rounded-md border border-gray-300 bg-white py-3 pl-4 pr-10 text-sm text-gray-800 focus:border-[#1d4ed8] focus:outline-none focus:ring-[#1d4ed8]"
          />
        </div>
      ))}

    </div>

    <div className="flex flex-col gap-2 pt-2">
      <label className="text-xs font-bold leading-4 text-slate-500">
        Clinical Findings
      </label>
      <textarea
        value={systemicClinicalFindings}
        onChange={(event) =>
          setSystemicClinicalFindings(event.target.value)
        }
        placeholder="Type clinical findings..."
        className="h-24 w-full resize-none rounded-md border border-gray-300 bg-white py-3 pl-4 pr-4 text-sm text-gray-800 focus:border-[#1d4ed8] focus:outline-none focus:ring-[#1d4ed8]"
      />
    </div>

    <div className="flex items-center gap-4 pt-2">
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={allVitalsNormal}
          onChange={(e) => setAllVitalsNormal(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm font-medium text-slate-700">
          All Vitals Looks Normal?
        </span>
      </label>

      <button
        type="button"
        onClick={() => {
          const normalText = "Normal";
          setSystemicCns(normalText);
          setSystemicCvs(normalText);
          setSystemicRespiratory(normalText);
          setSystemicPerAbdomen(normalText);
          setAllVitalsNormal(true);
        }}
        className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
      >
        Apply Normal To All
      </button>
    </div>

    </section>

    {/* =================================================
      PATIENT DETAILS
    ================================================= */}

    <section className="flex w-full flex-col gap-5 rounded-xl border border-slate-200 bg-white p-5">

    <div className="text-lg font-bold leading-7 text-slate-800">
      Patient Details
    </div>

    {/* PATIENT DETAILS GRID */}

    <div className="grid w-full grid-cols-2 gap-x-6 pt-2">

      {/* LEFT COLUMN: HOPI + REPORTS */}

      <div className="flex w-full flex-col gap-4">

      {/* HISTORY OF PRESENT ILLNESS (HOPI) */}

      <div className="flex flex-col gap-2">

        <label className="text-xs font-bold leading-4 text-slate-500">
          History of Present Illness(HOPI)
        </label>

        <VoiceToText
          value={historyOfPresentIllness}
          onChange={(text) => setHistoryOfPresentIllness(text)}
          placeholder="Type the history of present illness..."
        />

      </div>

      {/* REPORTS (PREVIOUS) */}

      <div className="flex flex-col gap-2">

        <label className="text-xs font-bold leading-4 text-slate-500">
          Reports (Previous)
        </label>

        <div className="flex w-full flex-col gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">

            {/* SELECT TEST */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase leading-[15px] tracking-[0.5px] text-slate-400">
                Select Test
              </label>

              <div className="relative">
                <select
                  value={reportsTest}
                  onChange={(event) =>
                    setReportsTest(event.target.value)
                  }
                  className="h-[38px] w-full appearance-none rounded-md border border-slate-200 bg-white px-[13px] pr-10 text-sm leading-5 text-slate-700 outline-none focus:border-slate-400"
                >
                  <option value="" disabled>
                    Select Test
                  </option>
                  {labTests.map((test) => (
                    <option
                      key={test.lab_test_id}
                      value={test.lab_test_id}
                    >
                      {test.test_name}
                    </option>
                  ))}
                </select>

                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="1.8"
                  className="pointer-events-none absolute right-3 top-2.5 h-4 w-4"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </div>

            {/* DATE / RESULT / IMPRESSION */}
            {reportsTest && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase leading-[15px] tracking-[0.5px] text-slate-400">
                    Date
                  </label>
                  <input
                    type="date"
                    value={reportsTestDate}
                    onChange={(event) =>
                      setReportsTestDate(event.target.value)
                    }
                    className="h-[38px] w-full rounded-md border border-slate-200 bg-white px-[13px] text-sm leading-5 text-slate-700 outline-none focus:border-slate-400"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase leading-[15px] tracking-[0.5px] text-slate-400">
                    Enter Result
                  </label>
                  <textarea
                    value={reportsTestResult}
                    onChange={(event) =>
                      setReportsTestResult(event.target.value)
                    }
                    placeholder="Type the result..."
                    className="h-[60px] w-full resize-none rounded-md border border-slate-200 bg-white p-2 text-sm leading-5 text-slate-700 outline-none focus:border-slate-400"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase leading-[15px] tracking-[0.5px] text-slate-400">
                    Enter Impression
                  </label>
                  <textarea
                    value={reportsTestImpression}
                    onChange={(event) =>
                      setReportsTestImpression(event.target.value)
                    }
                    placeholder="Type the impression..."
                    className="h-[60px] w-full resize-none rounded-md border border-slate-200 bg-white p-2 text-sm leading-5 text-slate-700 outline-none focus:border-slate-400"
                  />
                </div>
              </>
            )}

          </div>

        <VoiceToText
          value={reportsText}
          onChange={(text) => setReportsText(text)}
          placeholder="Type previous reports..."
        />

      </div>

      </div>

      {/* RIGHT COLUMN: PAST HISTORY */}

      <div className="flex w-full flex-col gap-4">

      {/* PAST HISTORY */}

      <div className="flex flex-col gap-2">

        <label className="text-xs font-bold leading-4 text-slate-500">
          Past History
        </label>

        <div className="flex w-full flex-col gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">

            {/* TREATMENT TYPE */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase leading-[15px] tracking-[0.5px] text-slate-400">
                Treatment Type
              </label>

              <div className="relative">
                <select
                  value={pastHistoryTreatmentType}
                  onChange={(event) =>
                    setPastHistoryTreatmentType(
                      event.target.value
                    )
                  }
                  className="h-[38px] w-full appearance-none rounded-md border border-slate-200 bg-white px-[13px] pr-10 text-sm leading-5 text-slate-700 outline-none focus:border-slate-400"
                >
                  <option value="" disabled>
                    Select Treatment
                  </option>
                  {TREATMENT_TYPES.map((treatment) => (
                    <option key={treatment} value={treatment}>
                      {treatment}
                    </option>
                  ))}
                </select>

                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="1.8"
                  className="pointer-events-none absolute right-3 top-2.5 h-4 w-4"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </div>

            {/* DATE / BRIEF NOTE / TREATMENT RESPONSE */}
            {pastHistoryTreatmentType && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase leading-[15px] tracking-[0.5px] text-slate-400">
                    Date
                  </label>
                  <input
                    type="date"
                    value={pastHistoryTreatmentDate}
                    onChange={(event) =>
                      setPastHistoryTreatmentDate(
                        event.target.value
                      )
                    }
                    className="h-[38px] w-full rounded-md border border-slate-200 bg-white px-[13px] text-sm leading-5 text-slate-700 outline-none focus:border-slate-400"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase leading-[15px] tracking-[0.5px] text-slate-400">
                    Enter Brief Note
                  </label>
                  <VoiceToText
                    value={pastHistoryTreatmentNote}
                    onChange={(text) => setPastHistoryTreatmentNote(text)}
                    placeholder="Type a brief note..."
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase leading-[15px] tracking-[0.5px] text-slate-400">
                    Treatment Response
                  </label>
                  <textarea
                    value={pastHistoryTreatmentResponse}
                    onChange={(event) =>
                      setPastHistoryTreatmentResponse(
                        event.target.value
                      )
                    }
                    placeholder="Type the treatment response..."
                    className="h-[60px] w-full resize-none rounded-md border border-slate-200 bg-white p-2 text-sm leading-5 text-slate-700 outline-none focus:border-slate-400"
                  />
                </div>
              </>
            )}

          </div>

        <VoiceToText
          value={pastHistory}
          onChange={(text) => setPastHistory(text)}
          placeholder="Type the patient's past history..."
        />

      </div>

      </div>

    </div>

    </section>

    {/* =================================================
      INVESTIGATIONS
    ================================================= */}

    <section className="flex w-full flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5">

    <div className="text-lg font-bold leading-7 text-slate-800">
      Investigations / Scans
    </div>

    {labTestsLoading && (
      <div className="flex items-center gap-2 text-sm leading-5 text-slate-500">
        Loading investigations...
      </div>
    )}

    {!labTestsLoading && labTestsError && (
      <div className="flex w-full flex-col gap-1 rounded-md border border-red-200 bg-red-50 p-3">
        <div className="text-xs font-medium leading-4 text-red-700">
          {labTestsError}
        </div>
      </div>
    )}

    {!labTestsLoading && !labTestsError &&
      investigations.length === 0 &&
      customInvestigations.length === 0 && (
      <div className="flex items-center gap-2 text-sm leading-5 text-slate-500">
        No lab tests available.
      </div>
    )}

    {!labTestsLoading && !labTestsError &&
      (investigations.length > 0 ||
        customInvestigations.length > 0) && (
    <MultiSelectDropdown
      options={[
        ...investigations.map((name) => ({ value: name, label: name })),
        ...customInvestigations.map((name) => ({
          value: name,
          label: name,
          hint: "Custom",
        })),
      ]}
      value={selectedInvestigations}
      onValueChange={handleInvestigationsChange}
      onCreateOption={addInvestigationByName}
      placeholder="Search and select investigations / scans..."
      className="h-[38px] rounded-md border-slate-200 text-sm shadow-none"
    />
    )}

    {!labTestsLoading && !labTestsError && (
      <div className="flex w-full flex-col gap-1.5">
        <div className="flex w-full flex-wrap items-start gap-1.5">
          {!otherInvestigationExpanded && (
            <button
              type="button"
              onClick={() => setOtherInvestigationExpanded(true)}
              className="flex h-[26px] items-center rounded border border-slate-200 bg-slate-50 px-[9px] py-[3px] text-xs leading-4 text-slate-500 transition hover:bg-slate-100"
            >
              Others...
            </button>
          )}
        </div>

        {otherInvestigationExpanded && (
          <div className="flex w-full items-center gap-2">
            <input
              type="text"
              value={otherInvestigationName}
              onChange={(event) =>
                setOtherInvestigationName(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addOtherInvestigation();
                }
              }}
              placeholder="Enter other investigation"
              className="h-7 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 text-xs leading-4 text-slate-600 outline-none focus:border-slate-400"
            />
            <button
              type="button"
              onClick={addOtherInvestigation}
              disabled={!otherInvestigationName.trim()}
              className="h-7 shrink-0 rounded-md border border-blue-600 bg-white px-3 text-xs font-semibold leading-4 text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setOtherInvestigationName("");
                setOtherInvestigationExpanded(false);
              }}
              className="h-7 shrink-0 rounded-md border border-slate-200 bg-white px-2 text-xs leading-4 text-slate-500 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        )}

      </div>
    )}

    {selectedInvestigations.length > 0 && (
      <div className="flex w-full flex-col gap-4 pt-2">

        {selectedInvestigations.map((investigation) => (

          <div
            key={investigation}
            className="flex flex-col gap-2"
          >

            <label className="text-xs font-bold leading-4 text-slate-500">
              Clinical Notes - {investigation}
            </label>

            <textarea
              value={investigationNotes[investigation] ?? ""}
              onChange={(e) =>
                setInvestigationNotes((prev) => ({
                  ...prev,
                  [investigation]: e.target.value,
                }))
              }
              placeholder={`Enter clinical notes for ${investigation}`}
              className="h-24 w-full resize-none rounded-md border border-slate-200 bg-white p-[13px] text-sm leading-[22.75px] text-slate-600 outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300"
            />

          </div>

        ))}

      </div>
    )}

    <div className="flex w-full flex-col gap-2 pt-2">

      <label className="text-xs font-bold leading-4 text-slate-500">
        Additional Instructions (if any)
      </label>

      <input
        type="text"
        placeholder="Enter any special instructions for the selected investigations"
        className="h-[38px] w-full rounded-md border border-slate-200 bg-slate-50 px-[9px] text-sm text-gray-500 outline-none"
      />

    </div>

    </section>

    {/* =================================================
      ADVICE (OPD PRESCRIPTION)
    ================================================= */}

    <AdviceSection
      ref={adviceSectionRef}
      encounter={encounter}
      patientId={consultationState?.patientId}
      onToast={showToast}
    />

    {/* =================================================
      ACTION BUTTONS
    ================================================= */}

    <div className="flex w-full items-center justify-between">

    {/* PRINT */}

    <div className="h-9 w-[213px]">

      <button
        onClick={printSummary}
        className="flex h-9 w-[213px] items-center justify-center gap-2 rounded-lg border-0 bg-blue-700 px-[25px] py-[9px] text-sm font-bold leading-5 text-white"
      >

        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
        >
          <path d="M6 9V2h12v7" />

          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />

          <rect
            x="6"
            y="14"
            width="12"
            height="8"
          />
        </svg>

        <span>
          Print Summary
        </span>

      </button>

    </div>

    {/* RIGHT ACTIONS */}

    <div className="flex items-start gap-2.5">

      {/* CANCEL */}

      <button
        onClick={cancelConsultation}
        className="flex h-9 w-fit items-center justify-center rounded-lg border border-slate-300 bg-white px-[25px] py-[9px] text-sm font-bold leading-5 text-slate-600"
      >
        Cancel
      </button>

      {/* DRAFT */}

      <button
        onClick={saveDraft}
        className="flex h-9 w-fit items-center justify-center rounded-lg border border-blue-200 bg-white px-[25px] py-[9px] text-sm font-bold leading-5 text-blue-600 "
      >
        Save as Draft
      </button>

      {/* NEXT */}

      <button
        onClick={proceedNext}
        disabled={proceeding}
        className="flex h-9 w-[213px] items-center justify-center gap-2 rounded-lg border-0 bg-blue-700 px-[25px] py-[9px] text-sm font-bold leading-5 text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {proceeding ? (
          "Loading..."
        ) : (
          <>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
            <span>
              Proceed to Next
            </span>
          </>
        )}
      </button>

    </div>

    </div>

    </div>
  );
};

export default ConsultationStep;
