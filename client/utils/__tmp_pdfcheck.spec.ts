import { describe, expect, it } from "vitest";
import {
  buildLabReportPdfDataUri,
  generateLabReportPdf,
  isProbablyValidPdf,
  splitReportFile,
  base64ToBytes,
  resolveStandardParameterUnit,
  resolveStandardParameterRefRange,
} from "./labReportPdf";

const decode = (dataUri: string) => {
  const split = splitReportFile(dataUri);
  expect(split.kind).toBe("base64");
  if (split.kind !== "base64") throw new Error("not base64");
  return base64ToBytes(split.base64);
};

describe("merged pdf module", () => {
  it("builds a valid document from stored-shaped rows", async () => {
    const uri = await buildLabReportPdfDataUri({
      reportNumber: "RPT-1",
      testName: "CBC",
      patientName: "Priya",
      parameters: [{ name: "Hemoglobin", value: "13.2", unit: "g/dL", referenceRange: "12-15", status: "Normal" }],
    });
    expect(isProbablyValidPdf(decode(uri))).toBe(true);
  });

  it("builds a valid document from generator-shaped rows", async () => {
    const uri = await buildLabReportPdfDataUri({
      reportNumber: "RPT-2",
      testName: "CBC",
      patientName: "Priya",
      parameters: [{ parameter: "Hemoglobin", result: "13.2", unit: "g/dL", referenceRange: "12-15", status: "Normal" }],
    });
    expect(isProbablyValidPdf(decode(uri))).toBe(true);
  });

  it("builds the accredited report", () => {
    const { pdfBase64 } = generateLabReportPdf({
      reportId: "RPT-3",
      patientName: "Priya",
      patientId: "PID1",
      testPanel: "CBC",
      parameters: [],
    });
    expect(isProbablyValidPdf(decode(pdfBase64))).toBe(true);
  });

  it("keeps unit/reference resolution", () => {
    expect(resolveStandardParameterUnit("Hemoglobin")).toBe("g/dL");
    expect(resolveStandardParameterRefRange("Hemoglobin", "Female | 30 Years")).toContain("12");
  });
});
