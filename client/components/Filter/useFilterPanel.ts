import { useMemo, useState } from "react";
import type { FilterField } from "./types";

// Default draft/applied values a filter panel starts with and returns to on
// Clear -- taken from any field that declares `defaultValue` (e.g. a Status
// field defaulting to ["Active"] so "Leave"/"Inactive" rows stay hidden
// until the user explicitly selects them in the filter).
function panelDefaults(fields?: FilterField[]): Record<string, any> {
  const defaults: Record<string, any> = {};
  for (const field of fields ?? []) {
    if (field.defaultValue !== undefined) {
      defaults[field.id] = field.defaultValue;
    }
  }
  return defaults;
}

export function useFilterPanel(fields?: FilterField[]) {
  const defaults = useMemo(() => panelDefaults(fields), [fields]);
  const [draftValues, setDraftValues] = useState<Record<string, any>>(defaults);
  const [appliedValues, setAppliedValues] = useState<Record<string, any>>(defaults);
  const [isOpen, setIsOpen] = useState(false);

  const handleChange = (name: string, value: any) => {
    setDraftValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleApply = () => {
    setAppliedValues({ ...draftValues });
    setIsOpen(false);
  };

  const handleClear = () => {
    setDraftValues(defaults);
    setAppliedValues(defaults);
  };

  return {
    values: draftValues,
    appliedValues,
    isOpen,
    setIsOpen,
    handleChange,
    handleApply,
    handleClear,
  };
}
