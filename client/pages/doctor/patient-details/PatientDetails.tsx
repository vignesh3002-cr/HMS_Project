import React from "react";
import { default as PatientDetailsPage } from "../patient-details";

/* OrderSummary.tsx was removed when the portal was split into the tab
   components in this folder. The live page (and its HMSPatientPortal)
   now lives in ../patient-details.tsx, so this module just re-exports it. */
const PatientDetails: React.FC = () => <PatientDetailsPage />;

export default PatientDetails;
