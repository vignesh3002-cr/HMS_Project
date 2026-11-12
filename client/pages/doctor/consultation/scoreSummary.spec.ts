import { describe, expect, it } from "vitest";
import {
  formatScoreNumber,
  previousScoreEntry,
  readScoreHistory,
  readStoredScores,
  scoreDelta,
  scoreDeltaText,
  scoreInterpretation,
  scoreResultText,
  scoreWarnings,
  scoresToCsv,
} from "./scoreSummary";
import type {
  ScoreDefinition,
  ScoreEvaluation,
  VariableValue,
} from "./scoreEngine";

const definition = (overrides: Partial<ScoreDefinition> = {}): ScoreDefinition =>
  ({
    scoreId: "B03",
    name: "NPI",
    method: "formula",
    rawMethod: "Formula",
    showCriteria: false,
    purpose: null,
    whenToRecord: null,
    range: null,
    riskGroups: null,
    status: null,
    reference: null,
    developerNote: null,
    variables: [],
    groups: [],
    ...overrides,
  }) as ScoreDefinition;

const evaluation = (overrides: Partial<ScoreEvaluation> = {}): ScoreEvaluation =>
  ({
    total: 5,
    totalLabel: null,
    group: null,
    groupLabel: "High",
    autoGroup: true,
    groupReason: "Matched range 5-10",
    completed: 2,
    totalVariables: 2,
    missing: [],
    errors: [],
    breakdown: [],
    expression: null,
    status: "complete",
    ...overrides,
  });

const value = (overrides: Partial<VariableValue> = {}): VariableValue => ({
  raw: "3",
  numeric: 3,
  points: null,
  source: "auto",
  ...overrides,
});

describe("readStoredScores", () => {
  it("parses the v2 payload and derives the method label", () => {
    const scores = readStoredScores({
      version: 2,
      scores: [
        {
          scoreId: "B03",
          name: "NPI",
          method: "formula",
          total: 5.4,
          group: "High",
          status: "complete",
          note: "Reviewed",
          summary: "5.4 - High",
          values: {
            v1: value({
              autoSource: "LAB",
              reason: "LDH from lab report",
            }),
          },
        },
      ],
    });

    expect(scores).toHaveLength(1);
    expect(scores[0]).toMatchObject({
      scoreId: "B03",
      name: "NPI",
      methodLabel: "Formula",
      total: 5.4,
      group: "High",
      status: "complete",
      note: "Reviewed",
    });
    expect(scores[0].values.v1).toMatchObject({
      raw: "3",
      source: "auto",
      autoSource: "LAB",
      reason: "LDH from lab report",
    });
  });

  it("falls back to the legacy staging-detail columns", () => {
    const scores = readStoredScores(
      null,
      {
        scoreId: "M01",
        name: "IPI",
        total: 3,
        group: "High-intermediate",
        summary: "3 - High-intermediate",
      }
    );

    expect(scores).toHaveLength(1);
    expect(scores[0]).toMatchObject({
      scoreId: "M01",
      name: "IPI",
      total: 3,
      group: "High-intermediate",
      status: "complete",
      summary: "3 - High-intermediate",
    });
  });

  it("returns nothing when the visit has no scores", () => {
    expect(readStoredScores(null)).toEqual([]);
    expect(readStoredScores({ version: 2, scores: [] })).toEqual([]);
  });
});

describe("readScoreHistory", () => {
  const rows = [
    {
      staging_detail_id: "S1",
      visit_date: "2026-01-01",
      score_variables: {
        version: 2,
        scores: [
          {
            scoreId: "B03",
            name: "NPI",
            total: 4,
            group: "Low",
            status: "complete",
            summary: "4 - Low",
            values: {},
          },
        ],
      },
    },
    {
      staging_detail_id: "S2",
      visit_date: "2026-03-01",
      score_variables: {
        version: 2,
        scores: [
          {
            scoreId: "B03",
            name: "NPI",
            total: 6,
            group: "High",
            status: "complete",
            summary: "6 - High",
            values: {},
          },
        ],
      },
    },
    /* Legacy row: the columns still identify the score. */
    {
      staging_detail_id: "S3",
      visit_date: "2025-12-01",
      score: "M01",
      score_points: 2,
      risk_group: "Low",
      score_result: "2 - Low",
    },
  ];

  it("groups by score id, newest first", () => {
    const history = readScoreHistory(rows);
    expect(history.B03.map((entry) => entry.total)).toEqual([6, 4]);
    expect(history.B03[0].date).toBe("2026-03-01");
  });

  it("uses the legacy columns when the v2 payload is absent", () => {
    const history = readScoreHistory(rows);
    expect(history.M01).toHaveLength(1);
    expect(history.M01[0]).toMatchObject({
      total: 2,
      group: "Low",
      summary: "2 - Low",
    });
  });

  it("excludes the visit being edited from the previous entry", () => {
    const history = readScoreHistory(rows);
    expect(previousScoreEntry(history, "B03", "S2")?.total).toBe(4);
    expect(previousScoreEntry(history, "B03")?.total).toBe(6);
    expect(previousScoreEntry(history, "C99")).toBeNull();
  });
});

