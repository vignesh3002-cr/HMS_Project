export interface AbsenceTypeOption {
  id: "emergency" | "vacation" | "sick";
  label: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface EntitlementItem {
  label: string;
  used: number;
  total: number;
}

export interface LoggedAbsence {
  id: string;
  type: "Vacation" | "Sick Leave" | "Emergency";
  duration: string;
  dateLogged: string;
}
