// ============================================================================
// PACKAGE DECOMPOSITION UTILITY
// ============================================================================
// Decomposes multi-test packages (e.g. Prechemo Plus, Prechemo, MOL Packages)
// into their constituent individual tests so that:
// 1. Each sub-test gets its own physical sample container & unique Barcode.
// 2. In Testing Samples (Option 2B), each sub-test appears as an independent row
//    with its own specific parameters table (no monolithic mixed tables).
// 3. In Report Generation, each sub-test generates an independent certified report.
// ============================================================================

export interface SubTestDefinition {
  key: string;
  name: string;
  code: string;
  sampleType: string;
  containerType: string;
  containerColor: "purple" | "amber" | "slate" | "blue" | "emerald" | "rose";
  analyzerBench: string;
  stabilityHours: number;
  filterParameter: (paramName: string) => boolean;
}

// Parameter matching sets
const CBC_KEYWORDS = [
  "hemoglobin", "wbc", "rbc", "pcv", "hct", "mcv", "mch", "mchc",
  "rdw", "platelet", "mpv", "neutrophil", "lymphocyte", "eosinophil",
  "monocyte", "basophil", "anc", "alc", "aec", "differential", "smear", "esr"
];

const LFT_KEYWORDS = [
  "bilirubin", "sgot", "ast", "sgpt", "alt", "alkaline phosphatase", "alp",
  "ggt", "total protein", "albumin", "globulin", "a/g ratio", "gamma gt", "gamma-gt"
];

const RFT_KEYWORDS = [
  "urea", "creatinine", "bun", "blood urea", "uric acid", "egfr",
  "sodium", "potassium", "chloride", "calcium", "phosphorus", "phosphate", "bicarbonate", "electrolyte", "magnesium"
];

const GLUCOSE_KEYWORDS = [
  "glucose", "blood sugar", "rbs", "fbs", "ppbs", "random blood sugar", "fasting blood sugar", "post prandial"
];

const LIPID_KEYWORDS = [
  "cholesterol", "triglyceride", "hdl", "ldl", "vldl", "tc/hdl", "ldl/hdl", "non-hdl"
];

const THYROID_KEYWORDS = [
  "tsh", "t3", "t4", "ft3", "ft4", "thyroid"
];

const COAG_KEYWORDS = [
  "prothrombin", "pt (", "pt patient", "pt control", "inr", "aptt", "ptt", "thrombin time", "fibrinogen", "d-dimer"
];

const URINE_KEYWORDS = [
  "colour", "color", "appearance", "specific gravity", "ph", "urine protein", "protein (albumin)", "ketone",
  "bile", "urobilinogen", "nitrite", "leucocyte", "pus cell", "epithelial", "cast", "crystal", "bacteria", "yeast"
];

function paramMatches(paramName: string, keywords: string[]): boolean {
  const lower = (paramName || "").toLowerCase().trim();
  return keywords.some((kw) => {
    const k = kw.toLowerCase().trim();
    if (k.length <= 4) {
      // Use boundary pattern for short acronyms like 'ast', 'alt', 'pt', 'esr', 'bun'
      const regex = new RegExp(`(^|[^a-z0-9])${k}([^a-z0-9]|$)`, "i");
      return regex.test(lower);
    }
    return lower.includes(k);
  });
}

