import { describe, expect, it } from "vitest";
import {
  applyDerivedScores,
  autoSourceSummary,
  hasDerivedSource,
  labKeyFor,
  previewAutoFill,
  stageNumberFromText,
  suggestVariableValues,
  type AutoFillContext,
} from "./scoreAutofill";
import {
  parseVariable,
  type ScoreAssessment,
  type ScoreDefinition,
  type VariableValue,
} from "./scoreEngine";
import type { ScoreVariable } from "./types";

const variable = (
  name: string,
  input: Partial<ScoreVariable> & { criterion?: string | null; points?: string | null; source?: string; source_field?: string | null } = {}
): ScoreVariable => ({
  score_variable_id: name,
  score_id: "T01",
  variable_name: name,
  criterion: input.criterion ?? null,
  points: input.points ?? null,
  source: input.source ?? "CLIN",
  auto_filled: true,
  source_field: input.source_field ?? null,
  display_order: 1,
});

const definition = (
  method: string,
  variables: ScoreVariable[],
  scoreId = "T01"
): ScoreDefinition =>
  ({
    scoreId,
    name: "Test",
    method: "points_sum",
    rawMethod: method,
    showCriteria: false,
    purpose: null,
    whenToRecord: null,
    range: null,
    riskGroups: null,
    status: null,
    reference: null,
    developerNote: null,
    variables: variables.map((item) => parseVariable(item, method as any)),
    groups: [],
  }) as ScoreDefinition;

const context = (over: Partial<AutoFillContext> = {}): AutoFillContext => ({
  age: null,
  sex: null,
  heightCm: null,
  weightKg: null,
  bmi: null,
  systolic: null,
  diastolic: null,
  labs: {},
  stageNumber: null,
  stageText: null,
  tStage: null,
  nStage: null,
  mStage: null,
  derivedScores: {},
  ...over,
});

