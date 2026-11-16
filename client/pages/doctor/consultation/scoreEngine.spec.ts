import { describe, expect, it } from "vitest";
import {
  buildScoreDefinition,
  evaluateScore,
  extractNumber,
  findGroup,
  groupLabel,
  hydrateAssessment,
  matchGroup,
  normalizeClinicalText,
  parseCriterionOptions,
  parseRange,
  parseVariable,
  rangeIncludes,
  resolveVariableValue,
  emptyAssessment,
  type ScoreAssessment,
  type ScoreDefinition,
} from "./scoreEngine";
import type {
  ScoreCatalogueDetail,
  ScoreGroup,
  ScoreVariable,
} from "./types";

const variable = (input: Partial<ScoreVariable> & { variable_name: string }): ScoreVariable => ({
  score_variable_id: input.score_variable_id ?? input.variable_name,
  score_id: input.score_id ?? "T01",
  variable_name: input.variable_name,
  criterion: input.criterion ?? null,
  points: input.points ?? null,
  source: input.source ?? "CLIN",
  auto_filled: input.auto_filled ?? false,
  source_field: input.source_field ?? null,
  display_order: input.display_order ?? 1,
});

const group = (
  group_range: string,
  meaning: string | null,
  sort_order: number
): ScoreGroup => ({
  score_group_id: `${group_range}-${sort_order}`,
  score_id: "T01",
  group_range,
  meaning,
  sort_order,
});

const detail = (method: string): ScoreCatalogueDetail => ({
  score_id: "T01",
  score_name: "Test score",
  cancer_type_id: "CT002",
  applies_to: "Breast",
  purpose: "Prognostic",
  when_to_record: "Diagnosis",
  method,
  range: null,
  risk_groups: null,
  status: "Current",
  reference: null,
  developer_note: null,
  variables: 0,
  auto_filled: 0,
  auto_fill_percent: null,
  variables_list: [],
  groups: [],
});

const definition = (
  method: string,
  variables: ScoreVariable[],
  groups: ScoreGroup[] = []
): ScoreDefinition =>
  buildScoreDefinition({
    scoreId: "T01",
    name: "Test score",
    detail: detail(method),
    variables,
    groups,
  });

const assessment = (
  def: ScoreDefinition,
  values: Record<string, string>,
  selectedGroup: string | null = null
): ScoreAssessment => {
  const base = emptyAssessment(def);
  for (const [key, raw] of Object.entries(values)) {
    base.values[key] = resolveVariableValue(
      def.variables.find((item) => item.id === key)!,
      raw,
      "manual"
    );
  }
  return { ...base, selectedGroup };
};

describe("normalizeClinicalText", () => {
  it("normalises unicode dashes, comparisons and arrows", () => {
    expect(normalizeClinicalText("≥4 → 3; 1–3 → 2")).toBe(">=4 -> 3; 1-3 -> 2");
    expect(normalizeClinicalText("≤ −2.60")).toBe("<= -2.60");
    expect(normalizeClinicalText("0 × 2")).toBe("0 x 2");
  });
});

describe("parseCriterionOptions", () => {
  it("parses arrow options", () => {
    expect(parseCriterionOptions("0 → 1; 1–3 → 2; ≥4 → 3")).toEqual([
      { label: "0", points: 1 },
      { label: "1-3", points: 2 },
      { label: ">=4", points: 3 },
    ]);
  });

  it("parses label + trailing points", () => {
    expect(parseCriterionOptions("<2 mg/dL 1; 2–3 2; >3 3")).toEqual([
      { label: "<2 mg/dL", points: 1 },
      { label: "2-3", points: 2 },
      { label: ">3", points: 3 },
    ]);
    expect(parseCriterionOptions("None 1; grade 1–2 2; grade 3–4 3")).toEqual([
      { label: "None", points: 1 },
      { label: "grade 1-2", points: 2 },
      { label: "grade 3-4", points: 3 },
    ]);
  });

  it("returns no options for a bare range or prose", () => {
    expect(parseCriterionOptions("1–3")).toEqual([]);
    expect(parseCriterionOptions("From IHC")).toEqual([]);
    expect(parseCriterionOptions("Pre 1; post 3")).toEqual([
      { label: "Pre", points: 1 },
      { label: "post", points: 3 },
    ]);
  });
});

