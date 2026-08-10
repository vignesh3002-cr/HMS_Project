import api from "./axios";

export interface ExportQuery {
  branchId?: string | null;
  roleType?: string;
  excludeRoleType?: string;
  from?: string;
  to?: string;
}

function triggerDownload(blob: Blob, fallbackName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function downloadExportCsv(path: string, params: ExportQuery = {}) {
  const response = await api.get<Blob>(`/export/${path}`, {
    params,
    responseType: "blob",
  });

  const disposition = response.headers?.["content-disposition"] as
    | string
    | undefined;
  const match = disposition?.match(/filename="?([^";]+)"?/);
  const filename = match?.[1] ?? `${path}.csv`;

  triggerDownload(response.data, filename);
}

export function exportErrorMessage(err: any): string {
  const status = err?.response?.status;
  if (status === 404) {
    return "Export endpoint not found. The backend server needs the latest code deployed.";
  }
  if (status === 401) {
    return "Your session has expired. Please log in again.";
  }
  if (status === 403) {
    return "You don't have permission to export this data.";
  }
  return err?.response?.data?.message || err?.message || "Something went wrong while exporting.";
}
