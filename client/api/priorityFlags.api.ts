import API from "./axios";

export const priorityFlagsApi = {
  getFlags(patientIds: string[]) {
    return API.get<{ success: boolean; data: Record<string, boolean> }>(
      "/priority-flags",
      { params: { patientIds: patientIds.join(",") } }
    );
  },
};