describe("parseRange", () => {
  it("parses inclusive and exclusive bands", () => {
    expect(parseRange("3–5")).toEqual({
      min: 3,
      max: 5,
      minInclusive: true,
      maxInclusive: true,
    });
    expect(parseRange("5.7–<6.2")).toEqual({
      min: 5.7,
      max: 6.2,
      minInclusive: true,
      maxInclusive: false,
    });
  });

  it("parses comparisons, including negatives and labels", () => {
    expect(rangeIncludes(parseRange("≤ −2.60")!, -3)).toBe(true);
    expect(rangeIncludes(parseRange("≤ −2.60")!, -2.5)).toBe(false);
    expect(rangeIncludes(parseRange("> −2.60 to ≤ −1.39")!, -2)).toBe(true);
    expect(rangeIncludes(parseRange("> −2.60 to ≤ −1.39")!, -1)).toBe(false);
    expect(rangeIncludes(parseRange("CPS ≥10")!, 12)).toBe(true);
    expect(rangeIncludes(parseRange("<1%")!, 0.5)).toBe(true);
  });

  it("returns null for categorical labels", () => {
    expect(parseRange("Luminal A-like")).toBeNull();
    expect(parseRange("Grade 1")).toBeNull();
    expect(parseRange("Very low")).toBeNull();
  });
});

describe("points sum", () => {
  it("marks each variable and adds the points (Nottingham grade)", () => {
    const def = definition(
      "Points sum",
      [
        variable({ variable_name: "Tubule formation", criterion: "1–3", points: "1–3" }),
        variable({ variable_name: "Nuclear pleomorphism", criterion: "1–3", points: "1–3" }),
        variable({ variable_name: "Mitotic count", criterion: "1–3", points: "1–3" }),
      ],
      [group("3–5", "Grade 1", 1), group("6–7", "Grade 2", 2), group("8–9", "Grade 3", 3)]
    );

    const score = assessment(def, {
      "Tubule formation": "2",
      "Nuclear pleomorphism": "3",
      "Mitotic count": "1",
    });
    const result = evaluateScore(def, score);

    expect(result.total).toBe(6);
    expect(result.groupLabel).toBe("Grade 2");
    expect(result.status).toBe("complete");
  });

  it("uses option points for a criterion list", () => {
    const def = definition(
      "Points sum",
      [
        variable({
          variable_name: "Nodes",
          criterion: "0 → 1; 1–3 → 2; ≥4 → 3",
          points: "1–3",
          source: "STG",
        }),
      ],
      [group("0–1", "Low", 1), group("2", "Intermediate", 2), group("3", "High", 3)]
    );

    const score = assessment(def, { Nodes: "1-3" });
    const result = evaluateScore(def, score);
    expect(result.total).toBe(2);
    expect(result.groupLabel).toBe("Intermediate");
  });

  it("counts Yes / No once with the declared single point", () => {
    const def = definition(
      "Points sum",
      [
        variable({ variable_name: "Age > 60", criterion: "Yes", points: "1" }),
        variable({ variable_name: "LDH > ULN", criterion: "Yes", points: "2" }),
      ],
      [group("0–1", "Low", 1), group("≥2", "High", 2)]
    );

    const score = assessment(def, { "Age > 60": "Yes", "LDH > ULN": "Yes" });
    const result = evaluateScore(def, score);
    expect(result.total).toBe(3);
    expect(result.groupLabel).toBe("High");
  });
});

