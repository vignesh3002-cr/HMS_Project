import { describe, expect, it } from "vitest";
import {
  base64ToBytes,
  isProbablyValidPdf,
  splitReportFile,
} from "./labReportPdf";

const encode = (text: string) => {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const validPdf = `%PDF-1.3\n${"0".repeat(200)}\nstartxref\n9\n%%EOF`;

describe("splitReportFile", () => {
  it("reads the data URI form saved by the report screens", () => {
    const value = `data:application/pdf;filename=generated.pdf;base64,${encode(validPdf)}`;
    const split = splitReportFile(value);
    expect(split.kind).toBe("base64");
    if (split.kind === "base64") {
      expect(base64ToBytes(split.base64)).toHaveLength(validPdf.length);
    }
  });

  it("reads plain data URIs and raw base64", () => {
    expect(splitReportFile(`data:application/pdf;base64,${encode(validPdf)}`).kind).toBe(
      "base64"
    );
    expect(splitReportFile(encode(validPdf)).kind).toBe("base64");
  });

  it("passes http(s) URLs through", () => {
    expect(splitReportFile("https://example.com/report.pdf")).toEqual({
      kind: "url",
      url: "https://example.com/report.pdf",
    });
  });

  it("rejects empty and non-PDF values", () => {
    expect(splitReportFile(null).kind).toBe("error");
    expect(splitReportFile("data:text/plain;base64,SGVsbG8=").kind).toBe("error");
    expect(splitReportFile("not a pdf").kind).toBe("error");
  });
});

describe("isProbablyValidPdf", () => {
  it("accepts a complete PDF", () => {
    expect(isProbablyValidPdf(base64ToBytes(encode(validPdf)))).toBe(true);
  });

  it("rejects the truncated stored row", () => {
    const truncated = encode("%PDF-1.3\n1 0 obj\n<< /Type /Catalog >>\nendobj");
    expect(isProbablyValidPdf(base64ToBytes(truncated))).toBe(false);
  });

  it("rejects non-PDF bytes", () => {
    expect(isProbablyValidPdf(base64ToBytes(encode("hello world".repeat(20))))).toBe(
      false
    );
  });
});
