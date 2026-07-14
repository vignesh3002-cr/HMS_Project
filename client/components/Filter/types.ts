// client/components/Filter/types.ts

import { ReactNode } from "react";

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "email"
  | "tel"
  | "search"
  | "date"
  | "datetime-local"
  | "time"
  | "month"
  | "week"
  | "select"
  | "multiselect"
  | "combobox"
  | "checkbox"
  | "radio"
  | "switch"
  | "range"
  | "hidden";

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

export interface FilterField {
  id: string;
  name?: string;
  label: string;
  type: FieldType;

  placeholder?: string;
  value?: any;
  defaultValue?: any;

  options?: SelectOption[];

  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;

  min?: number | string;
  max?: number | string;
  step?: number;

  multiple?: boolean;

  accept?: string;

  rows?: number;
  cols?: number;

  className?: string;
  helperText?: string;
  error?: string;

  icon?: ReactNode;
}

export interface FilterPanelProps {
  title: string;

  fields: FilterField[];

  values: Record<string, any>;

  onChange: (field: string, value: any) => void;

  onApply: () => void;

  onClear: () => void;

  loading?: boolean;

  className?: string;
}