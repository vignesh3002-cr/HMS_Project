import { describe, it, expect } from "vitest";
import {
  allocateQuantity,
  applySavedSlip,
  buildBrandOptions,
  buildDraftRowsFromSaved,
  buildSlipSourceRows,
  cloneDraftRow,
  computeRemovedRowKeys,
  createDraftRow,
  effectiveBaseQuantity,
  effectiveExtraQuantity,
  formatFrequencyDuration,
  formatSlipDuration,
  parseDoseText,
  pickDefaultStrength,
  savedSlipHasRowKeys,
  slipFrequencyDuration,
  suggestionFor,
  toDisplayRows,
  toSlipOrderItems,
  type SlipDraftRow,
  type SlipSourceRow,
  type StrengthOption,
} from "./pharmacySlip";
import type { PharmacyMasterItem, PharmacySlipItem } from "../../../api/pharmacy.api";

const strength = (value: number, unit = "mg", pharmacyItemId = `PHM-${value}`): StrengthOption => ({
  label: `${value} ${unit}`,
  value,
  unit,
  pharmacyItemId,
});

const masterRow = (
  overrides: Partial<PharmacyMasterItem>
): PharmacyMasterItem => ({
  pharmacy_item_id: "PHM-1",
  medicine_id: "MED-1",
  generic_name: "Trastuzumab",
  generic_id: "GEN-1",
  item_name: "Trastuzumab 120 mg",
  brand_name: "Herceptin",
  manufacturer_name: "Roche",
  dosage_form: "Injection",
  strength_text: "120 mg",
  strength_value: 120,
  strength_unit: "mg",
  ...overrides,
});

describe("allocateQuantity", () => {
  it("TC1: the selected dose equals the patient dose -> quantity 1", () => {
    const plan = allocateQuantity({
      patientDose: 150,
      patientDoseUnit: "mg",
      selectedDose: 150,
      selectedUnit: "mg",
      strengths: [strength(150)],
    });

    expect(plan.baseQuantity).toBe(1);
    expect(plan.extra).toBeNull();
  });

  it("TC2: 120 selected for 150 with a 30 available adds a 30 row of 1", () => {
    const plan = allocateQuantity({
      patientDose: 150,
      patientDoseUnit: "mg",
      selectedDose: 120,
      selectedUnit: "mg",
      strengths: [strength(30), strength(20), strength(120)],
    });

    expect(plan.baseQuantity).toBe(1);
    expect(plan.extra?.strength.value).toBe(30);
    expect(plan.extra?.quantity).toBe(1);
  });

  it("TC3: without a 30, the smallest overshoot is 20 x 2", () => {
    const plan = allocateQuantity({
      patientDose: 150,
      patientDoseUnit: "mg",
      selectedDose: 120,
      selectedUnit: "mg",
      strengths: [strength(120), strength(20)],
    });

    expect(plan.baseQuantity).toBe(1);
    expect(plan.extra?.strength.value).toBe(20);
    expect(plan.extra?.quantity).toBe(2);
  });

  it("TC4: when only the selected strength exists it folds into it (120 x 2)", () => {
    const plan = allocateQuantity({
      patientDose: 150,
      patientDoseUnit: "mg",
      selectedDose: 120,
      selectedUnit: "mg",
      strengths: [strength(120)],
    });

    expect(plan.baseQuantity).toBe(2);
    expect(plan.extra).toBeNull();
  });

  it("TC5: exact multiple (patient dose 100 mg, selected strength 50 mg, brand also offers 10 mg) -> 50 x 2, no top-up", () => {
    const plan = allocateQuantity({
      patientDose: 100,
      patientDoseUnit: "mg",
      selectedDose: 50,
      selectedUnit: "mg",
      strengths: [strength(50), strength(10)],
    });

    expect(plan.baseQuantity).toBe(2);
    expect(plan.extra).toBeNull();
  });

  it("TC6: larger exact multiple (patient dose 200 mg, selected strength 50 mg) -> 50 x 4, no top-up", () => {
    const plan = allocateQuantity({
      patientDose: 200,
      patientDoseUnit: "mg",
      selectedDose: 50,
      selectedUnit: "mg",
      strengths: [strength(50), strength(10)],
    });

    expect(plan.baseQuantity).toBe(4);
    expect(plan.extra).toBeNull();
  });

  it("TC7: unit-converted exact multiple (patient dose 0.2 g, selected strength 100 mg) -> 100 mg x 2", () => {
    const plan = allocateQuantity({
      patientDose: 0.2,
      patientDoseUnit: "g",
      selectedDose: 100,
      selectedUnit: "mg",
      strengths: [strength(100)],
    });

    expect(plan.baseQuantity).toBe(2);
    expect(plan.extra).toBeNull();
  });

  it("TC8: non-exact multiple keeps top-up behavior (patient dose 150 mg, selected strength 120 mg)", () => {
    const plan = allocateQuantity({
      patientDose: 150,
      patientDoseUnit: "mg",
      selectedDose: 120,
      selectedUnit: "mg",
      strengths: [strength(120), strength(30), strength(20)],
    });

    expect(plan.baseQuantity).toBe(1);
    expect(plan.extra?.strength.value).toBe(30);
    expect(plan.extra?.quantity).toBe(1);
  });

  it("converts units before comparing (0.15 g patient dose vs 150 mg strength)", () => {
    const plan = allocateQuantity({
      patientDose: 0.15,
      patientDoseUnit: "g",
      selectedDose: 150,
      selectedUnit: "mg",
      strengths: [strength(150)],
    });

    expect(plan.baseQuantity).toBe(1);
    expect(plan.extra).toBeNull();
  });

  it("warns and leaves the quantity manual when units are not comparable", () => {
    const plan = allocateQuantity({
      patientDose: 150,
      patientDoseUnit: "mg",
      selectedDose: 1,
      selectedUnit: "vial",
      strengths: [strength(1, "vial")],
    });

    expect(plan.baseQuantity).toBeNull();
    expect(plan.warning).toMatch(/cannot be compared/i);
  });

  it("leaves the quantity blank when the patient dose is missing", () => {
    const plan = allocateQuantity({
      patientDose: null,
      patientDoseUnit: "mg",
      selectedDose: 120,
      selectedUnit: "mg",
      strengths: [strength(120)],
    });

    expect(plan.baseQuantity).toBeNull();
    expect(plan.warning).toMatch(/patient dose is missing/i);
  });
});