// ----------------------------------------------------------------------------
// Check if a test is a package requiring decomposition
// STRICT RULE: Only tests explicitly named with "Package", or designated
// composite package codes (PKG-*, IH-001, IH-002, MOL-044..046), or composite
// packages created via Add Package may have sub-tests.
// Single tests and clinical panels (CBC, LFT, RFT, Lipid, Electrolytes,
// Creatinine, RBS, Urine Routine, etc.) must NEVER have sub-tests!
// ----------------------------------------------------------------------------
export function isPackageTest(testName?: string | null, testCode?: string | null, includesDetails?: string | null): boolean {
  if (!testName && !testCode) return false;
  const name = (testName || "").toLowerCase().trim();
  const code = (testCode || "").toUpperCase().trim();
  const inc = (includesDetails || "").toLowerCase().trim();

  // 1. Explicitly named with "package"
  // e.g. "Prechemo Plus Package", "Prechemo Package", "Master Health Checkup Package", "Executive Package"
  if (name.includes("package")) {
    return true;
  }

  // 2. Explicit package code prefix (e.g. PKG-001, PKG_PRECHEMO, PKG...)
  if (code.startsWith("PKG-") || code.startsWith("PKG_") || code.includes("PKG")) {
    return true;
  }

  // 3. Known composite packages explicitly defined with multiple sub-tests
  if (["IH-001", "IH-002", "MOL-044", "MOL-045", "MOL-046"].includes(code)) {
    return true;
  }
  if (name.includes("prechemo plus") || name.includes("prechemo package")) {
    return true;
  }

  // 4. Composite packages created via "Add Package" in Lab Master:
  // Must explicitly have "includes:" prefix AND indicate multiple sub-tests AND be marked as a package
  if (inc.startsWith("includes:") && inc.includes(",") && (name.includes("package") || code.includes("pkg") || inc.includes("sub-test") || name.includes("health checkup"))) {
    return true;
  }

  // STRICT: Standard single tests, panels, and test combinations (Complete Blood Count, Liver Function Test,
  // Renal Function Test, Lipid Profile, Electrolytes, Creatinine, RBS, Urine Routine, CBC with ESR, etc.)
  // are NOT packages and MUST NEVER have sub-tests or be decomposed into sub-tests!
  return false;
}

