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

  // Optional second line shown under `label` in combobox dropdown rows
  // (e.g. an employee's ID under their name) -- rendered smaller/muted.
  // Ignored by field types that don't render a two-line item.
  sublabel?: string;
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

  // When set, filterDataByValues matches this field's value against ANY of
  // these data keys instead of just `id` -- e.g. a single "Name" field with
  // matchKeys: ["name", "id"] lets one search box match either an employee's
  // name or their ID, without the generic per-key filter utility needing to
  // know about that field's meaning.
  matchKeys?: string[];

  // Multiselect only: render a single-line trigger (fixed height, no
  // wrapping chips) showing a short summary ("All" / one label / "N
  // selected") instead of every selected option as a chip. Opt-in and
  // purely cosmetic -- selection/toggle behavior is unchanged either way.
  // Defaults to false, so every existing multiselect field on every page
  // renders exactly as before.
  compact?: boolean;
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