describe("parseDoseText", () => {
  it("splits a dose and its unit", () => {
    expect(parseDoseText("150 mg")).toEqual({ value: 150, unit: "mg" });
    expect(parseDoseText("500mg")).toEqual({ value: 500, unit: "mg" });
    expect(parseDoseText("1 tab 500 mg")).toEqual({ value: 1, unit: "tab 500 mg" });
  });
});

describe("buildBrandOptions", () => {
  it("matches brands on generic_id + dosage_form and keeps each strength once", () => {
    const options = buildBrandOptions(
      { medicineId: "MED-1", genericId: "GEN-1", drugForm: "Injection" },
      [
        masterRow({ pharmacy_item_id: "PHM-1" }),
        masterRow({ pharmacy_item_id: "PHM-2", brand_name: "Herceptin", strength_value: 120, strength_text: "120 mg" }),
        masterRow({ pharmacy_item_id: "PHM-3", brand_name: "Herceptin", strength_value: 440, strength_text: "440 mg" }),
        masterRow({ pharmacy_item_id: "PHM-4", brand_name: "Herclon", strength_value: 440, strength_text: "440 mg" }),
        masterRow({ pharmacy_item_id: "PHM-5", brand_name: "Other form", dosage_form: "Tablet" }),
      ]
    );

    expect(options.map((option) => option.label)).toEqual(["Herceptin", "Herclon"]);
    expect(options[0].strengths.map((entry) => entry.value)).toEqual([120, 440]);
    expect(options[0].strengths[1].pharmacyItemId).toBe("PHM-3");
  });

  it("falls back to the generic when the form wording differs", () => {
    const options = buildBrandOptions(
      { medicineId: "MED-1", genericId: "GEN-1", drugForm: "Inj" },
      [masterRow({ dosage_form: "Injection" })]
    );

    expect(options).toHaveLength(1);
    expect(options[0].strengths).toHaveLength(1);
  });

  it("lists another brand of the same generic even though its medicine_id differs", () => {
    const options = buildBrandOptions(
      { medicineId: "MED-1", genericId: "GEN-1", drugForm: "Injection" },
      [
        masterRow({ pharmacy_item_id: "PHM-1", medicine_id: "MED-1" }),
        masterRow({
          pharmacy_item_id: "PHM-9",
          medicine_id: "MED-9",
          brand_name: "Herclon",
          strength_value: 440,
          strength_text: "440 mg",
        }),
      ]
    );

    expect(options.map((option) => option.label)).toEqual(["Herceptin", "Herclon"]);
  });

  it("returns nothing for a typed drug with no generic", () => {
    expect(
      buildBrandOptions(
        { medicineId: "", genericId: "", drugForm: "Tab" },
        [masterRow({})]
      )
    ).toEqual([]);
  });
});

