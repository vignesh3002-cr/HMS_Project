import { useState } from "react";

export function useFilterPanel(initialValues: Record<string, any> = {}) {
  const [draftValues, setDraftValues] = useState<Record<string, any>>(initialValues);
  const [appliedValues, setAppliedValues] = useState<Record<string, any>>(initialValues);
  const [isOpen, setIsOpen] = useState(false);

  const handleChange = (name: string, value: any) => {
    setDraftValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleApply = () => {
    setAppliedValues({ ...draftValues });
    setIsOpen(false);
  };

  const handleClear = () => {
    setDraftValues({});
    setAppliedValues({});
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
