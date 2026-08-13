import API from "./axios";

// Shape returned by GET /qualification-master (see
// hms-backend qualification-master.service.ts, which queries
// prisma.qualification_master.findMany()).
export interface Qualification {
  qualification_id: string;
  qualification_name: string;
  designation: string;
  is_active: boolean;
}

export const qualificationApi = {
  getAll: () =>
    API.get<{ success: boolean; data: Qualification[] }>("/qualification-master"),
  // POST /qualification-master exists on the backend (qualification-master.routes.ts)
  // with { qualification_name, designation, is_active? }.
  create: (data: { qualification_name: string; designation: string }) =>
    API.post<{ success: boolean; data: Qualification }>(
      "/qualification-master",
      data
    ),
};