describe("pickDefaultStrength", () => {
  const strengths = [strength(20), strength(30), strength(120)];

  it("prefers an exact strength match", () => {
    expect(pickDefaultStrength(120, "mg", strengths)?.value).toBe(120);
  });

  it("otherwise takes the largest strength that does not exceed the dose", () => {
    expect(pickDefaultStrength(150, "mg", strengths)?.value).toBe(120);
  });

  it("falls back to the first strength when none is comparable", () => {
    expect(pickDefaultStrength(150, "mg", [strength(1, "vial")])?.value).toBe(1);
  });
});

const draft = (overrides: Partial<SlipDraftRow> = {}): SlipDraftRow => {
  const base = createDraftRow(
    {
      key: "PRIMARY:1",
      medicineId: "MED-1",
      genericId: "GEN-1",
      drugName: "Trastuzumab",
      drugForm: "Injection",
      patientDose: "150 mg",
      patientDoseValue: 150,
      patientDoseUnit: "mg",
      role: "PRIMARY",
      route: "IV",
      frequency: "",
      duration: "",
      instructions: "",
    },
    [
      {
        label: "Herceptin",
        strengths: [strength(120), strength(30), strength(20)],
      },
    ]
  );

  return { ...base, selectedDose: "120", selectedUnit: "mg", ...overrides };
};

describe("suggestionFor / overrides", () => {
  it("suggests the top-up row from the selected brand's strengths", () => {
    const row = draft();
    const plan = suggestionFor(row);

    expect(plan.baseQuantity).toBe(1);
    expect(plan.extra?.strength.value).toBe(30);
    expect(plan.extra?.quantity).toBe(1);
  });

  it("applies a manual base override and a manual top-up override", () => {
    const row = draft({ quantityOverride: "3", extraQuantityOverride: "4" });
    const plan = suggestionFor(row);

    expect(effectiveBaseQuantity(row, plan)).toBe(3);
    expect(effectiveExtraQuantity(row, plan)).toBe(4);
  });

  it("renders one display row per strength line with continuous numbering", () => {
    const rows = [
      draft(),
      draft({
        key: "DISCHARGE:1",
        role: "DISCHARGE",
        drugName: "Paracetamol",
        drugForm: "Tablet",
        patientDose: "500 mg",
        patientDoseValue: 500,
        patientDoseUnit: "mg",
        selectedDose: "500",
        brandOptions: [{ label: "Dolo", strengths: [strength(500)] }],
        brand: "Dolo",
        strengthLabel: "500 mg",
      }),
    ];

    const display = toDisplayRows(rows);

    expect(display.map((row) => row.no)).toEqual([1, 2, 3]);
    expect(display.map((row) => row.type)).toEqual([
      "Chemotherapy",
      "Chemotherapy",
      "Discharge",
    ]);
    expect(display[1].isExtra).toBe(true);
    expect(display[2].isExtra).toBe(false);
  });
});