describe("formatScoreNumber", () => {
  it("keeps whole numbers intact and trims only fractional zeros", () => {
    expect(formatScoreNumber(10)).toBe("10");
    expect(formatScoreNumber(100)).toBe("100");
    expect(formatScoreNumber(5.5)).toBe("5.5");
    expect(formatScoreNumber(5.5000001)).toBe("5.5");
    expect(formatScoreNumber(0)).toBe("0");
    expect(formatScoreNumber(null)).toBe("");
  });
});

describe("deltas and result text", () => {
  it("rounds the change to two decimals", () => {
    expect(scoreDelta(5.555, 4.444)).toBe(1.11);
    expect(scoreDelta(null, 4)).toBeNull();
  });

  it("formats the change", () => {
    expect(scoreDeltaText(2)).toBe("+2");
    expect(scoreDeltaText(-1)).toBe("-1");
    expect(scoreDeltaText(0)).toBe("no change");
    expect(scoreDeltaText(null)).toBeNull();
  });

  it("joins the total and group without a stray separator", () => {
    expect(scoreResultText(3, null, "High")).toBe("3 - High");
    expect(scoreResultText(null, null, "Low")).toBe("Low");
    expect(scoreResultText(3, null, null)).toBe("3");
  });
});

describe("scoreWarnings", () => {
  it("blocks on an entry error and warns about missing values", () => {
    const warnings = scoreWarnings([
      {
        definition: definition(),
        evaluation: evaluation({
          status: "incomplete",
          total: null,
          groupLabel: null,
          missing: ["Age", "LDH", "Albumin"],
          errors: ["Minimum is 0."],
        }),
      },
    ]);

    expect(warnings).toHaveLength(2);
    expect(warnings[0].severity).toBe("error");
    expect(warnings[1].severity).toBe("warning");
    expect(warnings[1].message).toContain("still needs Age, LDH, Albumin");
  });

  it("ignores a score marked not applicable", () => {
    expect(
      scoreWarnings([
        {
          definition: definition(),
          evaluation: evaluation({
            status: "not_applicable",
            missing: ["Age"],
            errors: ["bad"],
          }),
        },
      ])
    ).toEqual([]);
  });
});

describe("scoreInterpretation", () => {
  it("reads as a single sentence with the matched range", () => {
    expect(scoreInterpretation(definition(), evaluation())).toBe(
      "NPI 5, High (matched range 5-10)."
    );
  });

  it("marks an unscored assessment", () => {
    expect(
      scoreInterpretation(
        definition(),
        evaluation({ total: null, groupLabel: null, groupReason: null })
      )
    ).toBe("NPI: not yet scored.");
  });

  it("marks not applicable", () => {
    expect(
      scoreInterpretation(
        definition(),
        evaluation({ status: "not_applicable" })
      )
    ).toBe("NPI: not applicable for this patient.");
  });
});

describe("scoresToCsv", () => {
  it("writes a header and escapes commas and quotes", () => {
    const history = readScoreHistory([
      {
        staging_detail_id: "S1",
        visit_date: "2026-01-01",
        score_variables: {
          version: 2,
          scores: [
            {
              scoreId: "B03",
              name: 'NPI, "modified"',
              method: "formula",
              total: 4,
              group: "Low",
              status: "complete",
              note: "line 1",
              summary: "4 - Low",
              values: {},
            },
          ],
        },
      },
    ]);
    const csv = scoresToCsv(history);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(
      "Score,Method,Visit date,Total,Risk group,Status,Note"
    );
    expect(lines[1]).toContain('"NPI, ""modified"""');
    expect(lines[1]).toContain("Formula");
    expect(lines[1]).toContain("2026-01-01");
  });
});
