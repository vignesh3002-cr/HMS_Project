export interface RequiredField<K extends PropertyKey = string> {
  key: K;
  label: string;
}

type MissingToast = (props: {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}) => void;

export function findMissingRequired<K extends PropertyKey>(
  fields: RequiredField<K>[],
  data: Record<K, unknown>,
): RequiredField<K> | undefined {
  return fields.find((f) => {
    const value = data[f.key];
    return Array.isArray(value) ? value.length === 0 : !String(value ?? "").trim();
  });
}

export function validateRequiredFields<K extends PropertyKey>(
  fields: RequiredField<K>[],
  data: Record<K, unknown>,
  toast: MissingToast,
): boolean {
  const missing = findMissingRequired(fields, data);
  if (missing) {
    toast({
      title: "Missing required field",
      description: `Please fill in "${missing.label}".`,
      variant: "destructive",
    });
    return false;
  }
  return true;
}