describe("toSlipOrderItems / applySavedSlip", () => {
  it("writes the base line and the top-up line consecutively", () => {
    const items = toSlipOrderItems([draft()]);

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      medicine_id: "MED-1",
      brand_name: "Herceptin",
      dose: "120",
      dose_unit: "mg",
      quantity: 1,
      drug_role: "PRIMARY",
      patient_dose: "150 mg",
      dosage_form: "Injection",
    });
    expect(items[1]).toMatchObject({
      dose: "30",
      quantity: 1,
    });
  });

  it("folds a single-strength brand into one line", () => {
    const row = draft({
      brandOptions: [{ label: "Herceptin", strengths: [strength(120)] }],
      selectedDose: "120",
      strengthLabel: "120 mg",
    });

    const items = toSlipOrderItems([row]);

    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
  });

  const savedItem = (
    overrides: Partial<PharmacySlipItem>
  ): PharmacySlipItem => ({
    pharmacy_slip_item_id: "PSI-1",
    pharmacy_slip_id: "PSL-1",
    display_order: 0,
    medicine_id: "MED-1",
    drug_name: "Trastuzumab",
    brand_name: "Herceptin",
    dosage_form: "Injection",
    patient_dose: "150 mg",
    dose: "120",
    dose_unit: "mg",
    quantity: 1,
    drug_role: "PRIMARY",
    route: "IV",
    frequency: null,
    duration: null,
    instructions: null,
    pharmacy_item_id: "PHM-120",
    ...overrides,
  });

  it("restores the brand, strength and override from a saved slip", () => {
    const [row] = applySavedSlip(
      [draft()],
      [
        savedItem({ quantity: 2 }),
        savedItem({ pharmacy_slip_item_id: "PSI-2", dose: "30", quantity: 1, pharmacy_item_id: "PHM-30" }),
      ]
    );

    expect(row.brand).toBe("Herceptin");
    expect(row.selectedDose).toBe("120");
    expect(row.quantityOverride).toBe("2");
    expect(row.extraQuantityOverride).toBe("");
    expect(row.pharmacyItemId).toBe("PHM-120");
  });

  it("ignores a saved quantity that equals the suggestion", () => {
    const [row] = applySavedSlip([draft()], [savedItem({ quantity: 1 })]);

    expect(row.quantityOverride).toBe("");
  });

  it("keeps a typed quantity when there is no patient dose to suggest one", () => {
    const [row] = applySavedSlip(
      [draft({ patientDose: "", patientDoseValue: null })],
      [savedItem({ quantity: 3 })]
    );

    expect(row.quantityOverride).toBe("3");
  });

  it("keeps the fresh row when there is no saved slip", () => {
    const [row] = applySavedSlip([draft()], []);

    expect(row.quantityOverride).toBe("");
  });
});

describe("buildSlipSourceRows", () => {
  const order = {
    chemotherapy_plan_items: [
      {
        chemotherapy_plan_item_id: "I-1",
        drug_sequence: 3,
        drug_role: "PRIMARY",
        medicine_id: "MED-1",
        protocol_dose: 150,
        protocol_dose_unit: "mg",
        calculated_dose: 150,
        calculated_dose_unit: "mg",
        medicine_master: { medicine_name: "Trastuzumab", generic_id: "GEN-1", dosage_form: "Injection" },
      },
      {
        chemotherapy_plan_item_id: "I-2",
        drug_sequence: 90,
        drug_role: "PREMEDICATION",
        medicine_id: "MED-2",
        protocol_dose: 8,
        protocol_dose_unit: "mg",
        medicine_master: { medicine_name: "Ondansetron", generic_id: "GEN-2", dosage_form: "Injection" },
      },
      {
        chemotherapy_plan_item_id: "I-3",
        drug_sequence: 110,
        drug_role: "DILUTION",
        medicine_id: "MED-3",
        medicine_master: { medicine_name: "Normal Saline" },
      },
    ],
  } as any;

  it("orders primary before premedication and drops dilution", () => {
    const rows = buildSlipSourceRows({ order, dischargeRows: [] });

    expect(rows.map((row) => row.role)).toEqual(["PRIMARY", "PREMEDICATION"]);
    expect(rows[0].patientDose).toBe("150 mg");
  });

  it("appends discharge rows last", () => {
    const rows = buildSlipSourceRows({
      order,
      dischargeRows: [
        {
          id: 1,
          medicineId: "MED-9",
          drugName: "Paracetamol",
          drugForm: "Tablet",
          genericId: "GEN-9",
          dosage: "500 mg",
          dosageUnit: "mg",
          frequency: "TDS",
          instruction: "After food",
          duration: "5 days",
        },
      ],
    });

    expect(rows.map((row) => row.role)).toEqual([
      "PRIMARY",
      "PREMEDICATION",
      "DISCHARGE",
    ]);
    expect(rows[2].patientDose).toBe("500 mg");
    expect(rows[2].genericId).toBe("GEN-9");
    expect(rows[2].drugForm).toBe("Tablet");
  });

  it("returns no rows when the order has not been saved", () => {
    expect(buildSlipSourceRows({ order: null, dischargeRows: [] })).toEqual([]);
  });
});

