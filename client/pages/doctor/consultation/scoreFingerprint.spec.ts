import { describe, expect, it } from "vitest";
import {
  scoreFingerprint,
  scoreFingerprintFromStored,
} from "./scoreFingerprint";
import type { ScoreAssessment } from "./scoreEngine";

const assessment = (
  overrides: Partial<ScoreAssessment> = {}
): ScoreAssessment => ({
  scoreId: "B03",
  method: "formula",
  values: {
    v1: { raw: "3", numeric: 3, points: 3, source: "manual" },
    v2: { raw: "2", numeric: 2, points: 2, source: "manual" },
  },
  selectedGroup: null,
  note: "",
  status: "incomplete",
  updatedAt: null,
  ...overrides,
});

describe("scoreFingerprint", () => {
  it("is equal for the same assessment regardless of variable key order", () => {
    const a = scoreFingerprint([
      {
        assessment: assessment({
          values: {
            v1: { raw: "3", numeric: 3, points: 3, source: "manual" },
            v2: { raw: "2", numeric: 2, points: 2, source: "manual" },
          },
        }),
        status: "complete",
      },
    ]);
    const b = scoreFingerprint([
      {
        assessment: assessment({
          values: {
            v2: { raw: "2", numeric: 2, points: 9, source: "manual" },
            v1: { raw: "3", numeric: 3, points: 4, source: "manual" },
          },
        }),
        status: "complete",
      },
    ]);
    expect(a).toBe(b);
  });

  it("changes when a value, group, note or status changes", () => {
    const base = { assessment: assessment(), status: "complete" };
    const fingerprint = scoreFingerprint([base]);
    const changedValue = scoreFingerprint([
      {
        assessment: assessment({
          values: { v1: { raw: "4", numeric: 4, points: 4, source: "manual" } },
        }),
        status: "complete",
      },
    ]);
    const changedGroup = scoreFingerprint([
      { assessment: assessment({ selectedGroup: "High" }), status: "complete" },
    ]);
    const changedNote = scoreFingerprint([
      { assessment: assessment({ note: "seen by MDT" }), status: "complete" },
    ]);
    const changedStatus = scoreFingerprint([
      { assessment: assessment(), status: "incomplete" },
    ]);

    for (const changed of [
      changedValue,
      changedGroup,
      changedNote,
      changedStatus,
    ]) {
      expect(changed).not.toBe(fingerprint);
    }
  });

  it("ignores untouched variables and the derived totals", () => {
    const withBlanks = scoreFingerprint([
      {
        assessment: assessment({
          values: {
            v1: { raw: "3", numeric: 3, points: 3, source: "manual" },
            v2: { raw: "", numeric: null, points: null, source: null },
          },
        }),
        status: "complete",
      },
    ]);
    const clean = scoreFingerprint([
      {
        assessment: assessment({
          values: {
            v1: { raw: "3", numeric: 3, points: 3, source: "manual" },
          },
        }),
        status: "complete",
      },
    ]);
    expect(withBlanks).toBe(clean);
  });

  it("orders multiple scores canonically", () => {
    const first = scoreFingerprint([
      { assessment: assessment({ scoreId: "B03" }), status: "complete" },
      { assessment: assessment({ scoreId: "M01" }), status: "complete" },
    ]);
    const second = scoreFingerprint([
      { assessment: assessment({ scoreId: "M01" }), status: "complete" },
      { assessment: assessment({ scoreId: "B03" }), status: "complete" },
    ]);
    expect(first).toBe(second);
  });

  it("treats no scores as an empty fingerprint", () => {
    expect(scoreFingerprint([])).toBe(scoreFingerprintFromStored(null));
  });
});

describe("scoreFingerprintFromStored", () => {
  it("reads the v2 payload", () => {
    const stored = {
      version: 2,
      scores: [
        {
          scoreId: "B03",
          method: "formula",
          values: { v1: { raw: "3", numeric: 3, points: 3, source: "manual" } },
          selectedGroup: "High",
          note: "note",
          status: "complete",
        },
      ],
    };

    expect(scoreFingerprintFromStored(stored)).toBe(
      scoreFingerprint([
        {
          assessment: assessment({
            values: { v1: { raw: "3", numeric: 3, points: 3, source: "manual" } },
            selectedGroup: "High",
            note: "note",
          }),
          status: "complete",
        },
      ])
    );
  });

  it("returns null for the legacy variable map", () => {
    expect(
      scoreFingerprintFromStored({
        var_1: { selected_criterion: "Yes", selected_points: 1 },
      })
    ).toBeNull();
  });
});
