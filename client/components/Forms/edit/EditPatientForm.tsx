import { useParams } from "react-router-dom";
import PatientRegistrationForm from "@/components/Forms/PatientRegistrationForm";

// The edit view reuses the Patient Registration form's structure, layout and
// fields. Username / Password / Confirm Password are excluded — the shared
// form hides its "Account credentials" section in edit mode (same split
// Addemployee.tsx uses between add-only login fields and shared edit fields).
export default function EditPatientForm() {
  const { id } = useParams<{ id: string }>();
  return <PatientRegistrationForm editMode patientId={id} />;
}