// ----------------------------------------------------------------------------
// Decompose a Package Test into constituent Sub-Tests
// ----------------------------------------------------------------------------
export function decomposePackageTest(testName?: string | null, testCode?: string | null, includesDetails?: string | null): SubTestDefinition[] {
  const name = (testName || "").toLowerCase().trim();
  const code = (testCode || "").toUpperCase().trim();

  // STRICT GUARD: If NOT an explicit package test, immediately return single test definition
  if (!isPackageTest(testName, testCode, includesDetails)) {
    return [
      {
        key: "main",
        name: testName || "Diagnostic Test",
        code: testCode || "TEST",
        sampleType: "Specimen",
        containerType: "Primary Container",
        containerColor: "purple",
        analyzerBench: "Clinical Laboratory",
        stabilityHours: 4,
        filterParameter: () => true,
      },
    ];
  }

  // 1. Prechemo Plus Package (IH-001)
  // Includes: CBC, LFT, Urea, Creatinine, RBS, Calcium, Electrolytes
  if (code === "IH-001" || name.includes("prechemo plus")) {
    return [
      {
        key: "cbc",
        name: "Complete Blood Count (CBC)",
        code: "CBC",
        sampleType: "EDTA Whole Blood",
        containerType: "Lavender Top (EDTA)",
        containerColor: "purple",
        analyzerBench: "Hematology Bench",
        stabilityHours: 4,
        filterParameter: (p) => paramMatches(p, CBC_KEYWORDS) && !paramMatches(p, LFT_KEYWORDS) && !paramMatches(p, RFT_KEYWORDS),
      },
      {
        key: "lft",
        name: "Liver Function Test (LFT)",
        code: "LFT",
        sampleType: "Serum / Clotted Blood",
        containerType: "Yellow Top (SST Gel)",
        containerColor: "amber",
        analyzerBench: "Biochemistry Bench",
        stabilityHours: 6,
        filterParameter: (p) => paramMatches(p, LFT_KEYWORDS) && !paramMatches(p, CBC_KEYWORDS) && !paramMatches(p, RFT_KEYWORDS),
      },
      {
        key: "rft_elec",
        name: "Renal Function & Electrolytes",
        code: "RFT-ELEC",
        sampleType: "Serum / Clotted Blood",
        containerType: "Yellow Top (SST Gel)",
        containerColor: "amber",
        analyzerBench: "Biochemistry Bench",
        stabilityHours: 6,
        filterParameter: (p) => paramMatches(p, RFT_KEYWORDS) && !paramMatches(p, LFT_KEYWORDS) && !paramMatches(p, CBC_KEYWORDS),
      },
      {
        key: "glucose",
        name: "Random Blood Sugar (RBS)",
        code: "RBS",
        sampleType: "Fluoride Plasma",
        containerType: "Grey Top (Sodium Fluoride)",
        containerColor: "slate",
        analyzerBench: "Biochemistry Bench",
        stabilityHours: 2,
        filterParameter: (p) => paramMatches(p, GLUCOSE_KEYWORDS) && !paramMatches(p, CBC_KEYWORDS) && !paramMatches(p, LFT_KEYWORDS) && !paramMatches(p, RFT_KEYWORDS),
      },
    ];
  }

  // 2. Prechemo Package (IH-002)
  // Includes: CBC, LFT, RBS, Urea, Creatinine
  if (code === "IH-002" || (name.includes("prechemo") && !name.includes("plus"))) {
    return [
      {
        key: "cbc",
        name: "Complete Blood Count (CBC)",
        code: "CBC",
        sampleType: "EDTA Whole Blood",
        containerType: "Lavender Top (EDTA)",
        containerColor: "purple",
        analyzerBench: "Hematology Bench",
        stabilityHours: 4,
        filterParameter: (p) => paramMatches(p, CBC_KEYWORDS) && !paramMatches(p, LFT_KEYWORDS) && !paramMatches(p, RFT_KEYWORDS),
      },
      {
        key: "lft",
        name: "Liver Function Test (LFT)",
        code: "LFT",
        sampleType: "Serum / Clotted Blood",
        containerType: "Yellow Top (SST Gel)",
        containerColor: "amber",
        analyzerBench: "Biochemistry Bench",
        stabilityHours: 6,
        filterParameter: (p) => paramMatches(p, LFT_KEYWORDS) && !paramMatches(p, CBC_KEYWORDS) && !paramMatches(p, RFT_KEYWORDS),
      },
      {
        key: "rft",
        name: "Renal Function Test (Urea & Creatinine)",
        code: "RFT",
        sampleType: "Serum / Clotted Blood",
        containerType: "Yellow Top (SST Gel)",
        containerColor: "amber",
        analyzerBench: "Biochemistry Bench",
        stabilityHours: 6,
        filterParameter: (p) => paramMatches(p, ["urea", "creatinine", "bun"]) && !paramMatches(p, LFT_KEYWORDS) && !paramMatches(p, CBC_KEYWORDS),
      },
      {
        key: "glucose",
        name: "Random Blood Sugar (RBS)",
        code: "RBS",
        sampleType: "Fluoride Plasma",
        containerType: "Grey Top (Sodium Fluoride)",
        containerColor: "slate",
        analyzerBench: "Biochemistry Bench",
        stabilityHours: 2,
        filterParameter: (p) => paramMatches(p, GLUCOSE_KEYWORDS) && !paramMatches(p, CBC_KEYWORDS) && !paramMatches(p, LFT_KEYWORDS) && !paramMatches(p, RFT_KEYWORDS),
      },
    ];
  }

  // 3. MOL-044 (HBA1C, Thyroid Profile, Lipid Profile)
  if (code === "MOL-044" || (name.includes("hba1c") && name.includes("thyroid") && name.includes("package"))) {
    return [
      {
        key: "hba1c",
        name: "HbA1c (Glycated Hemoglobin)",
        code: "HBA1C",
        sampleType: "EDTA Whole Blood",
        containerType: "Lavender Top (EDTA)",
        containerColor: "purple",
        analyzerBench: "Biochemistry Bench",
        stabilityHours: 24,
        filterParameter: (p) => paramMatches(p, ["hba1c", "glycated", "estimated average glucose", "eag"]),
      },
      {
        key: "thyroid",
        name: "Thyroid Profile (T3, T4, TSH)",
        code: "TFT",
        sampleType: "Serum / Clotted Blood",
        containerType: "Yellow Top (SST Gel)",
        containerColor: "amber",
        analyzerBench: "Biochemistry Bench",
        stabilityHours: 12,
        filterParameter: (p) => paramMatches(p, THYROID_KEYWORDS),
      },
      {
        key: "lipid",
        name: "Lipid Profile",
        code: "LIPID",
        sampleType: "Serum / Clotted Blood",
        containerType: "Yellow Top (SST Gel)",
        containerColor: "amber",
        analyzerBench: "Biochemistry Bench",
        stabilityHours: 12,
        filterParameter: (p) => paramMatches(p, LIPID_KEYWORDS),
      },
    ];
  }

  // 4. MOL-045 & MOL-046 (Thyroid, ACTH, Cortisol)
  if (code === "MOL-045" || code === "MOL-046") {
    return [
      {
        key: "thyroid",
        name: "Thyroid Profile (TSH, FT3, FT4)",
        code: "TFT",
        sampleType: "Serum / Clotted Blood",
        containerType: "Yellow Top (SST Gel)",
        containerColor: "amber",
        analyzerBench: "Biochemistry Bench",
        stabilityHours: 12,
        filterParameter: (p) => paramMatches(p, THYROID_KEYWORDS),
      },
      {
        key: "acth",
        name: "ACTH (Adrenocorticotropic Hormone)",
        code: "ACTH",
        sampleType: "Chilled EDTA Plasma",
        containerType: "Lavender Top (Chilled EDTA)",
        containerColor: "purple",
        analyzerBench: "Special Chemistry Bench",
        stabilityHours: 2,
        filterParameter: (p) => paramMatches(p, ["acth", "adrenocorticotropic"]),
      },
      {
        key: "cortisol",
        name: "Cortisol (Morning / Random)",
        code: "CORTISOL",
        sampleType: "Serum / Clotted Blood",
        containerType: "Yellow Top (SST Gel)",
        containerColor: "amber",
        analyzerBench: "Special Chemistry Bench",
        stabilityHours: 8,
        filterParameter: (p) => paramMatches(p, ["cortisol"]),
      },
    ];
  }

  // 5. Multi-test Package defined via includes_details (e.g. from Add Package feature: "Includes: Test A, Test B, Test C")
  if (includesDetails && includesDetails.toLowerCase().includes("includes:")) {
    const rawList = includesDetails.replace(/^includes:\s*/i, "");
    const parts = rawList.split(/[,;+&]/).map((s) => s.trim()).filter((s) => s.length > 1);
    if (parts.length > 1) {
      return parts.map((part, idx) => {
        const pLower = part.toLowerCase();
        let sType = "Whole Blood";
        let cType = "Standard Container";
        let cColor: "purple" | "amber" | "slate" | "blue" | "emerald" | "rose" = "purple";
        let bench = "Clinical Laboratory";
        let kw: string[] = [pLower];

        if (pLower.includes("cbc") || pLower.includes("blood count") || pLower.includes("hemogram")) {
          sType = "EDTA Whole Blood";
          cType = "Lavender Top (EDTA)";
          cColor = "purple";
          bench = "Hematology Bench";
          kw = CBC_KEYWORDS;
        } else if (pLower.includes("lft") || pLower.includes("liver")) {
          sType = "Serum / Clotted Blood";
          cType = "Yellow Top (SST Gel)";
          cColor = "amber";
          bench = "Biochemistry Bench";
          kw = LFT_KEYWORDS;
        } else if (pLower.includes("rft") || pLower.includes("kft") || pLower.includes("renal") || pLower.includes("kidney") || pLower.includes("urea") || pLower.includes("creatinine")) {
          sType = "Serum / Clotted Blood";
          cType = "Yellow Top (SST Gel)";
          cColor = "amber";
          bench = "Biochemistry Bench";
          kw = RFT_KEYWORDS;
        } else if (pLower.includes("lipid") || pLower.includes("cholesterol")) {
          sType = "Serum / Clotted Blood";
          cType = "Yellow Top (SST Gel)";
          cColor = "amber";
          bench = "Biochemistry Bench";
          kw = LIPID_KEYWORDS;
        } else if (pLower.includes("thyroid") || pLower.includes("tft") || pLower.includes("tsh")) {
          sType = "Serum / Clotted Blood";
          cType = "Yellow Top (SST Gel)";
          cColor = "amber";
          bench = "Biochemistry Bench";
          kw = THYROID_KEYWORDS;
        } else if (pLower.includes("glucose") || pLower.includes("sugar") || pLower.includes("rbs") || pLower.includes("fbs")) {
          sType = "Fluoride Plasma";
          cType = "Grey Top (Sodium Fluoride)";
          cColor = "slate";
          bench = "Biochemistry Bench";
          kw = GLUCOSE_KEYWORDS;
        } else if (pLower.includes("coag") || pLower.includes("pt") || pLower.includes("inr") || pLower.includes("aptt")) {
          sType = "Sodium Citrate Plasma";
          cType = "Light Blue Top (3.2% Citrate)";
          cColor = "blue";
          bench = "Hematology Bench";
          kw = COAG_KEYWORDS;
        } else if (pLower.includes("urine") || pLower.includes("urinalysis")) {
          sType = "Random Urine";
          cType = "Sterile Urine Container";
          cColor = "emerald";
          bench = "Clinical Pathology";
          kw = URINE_KEYWORDS;
        } else if (pLower.includes("esr")) {
          sType = "Black Top (Sodium Citrate)";
          cType = "Black Top / EDTA";
          cColor = "slate";
          bench = "Hematology Bench";
          kw = ["esr", "erythrocyte sedimentation"];
        } else if (pLower.includes("hba1c")) {
          sType = "EDTA Whole Blood";
          cType = "Lavender Top (EDTA)";
          cColor = "purple";
          bench = "Biochemistry Bench";
          kw = ["hba1c", "glycated", "eag"];
        } else {
          const words = pLower.split(/\s+/).filter((w) => w.length > 2);
          kw = words.length > 0 ? words : [pLower];
        }

        return {
          key: `sub_${part.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 15)}_${idx + 1}`,
          name: part,
          code: part.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase() || `SUB${idx + 1}`,
          sampleType: sType,
          containerType: cType,
          containerColor: cColor,
          analyzerBench: bench,
          stabilityHours: 4,
          filterParameter: (p) => paramMatches(p, kw),
        };
      });
    }
  }

  // Single test fallback
  return [
    {
      key: "main",
      name: testName || "Diagnostic Test",
      code: testCode || "PKG",
      sampleType: "Specimen",
      containerType: "Primary Container",
      containerColor: "purple",
      analyzerBench: "Clinical Laboratory",
      stabilityHours: 4,
      filterParameter: () => true,
    },
  ];
}

// ----------------------------------------------------------------------------
// Helper to format Barcode for each sub-test
// Produces e.g. "BC2405001-CBC", "BC2405001-LFT", or clean sequential numbering
// ----------------------------------------------------------------------------
export function generateSubTestBarcode(baseBarcode: string, subCode: string, index: number): string {
  if (!baseBarcode) return `BC${Date.now().toString().slice(-6)}${String(index + 1).padStart(2, "0")}`;
  // If base barcode already has a suffix, clean it
  const cleanBase = baseBarcode.replace(/-[A-Z0-9]+$/i, "");
  return `${cleanBase}-${subCode.replace(/[^A-Za-z0-9]/g, "")}`;
}

// ----------------------------------------------------------------------------
// Badge color styles for UI
// ----------------------------------------------------------------------------
export function getContainerBadgeClass(color: "purple" | "amber" | "slate" | "blue" | "emerald" | "rose") {
  switch (color) {
    case "purple":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "amber":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "slate":
      return "bg-slate-100 text-slate-700 border-slate-300";
    case "blue":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "emerald":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "rose":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}
