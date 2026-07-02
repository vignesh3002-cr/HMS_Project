export type FieldType =
  | "text"
  | "number"
  | "select"
  | "date"
  | "checkbox"
  | "tel";

export interface SelectOption {
  label: string;
  value: string;
}

export interface FilterField {
  id: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: SelectOption[];
}

export interface FilterPanelProps {
  title: string;
  fields: FilterField[];
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
  onApply: () => void;
  onClear: () => void;
}