describe("suggestVariableValues", () => {
  it("answers age threshold factors from registration", () => {
    const def = definition("Points sum", [
      variable("Age >60", { criterion: "Yes", points: "1", source: "REG" }),
    ]);

    const older = suggestVariableValues(def, context({ age: 65 }));
    expect(older).toHaveLength(1);
    expect(older[0].raw).toBe("Yes");
    expect(older[0].source).toBe("REG");

    const younger = suggestVariableValues(def, context({ age: 50 }));
    expect(younger[0].raw).toBe("No");
  });

  it("answers male sex from registration", () => {
    const def = definition("Points sum", [
      variable("Male sex", { criterion: "Yes", points: "1", source: "REG" }),
    ]);
    expect(suggestVariableValues(def, context({ sex: "Male" }))[0].raw).toBe("Yes");
    expect(suggestVariableValues(def, context({ sex: "Female" }))[0].raw).toBe("No");
  });

  it("fills a numeric lab value and converts its unit", () => {
    const def = definition("Formula", [
      variable("Albumin (g/L)", { source: "LAB" }),
      variable("Bilirubin (µmol/L)", { source: "LAB" }),
    ]);
    const suggestions = suggestVariableValues(
      def,
      context({
        labs: {
          albumin: {
            value: 4.5,
            unit: "g/dL",
            normalMin: 3.5,
            normalMax: 5,
            date: "2026-11-08",
          },
          bilirubin: {
            value: 1.2,
            unit: "mg/dL",
            normalMin: 0.2,
            normalMax: 1.2,
            date: "2026-11-08",
          },
        },
      })
    );
    const byId = Object.fromEntries(suggestions.map((item) => [item.variableId, item.raw]));
    expect(byId["Albumin (g/L)"]).toBe("45");
    expect(byId["Bilirubin (µmol/L)"]).toBe("20.52");
  });

  it("answers LDH > ULN and computes an LDH ratio", () => {
    const labs = {
      ldh: { value: 300, unit: "U/L", normalMin: 100, normalMax: 250, date: null },
    };
    const flag = definition("Points sum", [
      variable("LDH >ULN", { criterion: "Yes", points: "1", source: "LAB" }),
    ]);
    expect(suggestVariableValues(flag, context({ labs }))[0].raw).toBe("Yes");

    const ratio = definition("Formula", [
      variable("LDH ÷ ULN", { source: "LAB" }),
    ]);
    expect(suggestVariableValues(ratio, context({ labs }))[0].raw).toBe("1.2");
  });

  it("picks the matching age band for a choice variable", () => {
    const def = definition("Points sum", [
      variable("Age", {
        criterion: ">40–60 1; >60–75 2; >75 3",
        points: "0–3",
        source: "REG",
      }),
    ]);
    const suggestions = suggestVariableValues(def, context({ age: 70 }));
    expect(suggestions[0].raw).toBe(">60-75");
  });

  it("answers stage thresholds from the diagnosis", () => {
    const def = definition("Points sum", [
      variable("Ann Arbor stage III–IV", {
        criterion: "Yes",
        points: "1",
        source: "STG",
      }),
    ]);
    expect(
      suggestVariableValues(def, context({ stageNumber: 4, stageText: "IV" }))[0]
        .raw
    ).toBe("Yes");
    expect(
      suggestVariableValues(def, context({ stageNumber: 2, stageText: "II" }))[0]
        .raw
    ).toBe("No");
  });

  it("derives a grade from another score's group", () => {
    const def = definition("Formula", [
      variable("Grade", {
        criterion: "1–3",
        points: "1–3",
        source: "DER",
        source_field: "B01",
      }),
    ]);
    const suggestions = suggestVariableValues(
      def,
      context({
        derivedScores: {
          B01: { total: 6, groupLabel: "Grade 2" },
        },
      })
    );
    expect(suggestions[0].raw).toBe("2");
    expect(suggestions[0].source).toBe("DER");
  });

  it("returns nothing when the data needed is missing", () => {
    const def = definition("Points sum", [
      variable("Spleen (cm)", { source: "CLIN" }),
      variable("LDH >ULN", { criterion: "Yes", points: "1", source: "LAB" }),
    ]);
    expect(suggestVariableValues(def, context())).toEqual([]);
  });

  it("reads the highest stage number from a picked stage label", () => {
    expect(stageNumberFromText("Stage IIIA")).toBe(3);
    expect(stageNumberFromText("IVB")).toBe(4);
    expect(stageNumberFromText("Stage 2A")).toBe(2);
    expect(stageNumberFromText("I")).toBe(1);
    expect(stageNumberFromText("")).toBeNull();
    expect(stageNumberFromText("Not staged")).toBeNull();
  });

  it("maps lab test names onto the auto-fill catalogue keys", () => {
    expect(labKeyFor("Lactate dehydrogenase (LDH)")).toBe("ldh");
    expect(labKeyFor("Beta-2 microglobulin")).toBe("b2m");
    expect(labKeyFor("CA 125")).toBe("ca125");
    expect(labKeyFor("Spleen size")).toBeNull();
  });

  it("answers a female sex factor from registration", () => {
    const def = definition("Points sum", [
      variable("Female sex", { criterion: "Yes", points: "1", source: "REG" }),
    ]);
    expect(suggestVariableValues(def, context({ sex: "Female" }))[0].raw).toBe(
      "Yes"
    );
    expect(suggestVariableValues(def, context({ sex: "Male" }))[0].raw).toBe(
      "No"
    );
  });

  it("converts a lab value into the unit written in a threshold label", () => {
    const def = definition("Points sum", [
      variable("Albumin <4 g/dL", {
        criterion: "Yes",
        points: "1",
        source: "LAB",
      }),
    ]);
    const normal = {
      albumin: {
        value: 40,
        unit: "g/L",
        normalMin: 35,
        normalMax: 50,
        date: null,
      },
    };
    expect(suggestVariableValues(def, context({ labs: normal }))[0].raw).toBe(
      "No"
    );

    const low = { albumin: { ...normal.albumin, value: 32 } };
    expect(suggestVariableValues(def, context({ labs: low }))[0].raw).toBe(
      "Yes"
    );
  });
});

const assessment = (
  def: ScoreDefinition,
  values: Record<string, VariableValue> = {}
): ScoreAssessment => ({
  scoreId: def.scoreId,
  method: def.method,
  values,
  selectedGroup: null,
  note: "",
  status: "incomplete",
  updatedAt: null,
});