describe("formulas", () => {
  it("computes NPI from size, grade and node score", () => {
    const def = buildScoreDefinition({
      scoreId: "B03",
      name: "NPI",
      detail: detail("Formula"),
      variables: [
        variable({ variable_name: "Tumour size (cm)", criterion: "× 0.2", points: "0.2 × size", source: "PATH" }),
        variable({ variable_name: "Grade", criterion: "1–3", points: "1–3", source: "DER" }),
        variable({ variable_name: "Nodes", criterion: "0 → 1; 1–3 → 2; ≥4 → 3", points: "1–3", source: "STG" }),
      ],
      groups: [group("≤3.4", "Good", 1), group("3.41–5.4", "Moderate", 2), group(">5.4", "Poor", 3)],
    });

    const score = assessment(def, {
      "Tumour size (cm)": "3.5",
      Grade: "2",
      Nodes: "1-3",
    });
    const result = evaluateScore(def, score);

    expect(result.total).toBe(4.7);
    expect(result.groupLabel).toBe("Moderate");
    expect(result.expression).toContain("0.2 × 3.5");
  });

  it("computes ALBI and matches negative bands", () => {
    const def = buildScoreDefinition({
      scoreId: "C07",
      name: "ALBI",
      detail: detail("Formula"),
      variables: [
        variable({ variable_name: "Bilirubin (µmol/L)", criterion: "log10(bilirubin) × 0.66", source: "LAB" }),
        variable({ variable_name: "Albumin (g/L)", criterion: "albumin × −0.085", source: "LAB" }),
      ],
      groups: [
        group("≤ −2.60", "Grade 1", 1),
        group("> −2.60 to ≤ −1.39", "Grade 2", 2),
        group("> −1.39", "Grade 3", 3),
      ],
    });

    const grade1 = evaluateScore(
      def,
      assessment(def, { "Bilirubin (µmol/L)": "10", "Albumin (g/L)": "45" })
    );
    expect(grade1.total).toBe(-3.17);
    expect(grade1.groupLabel).toBe("Grade 1");

    const grade2 = evaluateScore(
      def,
      assessment(def, { "Bilirubin (µmol/L)": "30", "Albumin (g/L)": "30" })
    );
    expect(grade2.groupLabel).toBe("Grade 2");
  });

  it("computes EUTOS and MIPI", () => {
    const eutos = buildScoreDefinition({
      scoreId: "Q08",
      name: "EUTOS",
      detail: detail("Formula"),
      variables: [
        variable({ variable_name: "Basophils %", criterion: "× 7", source: "LAB" }),
        variable({ variable_name: "Spleen (cm)", criterion: "× 4" }),
      ],
      groups: [group("≤87", "Low", 1), group(">87", "High", 2)],
    });
    const eutosResult = evaluateScore(
      eutos,
      assessment(eutos, { "Basophils %": "5", "Spleen (cm)": "10" })
    );
    expect(eutosResult.total).toBe(75);
    expect(eutosResult.groupLabel).toBe("Low");

    const mipi = buildScoreDefinition({
      scoreId: "M11",
      name: "MIPI",
      detail: detail("Formula"),
      variables: [
        variable({ variable_name: "Age (years)", criterion: "× 0.03535", source: "REG" }),
        variable({ variable_name: "ECOG >1", criterion: "+ 0.6978" }),
        variable({ variable_name: "LDH ÷ ULN", criterion: "1.367 × log10", source: "LAB" }),
        variable({ variable_name: "WBC (10⁹/L)", criterion: "0.9393 × log10(WBC × 1000)", source: "LAB" }),
      ],
      groups: [group("<5.7", "Low", 1), group("5.7–<6.2", "Intermediate", 2), group("≥6.2", "High", 3)],
    });
    const mipiResult = evaluateScore(
      mipi,
      assessment(mipi, {
        "Age (years)": "60",
        "ECOG >1": "2",
        "LDH ÷ ULN": "2",
        "WBC (10⁹/L)": "10",
      })
    );
    expect(mipiResult.total).toBe(6.99);
    expect(mipiResult.groupLabel).toBe("High");
  });

  it("reports the missing formula inputs instead of guessing", () => {
    const def = buildScoreDefinition({
      scoreId: "Q08",
      name: "EUTOS",
      detail: detail("Formula"),
      variables: [
        variable({ variable_name: "Basophils %", criterion: "× 7" }),
        variable({ variable_name: "Spleen (cm)", criterion: "× 4" }),
      ],
      groups: [group("≤87", "Low", 1), group(">87", "High", 2)],
    });
    const result = evaluateScore(def, assessment(def, { "Basophils %": "7" }));
    expect(result.total).toBeNull();
    expect(result.missing).toContain("Spleen (cm)");
  });
});

