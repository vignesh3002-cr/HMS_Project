interface PriorityFlagProps {
  flagged?: boolean;
}

export function PriorityFlag({ flagged }: PriorityFlagProps) {
  if (!flagged) return null;
  return (
    <span
      className="inline-block h-2 w-2 rounded-full bg-red-500 ml-1.5 shrink-0 align-middle"
      title="Requires attention"
    />
  );
}