describe("applyDerivedScores", () => {
  const npi = definition(
    "Formula",
    [
      variable("Grade", {
        criterion: "1–3",
        points: "1–3",
        source: "DER",
        source_field: "B01",
      }),
    ],
    "B03"
  );
  const b01Context = context({
    derivedScores: {
      B01: { total: 6, groupLabel: "Grade 2", groupRange: "6–7" },
    },
  });

  it("fills the grade as soon as the source score is complete", () => {
    const next = applyDerivedScores([npi], { B03: assessment(npi) }, b01Context);

    expect(next).not.toBeNull();
    expect(next?.B03.values.Grade.raw).toBe("2");
    expect(next?.B03.values.Grade.source).toBe("auto");
    expect(next?.B03.values.Grade.autoSource).toBe("DER");
    expect(next?.B03.values.Grade.reason).toContain("Derived from B01");
  });

  it("is idempotent so the caller's effect cannot loop", () => {
    const first = applyDerivedScores([npi], { B03: assessment(npi) }, b01Context);
    expect(first).not.toBeNull();
    expect(applyDerivedScores([npi], first!, b01Context)).toBeNull();
  });

  it("never overwrites a value the clinician typed", () => {
    const manual = assessment(npi, {
      Grade: { raw: "3", numeric: 3, points: 3, source: "manual" },
    });
    expect(applyDerivedScores([npi], { B03: manual }, b01Context)).toBeNull();
  });

  it("clears a derived value when the source score disappears", () => {
    const auto = assessment(npi, {
      Grade: {
        raw: "2",
        numeric: 2,
        points: 2,
        source: "auto",
        autoSource: "DER",
        reason: "Derived from B01 (Grade 2)",
      },
    });
    const next = applyDerivedScores([npi], { B03: auto }, context());
    expect(next?.B03.values.Grade.raw).toBe("");
    expect(next?.B03.values.Grade.source).toBeNull();
  });

  it("gives IPI-style links the numeric result, not the verbal risk band", () => {
    const cns = definition(
      "Points sum",
      [variable("IPI score", { source: "DER", source_field: "M01" })],
      "M02"
    );
    const next = applyDerivedScores([cns], { M02: assessment(cns) }, context({
      derivedScores: {
        M01: {
          total: 3,
          groupLabel: "High-intermediate",
          groupRange: "3",
        },
      },
    }));
    expect(next?.M02.values["IPI score"].raw).toBe("3");
  });

  it("keeps the short stage band for an ISS link", () => {
    const rIss = definition(
      "Criteria (auto)",
      [variable("ISS", { source: "DER", source_field: "P01" })],
      "P02"
    );
    const next = applyDerivedScores([rIss], { P02: assessment(rIss) }, context({
      derivedScores: {
        P01: {
          total: null,
          groupLabel: "Neither I nor III",
          groupRange: "II",
        },
      },
    }));
    expect(next?.P02.values.ISS.raw).toBe("II");
  });
});

describe("hasDerivedSource", () => {
  const grade = parseVariable(
    variable("Grade", {
      criterion: "1–3",
      points: "1–3",
      source: "DER",
      source_field: "B01",
    }),
    "Formula" as any
  );

  it("is true only when the linked score has a result", () => {
    expect(
      hasDerivedSource(
        grade,
        context({
          derivedScores: { B01: { total: null, groupLabel: "Grade 2" } },
        })
      )
    ).toBe(true);
    expect(
      hasDerivedSource(
        grade,
        context({ derivedScores: { B01: { total: null, groupLabel: null } } })
      )
    ).toBe(false);
    expect(hasDerivedSource(grade, context())).toBe(false);
  });
});

describe("previewAutoFill", () => {
  const def = definition("Points sum", [
    variable("Age >60", { criterion: "Yes", points: "1", source: "REG" }),
    variable("Male sex", { criterion: "Yes", points: "1", source: "REG" }),
  ]);

  const assessment = (
    values: Record<string, VariableValue>
  ): ScoreAssessment => ({
    scoreId: "T01",
    method: "points_sum",
    values,
    selectedGroup: null,
    note: "",
    status: "incomplete",
    updatedAt: null,
  });

  it("marks empty and auto values for replacement but keeps typed ones", () => {
    const preview = previewAutoFill(
      def,
      assessment({
        "Age >60": {
          raw: "No",
          numeric: null,
          points: null,
          source: "manual",
        },
      }),
      context({ age: 65, sex: "Male" })
    );

    expect(preview.filled).toBe(1);
    expect(preview.kept).toBe(1);
    expect(preview.rows.find((row) => row.variableName === "Male sex")).toMatchObject({
      raw: "Yes",
      willReplace: true,
      source: "REG",
    });
    expect(
      preview.rows.find((row) => row.variableName === "Age >60")
    ).toMatchObject({ currentRaw: "No", willReplace: false });
    expect(preview.counts).toEqual({ REG: 1 });
  });

  it("replaces a previous auto value", () => {
    const preview = previewAutoFill(
      def,
      assessment({
        "Age >60": {
          raw: "No",
          numeric: null,
          points: null,
          source: "auto",
        },
      }),
      context({ age: 65 })
    );
    expect(preview.rows[0]).toMatchObject({ willReplace: true, raw: "Yes" });
  });

  it("summarises the sources already in one assessment", () => {
    expect(
      autoSourceSummary({
        a: {
          raw: "65",
          numeric: 65,
          points: null,
          source: "auto",
          autoSource: "REG",
          reason: "Age from registration",
        },
        b: {
          raw: "4.5",
          numeric: 4.5,
          points: null,
          source: "auto",
          autoSource: "LAB",
          reason: "ALBUMIN from lab report",
        },
        c: {
          raw: "3",
          numeric: 3,
          points: null,
          source: "auto",
          autoSource: "LAB",
        },
        d: {
          raw: "typed",
          numeric: null,
          points: null,
          source: "manual",
        },
        e: {
          raw: "",
          numeric: null,
          points: null,
          source: "auto",
          autoSource: "REG",
        },
      })
    ).toEqual([
      { source: "LAB", count: 2 },
      { source: "REG", count: 1 },
    ]);
  });
});