describe("criteria and direct selection", () => {
  it("auto-bands a single numeric criterion value (PD-L1 TPS)", () => {
    const def = definition(
      "Criteria (auto)",
      [variable({ variable_name: "PD-L1 TPS", source: "IHC" })],
      [group("<1%", "Negative", 1), group("1–49%", "Low", 2), group("≥50%", "High", 3)]
    );
    const result = evaluateScore(def, assessment(def, { "PD-L1 TPS": "60" }));
    expect(result.total).toBe(60);
    expect(result.groupLabel).toBe("High");
  });

  it("uses the clinician-selected group for direct select", () => {
    const groups = [group("Low", null, 1), group("Intermediate", null, 2), group("High", null, 3)];
    const def = definition("Direct select", [], groups);
    const result = evaluateScore(def, assessment(def, {}, "High"));
    expect(result.groupLabel).toBe("High");
    expect(result.status).toBe("complete");
  });

  it("counts checklist features and picks the first band when any is present", () => {
    const def = definition(
      "Criteria checklist",
      [
        variable({ variable_name: "pT4", criterion: "Yes" }),
        variable({ variable_name: "LVSI", criterion: "Yes" }),
      ],
      [group("Any feature present (and pMMR)", "High-risk stage II", 1), group("None, or dMMR", "Standard-risk stage II", 2)]
    );
    const result = evaluateScore(def, assessment(def, { pT4: "Yes", LVSI: "No" }));
    expect(result.total).toBe(1);
    expect(result.groupLabel).toBe("High-risk stage II");
  });
});

describe("assessment persistence", () => {
  it("round-trips a v2 assessment", () => {
    const def = definition(
      "Points sum",
      [variable({ variable_name: "A", criterion: "Yes", points: "1" })],
      [group("0", "Low", 1), group("1", "High", 2)]
    );
    const original = assessment(def, { A: "Yes" });
    const restored = hydrateAssessment(
      { scoreId: def.scoreId, values: original.values, selectedGroup: null },
      def
    );
    expect(restored.values.A.raw).toBe("Yes");
    const result = evaluateScore(def, restored);
    expect(result.groupLabel).toBe("High");
  });

  it("hydrates the legacy per-variable map", () => {
    const def = definition(
      "Points sum",
      [variable({ variable_name: "A", criterion: "Yes", points: "1", score_variable_id: "SCVR-T01-001" })],
      [group("0", "Low", 1), group("1", "High", 2)]
    );
    const restored = hydrateAssessment(
      { "SCVR-T01-001": { selected_criterion: "Yes", selected_points: 1, source_value: "Yes" } },
      def
    );
    expect(restored.values["SCVR-T01-001"].raw).toBe("Yes");
    expect(evaluateScore(def, restored).total).toBe(1);
  });
});

describe("helpers", () => {
  it("extracts the first number from clinical text", () => {
    expect(extractNumber("5.5 mg/L")).toBe(5.5);
    expect(extractNumber("−3")).toBe(-3);
    expect(extractNumber("positive")).toBeNull();
  });

  it("matches a group and labels it", () => {
    const groups = [group("<3", "Low", 1), group("3–20", "Intermediate", 2), group(">20", "High", 3)];
    const matched = matchGroup(groups, 20);
    expect(groupLabel(matched)).toBe("Intermediate");
    expect(findGroup(groups, "High")?.group_range).toBe(">20");
  });
});