describe("formatSlipDuration", () => {
  it("appends the unit code to a bare duration", () => {
    expect(formatSlipDuration("4", "D")).toBe("4 D");
    expect(formatSlipDuration(30, "day")).toBe("30 D");
    expect(formatSlipDuration("2", "Wk")).toBe("2 Wk");
  });

  it("never writes the unit twice", () => {
    expect(formatSlipDuration("4 D", "D")).toBe("4 D");
    expect(formatSlipDuration("4 D", "day")).toBe("4 D");
    expect(formatSlipDuration("2 Wk", "Wk")).toBe("2 Wk");
  });

  it("keeps the value alone when no unit is known", () => {
    expect(formatSlipDuration("4", null)).toBe("4");
    expect(formatSlipDuration("4 D", "")).toBe("4 D");
  });

  it("is blank for an empty duration", () => {
    expect(formatSlipDuration("", "D")).toBe("");
    expect(formatSlipDuration(null, "D")).toBe("");
    expect(formatSlipDuration(undefined, undefined)).toBe("");
  });
});

describe("formatFrequencyDuration", () => {
  it("joins frequency and duration with a slash", () => {
    expect(formatFrequencyDuration("1-0-2", "4", "D")).toBe("1-0-2 / 4 D");
  });

  it("returns whichever side is present", () => {
    expect(formatFrequencyDuration("1-0-2", "", "")).toBe("1-0-2");
    expect(formatFrequencyDuration("", "4", "D")).toBe("4 D");
  });

  it("is blank when neither side is present", () => {
    expect(formatFrequencyDuration("", "", "D")).toBe("");
  });
});

describe("slipFrequencyDuration", () => {
  it("fills the column for a discharge row", () => {
    expect(slipFrequencyDuration("DISCHARGE", "1-0-2", "4", "D")).toBe(
      "1-0-2 / 4 D"
    );
    expect(slipFrequencyDuration("discharge", "1-0-2", "4 D")).toBe(
      "1-0-2 / 4 D"
    );
  });

  it("leaves every other medicine type blank", () => {
    expect(slipFrequencyDuration("PRIMARY", "1-0-2", "4", "D")).toBe("");
    expect(slipFrequencyDuration("PREMEDICATION", "OD", "5", "D")).toBe("");
    expect(slipFrequencyDuration("SUPPORTIVE", "BD", "", "")).toBe("");
    expect(slipFrequencyDuration("", "OD", "5", "D")).toBe("");
  });
});

describe("F/D on the printed rows", () => {
  it("carries the discharge frequency/duration onto both display lines", () => {
    const rows = toDisplayRows([
      draft({
        key: "DISCHARGE:1",
        role: "DISCHARGE",
        drugName: "Paracetamol",
        drugForm: "Tablet",
        patientDose: "150 mg",
        patientDoseValue: 150,
        patientDoseUnit: "mg",
        selectedDose: "120",
        frequency: "1-0-2",
        duration: "4",
        durationUnit: "D",
        instructions: "After food",
      }),
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0].frequencyDuration).toBe("1-0-2 / 4 D");
    expect(rows[1].frequencyDuration).toBe("1-0-2 / 4 D");
    expect(rows[0].instructions).toBe("After food");
  });

  it("leaves F/D blank for a non-discharge row even when it has directions", () => {
    const [row] = toDisplayRows([
      draft({ frequency: "OD", duration: "3", durationUnit: "D" }),
    ]);

    expect(row.frequencyDuration).toBe("");
  });

  it("writes the composed duration (\"4 D\") into the order payload", () => {
    const items = toSlipOrderItems([
      draft({
        key: "DISCHARGE:1",
        role: "DISCHARGE",
        selectedDose: "120",
        frequency: "1-0-2",
        duration: "4",
        durationUnit: "D",
      }),
    ]);

    expect(items[0]).toMatchObject({
      frequency: "1-0-2",
      duration: "4 D",
    });
    expect(items[1]).toMatchObject({ duration: "4 D" });
  });
});

