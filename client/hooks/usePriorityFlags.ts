import { useState, useEffect, useCallback } from "react";
import { priorityFlagsApi } from "@/api/priorityFlags.api";

export function usePriorityFlags(patientIds: string[]) {
  const [flags, setFlags] = useState<Record<string, boolean>>({});

  const key = [...patientIds].sort().join(",");

  const fetchFlags = useCallback(async () => {
    if (patientIds.length === 0) {
      setFlags({});
      return;
    }
    try {
      const res = await priorityFlagsApi.getFlags(patientIds);
      if (res.data.success) {
        setFlags(res.data.data);
      }
    } catch {
      // silent — no red dots shown on failure
    }
  }, [key]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const isFlagged = useCallback(
    (patientId: string) => !!flags[patientId],
    [flags]
  );

  return { flags, isFlagged, refetch: fetchFlags };
}
