import React from "react";
import { useNavigate } from "react-router-dom";
import { BranchFilterProvider } from "../../../context/BranchFilterContext";
import { HMSPatientPortal } from "./OrderSummary";

const PatientDetails: React.FC = () => {
  const navigate = useNavigate();
  return (
    <BranchFilterProvider>
      <HMSPatientPortal onBack={() => navigate(-1)} />
    </BranchFilterProvider>
  );
};

export default PatientDetails;