describe("ADD / REMOVE rows", () => {
  const sourcePrimary = (): SlipSourceRow => ({
    key: "PRIMARY:1",
    medicineId: "MED-1",
    genericId: "GEN-1",
    drugName: "Trastuzumab",
    drugForm: "Injection",
    patientDose: "150 mg",
    patientDoseValue: 150,
    patientDoseUnit: "mg",
    role: "PRIMARY",
    route: "IV",
    frequency: "",
    duration: "",
    instructions: "",
  });

  const sourceDischarge = (): SlipSourceRow => ({
    key: "DISCHARGE:1",
    medicineId: "MED-2",
    genericId: "GEN-2",
    drugName: "Paracetamol",
    drugForm: "Tablet",
    patientDose: "500 mg",
    patientDoseValue: 500,
    patientDoseUnit: "mg",
    role: "DISCHARGE",
    route: "Oral",
    frequency: "1-0-2",
    duration: "4",
    durationUnit: "D",
    instructions: "After food",
  });

  const master = (): PharmacyMasterItem[] => [
    masterRow({}),
    masterRow({
      pharmacy_item_id: "PHM-30",
      item_name: "Trastuzumab 30 mg",
      strength_text: "30 mg",
      strength_value: 30,
    }),
    masterRow({
      pharmacy_item_id: "PHM-20",
      item_name: "Trastuzumab 20 mg",
      strength_text: "20 mg",
      strength_value: 20,
    }),
    masterRow({
      pharmacy_item_id: "PHM-500",
      medicine_id: "MED-2",
      generic_name: "Paracetamol",
      generic_id: "GEN-2",
      item_name: "Dolo 500 mg",
      brand_name: "Dolo",
      dosage_form: "Tablet",
      strength_text: "500 mg",
      strength_value: 500,
    }),
  ];

  const savedLine = (
    overrides: Partial<PharmacySlipItem> = {}
  ): PharmacySlipItem => ({
    pharmacy_slip_item_id: "PSI-1",
    pharmacy_slip_id: "PSL-1",
    display_order: 0,
    medicine_id: "MED-1",
    drug_name: "Trastuzumab",
    brand_name: "Herceptin",
    dosage_form: "Injection",
    patient_dose: "150 mg",
    dose: "120",
    dose_unit: "mg",
    quantity: 1,
    drug_role: "PRIMARY",
    route: "IV",
    frequency: null,
    duration: null,
    instructions: null,
    pharmacy_item_id: "PHM-1",
    source_row_key: "PRIMARY:1",
    is_top_up: false,
    extra_suppressed: false,
    ...overrides,
  });

  it("cloneDraftRow copies the medicine but resets the editable values", () => {
    const row = draft();
    const clone = cloneDraftRow(row, "ADD:1");

    expect(clone.key).toBe("ADD:1");
    expect(clone.sourceRowKey).toBe("ADD:1");
    expect(clone.originKey).toBe("PRIMARY:1");
    expect(clone.isAdded).toBe(true);
    expect(clone.drugName).toBe(row.drugName);
    expect(clone.drugForm).toBe(row.drugForm);
    expect(clone.patientDose).toBe(row.patientDose);
    expect(clone.brand).toBe(row.brand);
    expect(clone.selectedDose).toBe(row.selectedDose);
    expect(clone.role).toBe(row.role);
    expect(clone.route).toBe(row.route);
    expect(clone.quantityOverride).toBe("");
    expect(clone.extraQuantityOverride).toBe("");
    expect(clone.extraSuppressed).toBe(false);
  });

  it("writes the source row key and top-up flag on both lines", () => {
    const items = toSlipOrderItems([draft()]);

    expect(items[0]).toMatchObject({
      source_row_key: "PRIMARY:1",
      is_top_up: false,
      extra_suppressed: false,
    });
    expect(items[1]).toMatchObject({
      source_row_key: "PRIMARY:1",
      is_top_up: true,
    });
  });

  it("skips a removed top-up and records the suppression on the base line", () => {
    const items = toSlipOrderItems([draft({ extraSuppressed: true })]);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      is_top_up: false,
      extra_suppressed: true,
    });
  });

  it("keeps a separate key for an added copy", () => {
    const clone = cloneDraftRow(draft(), "ADD:1");
    const items = toSlipOrderItems([draft(), clone]);

    expect(items.map((item) => item.source_row_key)).toEqual([
      "PRIMARY:1",
      "PRIMARY:1",
      "ADD:1",
      "ADD:1",
    ]);
    expect(items.filter((item) => item.is_top_up)).toHaveLength(2);
  });

  it("drops a suppressed top-up line and keeps the numbering continuous", () => {
    const rows = [
      draft({ extraSuppressed: true }),
      draft({
        key: "DISCHARGE:1",
        sourceRowKey: "DISCHARGE:1",
        originKey: "DISCHARGE:1",
        role: "DISCHARGE",
        drugName: "Paracetamol",
        drugForm: "Tablet",
        patientDose: "500 mg",
        patientDoseValue: 500,
        patientDoseUnit: "mg",
        selectedDose: "500",
        selectedUnit: "mg",
        brand: "Dolo",
        strengthLabel: "500 mg",
        brandOptions: [{ label: "Dolo", strengths: [strength(500)] }],
      }),
    ];

    const display = toDisplayRows(rows);

    expect(display).toHaveLength(2);
    expect(display.map((row) => row.no)).toEqual([1, 2]);
    expect(display[0].isExtra).toBe(false);
    expect(display[1].isExtra).toBe(false);
  });

  it("computeRemovedRowKeys reports known rows that are no longer on screen", () => {
    const rows = [draft(), cloneDraftRow(draft(), "ADD:1")];

    expect(
      computeRemovedRowKeys(["PRIMARY:1", "DISCHARGE:1"], rows)
    ).toEqual(["DISCHARGE:1"]);
  });

  it("detects slips saved before the row-key columns existed", () => {
    expect(savedSlipHasRowKeys([savedLine()])).toBe(true);
    expect(savedSlipHasRowKeys([savedLine({ source_row_key: null })])).toBe(false);
    expect(savedSlipHasRowKeys(null)).toBe(false);
  });

  it("rebuilds the doctor's added copies from the saved lines", () => {
    const rows = buildDraftRowsFromSaved({
      sourceRows: [sourcePrimary()],
      savedItems: [
        savedLine(),
        savedLine({
          pharmacy_slip_item_id: "PSI-2",
          dose: "30",
          quantity: 1,
          pharmacy_item_id: "PHM-30",
          is_top_up: true,
        }),
        savedLine({
          pharmacy_slip_item_id: "PSI-3",
          source_row_key: "ADD:1",
          dose: "30",
          quantity: 2,
          pharmacy_item_id: "PHM-30",
        }),
      ],
      masterItems: master(),
    });

    expect(rows.map((row) => row.sourceRowKey)).toEqual(["PRIMARY:1", "ADD:1"]);
    expect(rows[0].isAdded).toBe(false);
    expect(rows[1].isAdded).toBe(true);
    expect(rows[1].originKey).toBe("PRIMARY:1");
    expect(rows[1].drugName).toBe("Trastuzumab");
    expect(rows[1].selectedDose).toBe("30");
    expect(rows[1].quantityOverride).toBe("2");
  });

  it("does not resurrect a row the doctor removed", () => {
    const rows = buildDraftRowsFromSaved({
      sourceRows: [sourcePrimary(), sourceDischarge()],
      savedItems: [savedLine()],
      removedKeys: ["DISCHARGE:1"],
      masterItems: master(),
    });

    expect(rows.map((row) => row.sourceRowKey)).toEqual(["PRIMARY:1"]);
  });

  it("appends a medicine added to the order after the slip was saved", () => {
    const rows = buildDraftRowsFromSaved({
      sourceRows: [sourcePrimary(), sourceDischarge()],
      savedItems: [savedLine()],
      masterItems: master(),
    });

    expect(rows.map((row) => row.sourceRowKey)).toEqual([
      "PRIMARY:1",
      "DISCHARGE:1",
    ]);
    expect(rows[1].isAdded).toBe(false);
    expect(rows[1].quantityOverride).toBe("");
  });

  it("restores a removed top-up and a typed top-up quantity", () => {
    const [suppressed] = buildDraftRowsFromSaved({
      sourceRows: [sourcePrimary()],
      savedItems: [savedLine({ extra_suppressed: true })],
      masterItems: master(),
    });

    expect(suppressed.extraSuppressed).toBe(true);

    const [typed] = buildDraftRowsFromSaved({
      sourceRows: [sourcePrimary()],
      savedItems: [
        savedLine(),
        savedLine({
          pharmacy_slip_item_id: "PSI-2",
          dose: "30",
          quantity: 4,
          pharmacy_item_id: "PHM-30",
          is_top_up: true,
        }),
      ],
      masterItems: master(),
    });

    expect(typed.extraSuppressed).toBe(false);
    expect(typed.extraQuantityOverride).toBe("4");
  });
});
