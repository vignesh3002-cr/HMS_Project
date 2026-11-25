import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  ChevronDown,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  Activity,
  Sliders,
  Database,
  Info,
  RefreshCw,
  FlaskConical,
  Package,
  Boxes,
  Check,
  Sparkles,
} from "lucide-react";
import LabNav from "./labnav";
import { LabNotificationBell } from "@/components/hms/LabNotificationBell";
import { UserProfileDropdown } from "@/components/ui/User_profile_dropdown";
import { toast } from "@/hooks/use-toast";
import { getUser, remove } from "@/utils/token";
import { labTestMasterApi, LabTestMasterRecord } from "@/api/labTestMaster.api";
import {
  isPackageTest,
  decomposePackageTest,
  getContainerBadgeClass,
  SubTestDefinition,
} from "./packageDecomposition";
import * as XLSX from "xlsx";

// ============================================================================
// DATA TYPES
// ============================================================================

export interface MasterParameter {
  id: string;
  name: string;
  unit: string;
  valueType: "numeric" | "qualitative";
  refRangeLow?: number | string;
  refRangeHigh?: number | string;
  refRangeText?: string;
  criticalLow?: number | string;
  criticalHigh?: number | string;
  gender: "Both" | "Male" | "Female";
  ageMin?: number;
  ageMax?: number;
  sortOrder: number;
  remarks?: string;
}

export interface MasterTest {
  id: string;
  testCode: string;
  testName: string;
  category: string;
  sampleType: string;
  tubeCapColor: string;
  tubeCapHex: string;
  requiredVolume: string;
  tatHours: number;
  tatText?: string;
  expiryHours: number;
  price: number;
  status: "ACTIVE" | "INACTIVE";
  parameters: MasterParameter[];
  description?: string;
  updatedAt?: string;
  isOutsourced: boolean;
  outsourceLab: string;
  testType: "In-house" | "Outsourced";
  resultType?: string;
}

// Common Laboratory Container Tube Colors
export const TUBE_CAP_OPTIONS = [
  { name: "Lavender (EDTA)", hex: "#8a2be2", sampleType: "Whole Blood" },
  { name: "Plain Red (No Additive)", hex: "#dc2626", sampleType: "Serum" },
  { name: "Yellow (SST / Gel)", hex: "#eab308", sampleType: "Serum" },
  { name: "Grey (Sodium Fluoride)", hex: "#6b7280", sampleType: "Fluoride Plasma" },
  { name: "Light Blue (Sodium Citrate)", hex: "#0284c7", sampleType: "Citrated Plasma" },
  { name: "Green (Heparin)", hex: "#16a34a", sampleType: "Heparinized Blood" },
  { name: "Sterile Container", hex: "#0ea5e9", sampleType: "Urine / Body Fluid" },
];

export const COMMON_UNITS = [
  "g/dL",
  "cells/µL",
  "million/µL",
  "%",
  "fL",
  "pg",
  "mg/dL",
  "U/L",
  "µIU/mL",
  "ng/mL",
  "mEq/L",
  "mmol/L",
  "µg/dL",
  "mm/hr",
  "ratio",
  "titer",
];

export const CATEGORY_OPTIONS = [
  "Hematology",
  "Clinical Biochemistry",
  "Clinical Pathology",
  "Immunoassay & Endocrinology",
  "Serology & Immunology",
  "Microbiology",
  "Coagulation",
];

// ============================================================================
// PREPOPULATED CLINICAL TEST CATALOG (Standard Accredited Clinical Master)
// ============================================================================

export const PREPOPULATED_MASTER_TESTS: MasterTest[] = [
  {
    id: "LT00787",
    testCode: "IH-013",
    testName: "Complete Blood Count",
    category: "Haematology",
    sampleType: "EDTA Whole Blood",
    tubeCapColor: "Lavender (EDTA)",
    tubeCapHex: "#8a2be2",
    requiredVolume: "2.0 mL",
    tatHours: 2,
    expiryHours: 2,
    price: 400,
    status: "ACTIVE",
    isOutsourced: false,
    outsourceLab: "In-house lab",
    testType: "In-house",
    description: "Complete hemogram covering cellular counts, red cell indices, platelet parameters, and full differential leukocytes (18 Parameters).",
    parameters: [
      { id: "LTP00001", name: "Hemoglobin", unit: "g/dL", valueType: "numeric", refRangeLow: 12, refRangeHigh: 17, refRangeText: "M 13–17; F 12–15 g/dL", criticalLow: 7, criticalHigh: 20, gender: "Both", sortOrder: 1 },
      { id: "LTP00003", name: "Total WBC count (TC)", unit: "cells/µL", valueType: "numeric", refRangeLow: 4000, refRangeHigh: 11000, refRangeText: "4000 - 11000", criticalLow: 2000, criticalHigh: 30000, gender: "Both", sortOrder: 2 },
      { id: "LTP00004", name: "RBC count", unit: "million/µL", valueType: "numeric", refRangeLow: 3.8, refRangeHigh: 5.5, refRangeText: "M 4.5–5.5; F 3.8–4.8 million/µL", gender: "Both", sortOrder: 3 },
      { id: "LTP00006", name: "PCV / HCT", unit: "%", valueType: "numeric", refRangeLow: 36, refRangeHigh: 50, refRangeText: "M 40–50; F 36–46 %", criticalLow: 20, criticalHigh: 60, gender: "Both", sortOrder: 4 },
      { id: "LTP00008", name: "MCV", unit: "fL", valueType: "numeric", refRangeLow: 83, refRangeHigh: 101, refRangeText: "83 - 101", gender: "Both", sortOrder: 5 },
      { id: "LTP00009", name: "MCH", unit: "pg", valueType: "numeric", refRangeLow: 27, refRangeHigh: 32, refRangeText: "27 - 32", gender: "Both", sortOrder: 6 },
      { id: "LTP00010", name: "MCHC", unit: "g/dL", valueType: "numeric", refRangeLow: 31.5, refRangeHigh: 34.5, refRangeText: "31.5 - 34.5", gender: "Both", sortOrder: 7 },
      { id: "LTP00011", name: "RDW-CV", unit: "%", valueType: "numeric", refRangeLow: 11.6, refRangeHigh: 14, refRangeText: "11.6 - 14", gender: "Both", sortOrder: 8 },
      { id: "LTP00012", name: "Platelet count", unit: "cells/µL", valueType: "numeric", refRangeLow: 150000, refRangeHigh: 410000, refRangeText: "150000 - 410000", criticalLow: 20000, criticalHigh: 1000000, gender: "Both", sortOrder: 9 },
      { id: "LTP00014", name: "MPV", unit: "fL", valueType: "numeric", refRangeLow: 7.5, refRangeHigh: 11.5, refRangeText: "7.5 - 11.5", gender: "Both", sortOrder: 10 },
      { id: "LTP00015", name: "Neutrophils", unit: "%", valueType: "numeric", refRangeLow: 40, refRangeHigh: 80, refRangeText: "40 - 80", gender: "Both", sortOrder: 11 },
      { id: "LTP00016", name: "Lymphocytes", unit: "%", valueType: "numeric", refRangeLow: 20, refRangeHigh: 40, refRangeText: "20 - 40", gender: "Both", sortOrder: 12 },
      { id: "LTP00017", name: "Eosinophils", unit: "%", valueType: "numeric", refRangeLow: 1, refRangeHigh: 6, refRangeText: "1 - 6", gender: "Both", sortOrder: 13 },
      { id: "LTP00018", name: "Monocytes", unit: "%", valueType: "numeric", refRangeLow: 2, refRangeHigh: 10, refRangeText: "2 - 10", gender: "Both", sortOrder: 14 },
      { id: "LTP00019", name: "Basophils", unit: "%", valueType: "numeric", refRangeLow: 0, refRangeHigh: 2, refRangeText: "0 - 2", gender: "Both", sortOrder: 15 },
      { id: "LTP00020", name: "Absolute Neutrophil Count (ANC)", unit: "cells/µL", valueType: "numeric", refRangeLow: 2000, refRangeHigh: 7000, refRangeText: "2000 - 7000", criticalLow: 500, gender: "Both", sortOrder: 16, remarks: "Chemo: ANC <1500 usually hold/delay (regimen-specific); <500 = severe neutropenia" },
      { id: "LTP00021", name: "Absolute Lymphocyte Count", unit: "cells/µL", valueType: "numeric", refRangeLow: 1000, refRangeHigh: 3000, refRangeText: "1000 - 3000", gender: "Both", sortOrder: 17 },
      { id: "LTP00022", name: "Absolute Eosinophil Count", unit: "cells/µL", valueType: "numeric", refRangeLow: 20, refRangeHigh: 500, refRangeText: "20 - 500", gender: "Both", sortOrder: 18 },
    ],
  },
  {
    id: "LT00783",
    testCode: "IH-009",
    testName: "Liver Function test",
    category: "Biochemistry",
    sampleType: "Serum",
    tubeCapColor: "Yellow (SST / Gel)",
    tubeCapHex: "#eab308",
    requiredVolume: "3.0 mL",
    tatHours: 4,
    expiryHours: 4,
    price: 700,
    status: "ACTIVE",
    isOutsourced: false,
    outsourceLab: "In-house lab",
    testType: "In-house",
    description: "Hepatic panel including bilirubin fractions, transaminases, alkaline phosphatase, total protein, albumin, and A/G ratio.",
    parameters: [
      { id: "LTP00038", name: "Total bilirubin", unit: "mg/dL", valueType: "numeric", refRangeLow: 0.3, refRangeHigh: 1.2, refRangeText: "0.3 - 1.2", criticalHigh: 15.0, gender: "Both", sortOrder: 1 },
      { id: "LTP00040", name: "Direct bilirubin", unit: "mg/dL", valueType: "numeric", refRangeLow: 0, refRangeHigh: 0.3, refRangeText: "0 - 0.3", criticalHigh: 5.0, gender: "Both", sortOrder: 2 },
      { id: "LTP00041", name: "Indirect bilirubin", unit: "mg/dL", valueType: "numeric", refRangeLow: 0.2, refRangeHigh: 0.8, refRangeText: "0.2 - 0.8", gender: "Both", sortOrder: 3 },
      { id: "LTP00042", name: "SGOT / AST", unit: "U/L", valueType: "numeric", refRangeLow: 5, refRangeHigh: 40, refRangeText: "5 - 40", criticalHigh: 400, gender: "Both", sortOrder: 4 },
      { id: "LTP00044", name: "SGPT / ALT", unit: "U/L", valueType: "numeric", refRangeLow: 5, refRangeHigh: 40, refRangeText: "5 - 40", criticalHigh: 400, gender: "Both", sortOrder: 5 },
      { id: "LTP00046", name: "Alkaline phosphatase (ALP)", unit: "U/L", valueType: "numeric", refRangeLow: 44, refRangeHigh: 147, refRangeText: "44 - 147", gender: "Both", sortOrder: 6 },
      { id: "LTP00048", name: "GGT", unit: "U/L", valueType: "numeric", refRangeLow: 6, refRangeHigh: 71, refRangeText: "M 10–71; F 6–42 U/L", gender: "Both", sortOrder: 7 },
      { id: "LTP00052", name: "Total protein", unit: "g/dL", valueType: "numeric", refRangeLow: 6.4, refRangeHigh: 8.3, refRangeText: "6.4 - 8.3", criticalLow: 4.5, gender: "Both", sortOrder: 8 },
      { id: "LTP00053", name: "Albumin", unit: "g/dL", valueType: "numeric", refRangeLow: 3.5, refRangeHigh: 5.2, refRangeText: "3.5 - 5.2", criticalLow: 2.0, gender: "Both", sortOrder: 9 },
      { id: "LTP00055", name: "Globulin", unit: "g/dL", valueType: "numeric", refRangeLow: 2, refRangeHigh: 3.5, refRangeText: "2 - 3.5", gender: "Both", sortOrder: 10 },
      { id: "LTP00056", name: "A/G ratio", unit: "ratio", valueType: "numeric", refRangeLow: 1.1, refRangeHigh: 2.2, refRangeText: "1.1 - 2.2", gender: "Both", sortOrder: 11 },
    ],
  },
  {
    id: "LT00782",
    testCode: "IH-008",
    testName: "Lipid profile",
    category: "Biochemistry",
    sampleType: "Serum",
    tubeCapColor: "Yellow (SST / Gel)",
    tubeCapHex: "#eab308",
    requiredVolume: "3.0 mL",
    tatHours: 4,
    expiryHours: 4,
    price: 550,
    status: "ACTIVE",
    isOutsourced: false,
    outsourceLab: "In-house lab",
    testType: "In-house",
    description: "Assessment of lipid risk markers: Cholesterol, Triglycerides, HDL, LDL, VLDL, Non-HDL, and Ratios.",
    parameters: [
      { id: "LTP00028", name: "Total cholesterol", unit: "mg/dL", valueType: "numeric", refRangeLow: 120, refRangeHigh: 200, refRangeText: "< 200", criticalHigh: 300, gender: "Both", sortOrder: 1 },
      { id: "LTP00029", name: "Triglycerides", unit: "mg/dL", valueType: "numeric", refRangeLow: 50, refRangeHigh: 150, refRangeText: "< 150", criticalHigh: 500, gender: "Both", sortOrder: 2 },
      { id: "LTP00030", name: "HDL cholesterol", unit: "mg/dL", valueType: "numeric", refRangeLow: 40, refRangeHigh: 60, refRangeText: "M >= 40; F >= 50 mg/dL", criticalLow: 25, gender: "Both", sortOrder: 3 },
      { id: "LTP00031", name: "LDL cholesterol", unit: "mg/dL", valueType: "numeric", refRangeLow: 60, refRangeHigh: 100, refRangeText: "< 100", criticalHigh: 190, gender: "Both", sortOrder: 4 },
      { id: "LTP00032", name: "VLDL cholesterol", unit: "mg/dL", valueType: "numeric", refRangeLow: 5, refRangeHigh: 40, refRangeText: "5 - 40", gender: "Both", sortOrder: 5 },
      { id: "LTP00033", name: "Non-HDL cholesterol", unit: "mg/dL", valueType: "numeric", refRangeLow: 80, refRangeHigh: 130, refRangeText: "< 130", gender: "Both", sortOrder: 6 },
      { id: "LTP00034", name: "TC/HDL ratio", unit: "ratio", valueType: "numeric", refRangeLow: 2.5, refRangeHigh: 5.0, refRangeText: "< 5", gender: "Both", sortOrder: 7 },
      { id: "LTP00035", name: "LDL/HDL ratio", unit: "ratio", valueType: "numeric", refRangeLow: 1.0, refRangeHigh: 3.5, refRangeText: "< 3.5", gender: "Both", sortOrder: 8 },
    ],
  },
  {
    id: "LT-DDC-0745",
    testCode: "DDC-0745",
    testName: "Urine Routine Analysis",
    category: "Urine, Stool & Body Fluids",
    sampleType: "Random Urine",
    tubeCapColor: "Sterile Container",
    tubeCapHex: "#0ea5e9",
    requiredVolume: "20.0 mL",
    tatHours: 1,
    expiryHours: 2,
    price: 150,
    status: "ACTIVE",
    isOutsourced: true,
    outsourceLab: "DDC",
    testType: "Outsourced",
    description: "Complete urinalysis: physical inspection, chemical reagent strips, and microscopic cellular analysis (18 Parameters).",
    parameters: [
      { id: "LTP00148", name: "Colour", unit: "", valueType: "qualitative", refRangeText: "Pale yellow / Straw", gender: "Both", sortOrder: 1 },
      { id: "LTP00149", name: "Appearance / Transparency", unit: "", valueType: "qualitative", refRangeText: "Clear", gender: "Both", sortOrder: 2 },
      { id: "LTP00150", name: "Specific gravity", unit: "SG", valueType: "numeric", refRangeLow: 1.005, refRangeHigh: 1.03, refRangeText: "1.005 - 1.03", gender: "Both", sortOrder: 3 },
      { id: "LTP00151", name: "pH", unit: "pH", valueType: "numeric", refRangeLow: 4.6, refRangeHigh: 8.0, refRangeText: "4.6 - 8.0", gender: "Both", sortOrder: 4 },
      { id: "LTP00152", name: "Protein (albumin)", unit: "", valueType: "qualitative", refRangeText: "Negative", criticalHigh: 1, gender: "Both", sortOrder: 5 },
      { id: "LTP00153", name: "Glucose (sugar)", unit: "", valueType: "qualitative", refRangeText: "Negative", gender: "Both", sortOrder: 6 },
      { id: "LTP00154", name: "Ketone", unit: "", valueType: "qualitative", refRangeText: "Negative", gender: "Both", sortOrder: 7 },
      { id: "LTP00155", name: "Blood", unit: "", valueType: "qualitative", refRangeText: "Negative", gender: "Both", sortOrder: 8 },
      { id: "LTP00156", name: "Bile salts / Bile pigments", unit: "", valueType: "qualitative", refRangeText: "Negative", gender: "Both", sortOrder: 9 },
      { id: "LTP00157", name: "Urobilinogen", unit: "", valueType: "qualitative", refRangeText: "Normal", gender: "Both", sortOrder: 10 },
      { id: "LTP00158", name: "Nitrite", unit: "", valueType: "qualitative", refRangeText: "Negative", gender: "Both", sortOrder: 11 },
      { id: "LTP00159", name: "Leucocyte esterase", unit: "", valueType: "qualitative", refRangeText: "Negative", gender: "Both", sortOrder: 12 },
      { id: "LTP00160", name: "Pus cells", unit: "/HPF", valueType: "numeric", refRangeLow: 0, refRangeHigh: 5, refRangeText: "0 - 5", criticalHigh: 25, gender: "Both", sortOrder: 13 },
      { id: "LTP00161", name: "RBCs", unit: "/HPF", valueType: "numeric", refRangeLow: 0, refRangeHigh: 2, refRangeText: "0 - 2", criticalHigh: 10, gender: "Both", sortOrder: 14 },
      { id: "LTP00162", name: "Epithelial cells", unit: "/HPF", valueType: "numeric", refRangeLow: 0, refRangeHigh: 5, refRangeText: "0 - 5", gender: "Both", sortOrder: 15 },
      { id: "LTP00163", name: "Casts", unit: "/LPF", valueType: "qualitative", refRangeText: "Nil / Absent", gender: "Both", sortOrder: 16 },
      { id: "LTP00164", name: "Crystals", unit: "/HPF", valueType: "qualitative", refRangeText: "Nil / Absent", gender: "Both", sortOrder: 17 },
      { id: "LTP00165", name: "Bacteria / Yeast", unit: "", valueType: "qualitative", refRangeText: "Absent", gender: "Both", sortOrder: 18 },
    ],
  },
  {
    id: "LT-DDC-0669",
    testCode: "DDC-0669",
    testName: "Thyroid Function Test - TFT (tT3,tT4,TSH)",
    category: "Hormones & Endocrinology",
    sampleType: "Serum",
    tubeCapColor: "Yellow (SST / Gel)",
    tubeCapHex: "#eab308",
    requiredVolume: "3.0 mL",
    tatHours: 4,
    expiryHours: 6,
    price: 450,
    status: "ACTIVE",
    isOutsourced: true,
    outsourceLab: "DDC",
    testType: "Outsourced",
    description: "Evaluates thyroid hormone homeostasis (Total T3, Total T4, Free T3, Free T4, and TSH).",
    parameters: [
      { id: "LTP00060", name: "Total T3", unit: "ng/dL", valueType: "numeric", refRangeLow: 80, refRangeHigh: 200, refRangeText: "80 - 200", gender: "Both", sortOrder: 1 },
      { id: "LTP00061", name: "Total T4", unit: "µg/dL", valueType: "numeric", refRangeLow: 5.1, refRangeHigh: 14.1, refRangeText: "5.1 - 14.1", gender: "Both", sortOrder: 2 },
      { id: "LTP00062", name: "TSH", unit: "µIU/mL", valueType: "numeric", refRangeLow: 0.35, refRangeHigh: 4.94, refRangeText: "0.35 - 4.94", criticalLow: 0.05, criticalHigh: 25.0, gender: "Both", sortOrder: 3 },
      { id: "LTP00063", name: "Free T3", unit: "pg/mL", valueType: "numeric", refRangeLow: 2.0, refRangeHigh: 4.4, refRangeText: "2.0 - 4.4", gender: "Both", sortOrder: 4 },
      { id: "LTP00064", name: "Free T4", unit: "ng/dL", valueType: "numeric", refRangeLow: 0.93, refRangeHigh: 1.7, refRangeText: "0.93 - 1.7", gender: "Both", sortOrder: 5 },
    ],
  },
  {
    id: "LT00778",
    testCode: "IH-004",
    testName: "Electrolytes",
    category: "Biochemistry",
    sampleType: "Serum",
    tubeCapColor: "Plain Red (No Additive)",
    tubeCapHex: "#dc2626",
    requiredVolume: "2.0 mL",
    tatHours: 1,
    expiryHours: 2,
    price: 350,
    status: "ACTIVE",
    isOutsourced: false,
    outsourceLab: "In-house lab",
    testType: "In-house",
    description: "Serum electrolytes: Sodium, Potassium, Chloride, and Bicarbonate.",
    parameters: [
      { id: "LTP00024", name: "Sodium", unit: "mmol/L", valueType: "numeric", refRangeLow: 135, refRangeHigh: 145, refRangeText: "135 - 145", criticalLow: 120, criticalHigh: 160, gender: "Both", sortOrder: 1 },
      { id: "LTP00025", name: "Potassium", unit: "mmol/L", valueType: "numeric", refRangeLow: 3.5, refRangeHigh: 5.0, refRangeText: "3.5 - 5", criticalLow: 2.8, criticalHigh: 6.2, gender: "Both", sortOrder: 2 },
      { id: "LTP00026", name: "Chloride", unit: "mmol/L", valueType: "numeric", refRangeLow: 98, refRangeHigh: 107, refRangeText: "98 - 107", gender: "Both", sortOrder: 3 },
      { id: "LTP00027", name: "Bicarbonate", unit: "mmol/L", valueType: "numeric", refRangeLow: 22, refRangeHigh: 29, refRangeText: "22 - 29", criticalLow: 10, criticalHigh: 40, gender: "Both", sortOrder: 4 },
    ],
  },
];

export function mapBackendToMasterTest(b: any): MasterTest {
  const sampleLower = (b.sample_type || "").toLowerCase();
  const matchedTube = TUBE_CAP_OPTIONS.find((tc) =>
    sampleLower.includes(tc.sampleType.toLowerCase()) ||
    tc.name.toLowerCase().includes(sampleLower)
  );
  const isBloodOrEdta = sampleLower.includes("edta") || sampleLower.includes("w.blood") || sampleLower.includes("blood");
  const isCitrate = sampleLower.includes("citrate");
  const isUrine = sampleLower.includes("urine");
  const isSerum = sampleLower.includes("serum") || sampleLower.includes("clt");

  const tubeCap = matchedTube
    ? matchedTube
    : isBloodOrEdta
    ? { name: "Lavender (EDTA)", hex: "#8a2be2" }
    : isCitrate
    ? { name: "Light Blue (Sodium Citrate)", hex: "#0284c7" }
    : isUrine
    ? { name: "Sterile Container", hex: "#0ea5e9" }
    : isSerum
    ? { name: "Yellow (SST / Gel)", hex: "#eab308" }
    : { name: "Plain Red (No Additive)", hex: "#dc2626" };

  const params: MasterParameter[] = (b.lab_test_parameter || []).map((p: any, idx: number) => ({
    id: p.lab_test_parameter_id || `param-${b.lab_test_id}-${idx}`,
    name: p.parameter_name,
    unit: p.unit || "",
    valueType: p.value_type === "NUMBER" || (!p.ref_range_text && p.ref_range_low !== null) ? "numeric" : "qualitative",
    refRangeLow: p.ref_range_low !== null && p.ref_range_low !== undefined ? Number(p.ref_range_low) : undefined,
    refRangeHigh: p.ref_range_high !== null && p.ref_range_high !== undefined ? Number(p.ref_range_high) : undefined,
    refRangeText: p.ref_range_text || (p.ref_range_low != null && p.ref_range_high != null ? `${p.ref_range_low} - ${p.ref_range_high} ${p.unit || ""}`.trim() : "-"),
    criticalLow: p.critical_low !== null && p.critical_low !== undefined ? Number(p.critical_low) : undefined,
    criticalHigh: p.critical_high !== null && p.critical_high !== undefined ? Number(p.critical_high) : undefined,
    gender: p.gender === "All" || !p.gender ? "Both" : p.gender,
    sortOrder: p.sort_order || idx + 1,
    remarks: p.remarks,
  }));

  const isOutsourced = b.is_outsourced ?? false;
  const outsourceLab = b.outsource_lab || (isOutsourced ? "Outsourced Partner" : "In-house lab");
  const testType: "In-house" | "Outsourced" = isOutsourced ? "Outsourced" : "In-house";

  return {
    id: b.lab_test_id,
    testCode: (b.test_code || b.lab_test_id).replace(/-COPY/gi, ""),
    testName: (b.test_name || "").replace(/\s*\(Copy\)/gi, ""),
    category: b.lab_test_category?.category_name || "General Diagnostics",
    sampleType: b.sample_type || (isUrine ? "Urine" : "Whole Blood"),
    tubeCapColor: tubeCap.name,
    tubeCapHex: tubeCap.hex,
    requiredVolume: b.required_volume || (isUrine ? "20 mL" : "2.0 mL"),
    tatHours: b.tat_hours || 2,
    tatText: b.tat_text || `${b.tat_hours || 2}h`,
    expiryHours: Number(b.expiry_time_hours) || 2.0,
    price: Number(b.price || b.walkin_price || 350),
    status: b.test_status === 0 ? "INACTIVE" : "ACTIVE",
    description: b.includes_details || (b.is_panel ? `${b.test_name} comprehensive profile with ${params.length} parameters.` : `${b.test_name} diagnostic test profile.`),
    parameters: params,
    isOutsourced,
    outsourceLab,
    testType,
    resultType: b.result_type || (params.length > 1 ? "Panel" : "Numeric"),
  };
}

export default function LabMaster() {
  const navigate = useNavigate();
  const currentUser = getUser();
  const displayName = currentUser?.username || "Labtech";
  const displayRole =
    currentUser?.role_type === "LAB_TECHNICIAN"
      ? "Lab Technician"
      : currentUser?.role_type || "Lab In-Charge";

  const handleLogout = () => {
    remove();
    navigate("/", { replace: true });
  };

  // Master Test State
  const [tests, setTests] = useState<MasterTest[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("hms_lab_master_tests");
        if (stored) {
          const parsed: MasterTest[] = JSON.parse(stored);
          const hasInvalidCodes = parsed.some(
            (t) =>
              t.testCode.startsWith("INH-") ||
              t.testCode.startsWith("NEW-") ||
              t.testCode === "TEST-4491" ||
              t.testCode === "HEM-CBC-01"
          );
          if (!hasInvalidCodes && parsed.length === 839) {
            return parsed.map((t) => ({
              ...t,
              testCode: (t.testCode || "").replace(/-COPY/gi, ""),
              testName: (t.testName || "").replace(/\s*\(Copy\)/gi, ""),
            }));
          }
        }
      } catch (e) {
        console.error("Error reading stored lab master tests:", e);
      }
    }
    return PREPOPULATED_MASTER_TESTS;
  });

  const [expandedTestIds, setExpandedTestIds] = useState<Set<string>>(
    new Set(["LT00787", "IH-013"])
  );

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [scopeFilter, setScopeFilter] = useState<"ALL" | "WITH_PARAMS">("ALL");
  const [classificationFilter, setClassificationFilter] = useState<"ALL" | "IN_HOUSE" | "OUTSOURCED">("ALL");
  const [selectedLab, setSelectedLab] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingTest, setIsSavingTest] = useState(false);

  // Drawer (Sheet) State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);

  // Form State inside Drawer
  const [formTestCode, setFormTestCode] = useState("");
  const [formTestName, setFormTestName] = useState("");
  const [formCategory, setFormCategory] = useState("Haematology");
  const [formSampleType, setFormSampleType] = useState("EDTA Whole Blood");
  const [formTubeCap, setFormTubeCap] = useState("Lavender (EDTA)");
  const [formRequiredVolume, setFormRequiredVolume] = useState("2.0 mL");
  const [formTatHours, setFormTatHours] = useState<number>(2);
  const [formExpiryHours, setFormExpiryHours] = useState<number>(2);
  const [formPrice, setFormPrice] = useState<number>(400);
  const [formStatus, setFormStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [formDescription, setFormDescription] = useState("");
  const [formIsOutsourced, setFormIsOutsourced] = useState<boolean>(false);
  const [formOutsourceLab, setFormOutsourceLab] = useState<string>("In-house lab");
  const [formParameters, setFormParameters] = useState<MasterParameter[]>([]);

  // Add Package Modal State
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [packageFormName, setPackageFormName] = useState("");
  const [packageFormCode, setPackageFormCode] = useState("");
  const [packageFormCategory, setPackageFormCategory] = useState("Health Package");
  const [packageFormDescription, setPackageFormDescription] = useState("");
  const [packageFormPrice, setPackageFormPrice] = useState<number | "">("");
  const [packageFormTatHours, setPackageFormTatHours] = useState<number>(4);
  const [packageFormExpiryHours, setPackageFormExpiryHours] = useState<number>(2);
  const [packageFormIsOutsourced, setPackageFormIsOutsourced] = useState<boolean>(false);
  const [packageFormOutsourceLab, setPackageFormOutsourceLab] = useState<string>("In-house lab");
  const [selectedTestIds, setSelectedTestIds] = useState<Set<string>>(new Set());
  const [packageSearchQuery, setPackageSearchQuery] = useState("");
  const [packageCategoryFilter, setPackageCategoryFilter] = useState("ALL");
  const [isSavingPackage, setIsSavingPackage] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("hms_lab_master_tests", JSON.stringify(tests));
      } catch (e) {
        console.error("Failed to save lab master tests to storage:", e);
      }
    }
  }, [tests]);

  // Load from backend database
  useEffect(() => {
    let isMounted = true;
    async function fetchBackendTests() {
      setIsLoading(true);
      try {
        const res = await labTestMasterApi.getAll();
        if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          const backendList = res.data.data;
          const mappedList: MasterTest[] = backendList.map(mapBackendToMasterTest);

          // Prioritize tests with configured parameters at the top (CBC, Urinalysis, LFT, RFT, Lipid, etc.)
          mappedList.sort((a, b) => {
            if (a.parameters.length > 0 && b.parameters.length === 0) return -1;
            if (a.parameters.length === 0 && b.parameters.length > 0) return 1;
            if (a.parameters.length !== b.parameters.length) return b.parameters.length - a.parameters.length;
            return a.testName.localeCompare(b.testName);
          });

          if (isMounted) {
            setTests(mappedList);
            // Default expand Complete Blood Count (18 params)
            const cbc = mappedList.find(
              (t) => t.testCode === "IH-013" || t.testCode === "INH-013" || t.testName.toLowerCase().includes("complete blood count")
            );
            if (cbc) {
              setExpandedTestIds(new Set([cbc.id]));
            }
          }
        }
      } catch (err) {
        console.warn("Could not fetch database lab master tests, using database fallback catalog:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    fetchBackendTests();
    return () => { isMounted = false; };
  }, []);

  // Dynamic available categories from loaded database tests
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    tests.forEach((t) => {
      if (t.category && t.category.trim()) cats.add(t.category.trim());
    });
    return Array.from(cats).sort();
  }, [tests]);

  // Dynamic available partner labs from loaded database tests
  const availableLabs = useMemo(() => {
    const labs = new Set<string>();
    tests.forEach((t) => {
      if (t.outsourceLab && t.outsourceLab.trim()) labs.add(t.outsourceLab.trim());
    });
    return Array.from(labs).sort();
  }, [tests]);

  // Filtered Tests
  const filteredTests = useMemo(() => {
    return tests.filter((t) => {
      if (scopeFilter === "WITH_PARAMS" && t.parameters.length === 0) {
        return false;
      }

      if (classificationFilter === "IN_HOUSE" && t.isOutsourced) {
        return false;
      }
      if (classificationFilter === "OUTSOURCED" && !t.isOutsourced) {
        return false;
      }

      if (selectedLab !== "ALL" && (t.outsourceLab || "").toLowerCase() !== selectedLab.toLowerCase()) {
        return false;
      }

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.testName.toLowerCase().includes(q) ||
        t.testCode.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.outsourceLab && t.outsourceLab.toLowerCase().includes(q)) ||
        (t.isOutsourced ? "outsourced partner reference external" : "inhouse in-house hospital local").includes(q) ||
        t.parameters.some((p) => p.name.toLowerCase().includes(q));

      const matchesCat =
        selectedCategory === "ALL" ||
        t.category.toLowerCase() === selectedCategory.toLowerCase();

      const matchesStatus =
        selectedStatus === "ALL" || t.status === selectedStatus;

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [tests, searchQuery, selectedCategory, selectedStatus, scopeFilter, classificationFilter, selectedLab]);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalTests = tests.length;
    const inhouseCount = tests.filter((t) => !t.isOutsourced).length;
    const outsourcedCount = tests.filter((t) => t.isOutsourced).length;
    const packageCount = tests.filter((t) => isPackageTest(t.testName, t.testCode, t.description)).length;
    const testsWithParams = tests.filter((t) => t.parameters.length > 0).length;
    const totalParams = tests.reduce((acc, t) => acc + t.parameters.length, 0);
    const activeTests = tests.filter((t) => t.status === "ACTIVE").length;
    const categoriesCount = new Set(tests.map((t) => t.category)).size;
    const criticalParamsCount = tests.reduce(
      (acc, t) =>
        acc +
        t.parameters.filter(
          (p) => p.criticalLow !== undefined || p.criticalHigh !== undefined
        ).length,
      0
    );

    return {
      totalTests,
      inhouseCount,
      outsourcedCount,
      packageCount,
      testsWithParams,
      totalParams,
      activeTests,
      categoriesCount,
      criticalParamsCount,
    };
  }, [tests]);

  // Toggle Table Row Expansion
  const toggleRowExpansion = (testId: string) => {
    setExpandedTestIds((prev) => {
      const next = new Set(prev);
      if (next.has(testId)) {
        next.delete(testId);
      } else {
        next.add(testId);
      }
      return next;
    });
  };

  // Open Drawer in "Create" Mode
  const handleOpenCreateDrawer = () => {
    const newCode = `TEST-${Math.floor(1000 + Math.random() * 9000)}`;
    setEditingTestId(null);
    setFormTestCode(newCode);
    setFormTestName("");
    setFormCategory("Hematology");
    setFormSampleType("Whole Blood");
    setFormTubeCap("Lavender (EDTA)");
    setFormRequiredVolume("2.0 mL");
    setFormTatHours(2);
    setFormExpiryHours(2);
    setFormPrice(400);
    setFormStatus("ACTIVE");
    setFormDescription("");
    setFormIsOutsourced(false);
    setFormOutsourceLab("In-house lab");
    setFormParameters([
      {
        id: `p-${Date.now()}-1`,
        name: "",
        unit: "g/dL",
        valueType: "numeric",
        refRangeLow: 0,
        refRangeHigh: 10,
        refRangeText: "0 - 10",
        gender: "Both",
        sortOrder: 1,
      },
    ]);
    setIsDrawerOpen(true);
  };

  // Open Drawer in "Edit" Mode
  const handleOpenEditDrawer = (test: MasterTest) => {
    setEditingTestId(test.id);
    setFormTestCode(test.testCode);
    setFormTestName(test.testName);
    setFormCategory(test.category);
    setFormSampleType(test.sampleType);
    setFormTubeCap(test.tubeCapColor);
    setFormRequiredVolume(test.requiredVolume);
    setFormTatHours(test.tatHours);
    setFormExpiryHours(test.expiryHours || 2);
    setFormPrice(test.price);
    setFormStatus(test.status);
    setFormDescription(test.description || "");
    setFormIsOutsourced(test.isOutsourced ?? false);
    setFormOutsourceLab(test.outsourceLab || (test.isOutsourced ? "DDC" : "In-house lab"));
    setFormParameters(
      test.parameters.map((p) => ({ ...p }))
    );
    setIsDrawerOpen(true);
  };

  // Open Create Package Modal
  const handleOpenCreatePackageModal = () => {
    const randomNum = Math.floor(100 + Math.random() * 900);
    setPackageFormCode(`PKG-${randomNum}`);
    setPackageFormName("");
    setPackageFormCategory("Health Package");
    setPackageFormDescription("");
    setPackageFormPrice("");
    setPackageFormTatHours(4);
    setPackageFormExpiryHours(2);
    setPackageFormIsOutsourced(false);
    setPackageFormOutsourceLab("In-house lab");
    setSelectedTestIds(new Set());
    setPackageSearchQuery("");
    setPackageCategoryFilter("ALL");
    setIsPackageModalOpen(true);
  };

  // Toggle Test Selection for Package Builder
  const handleToggleSelectTest = (testId: string) => {
    setSelectedTestIds((prev) => {
      const next = new Set(prev);
      if (next.has(testId)) {
        next.delete(testId);
      } else {
        next.add(testId);
      }

      // Auto update suggested price and TAT
      const selected = tests.filter((t) => next.has(t.id));
      if (selected.length > 0) {
        const sumPrice = selected.reduce((acc, t) => acc + (t.price || 0), 0);
        // Default 15% package discount rounded to nearest 50
        const discounted = Math.round((sumPrice * 0.85) / 50) * 50;
        setPackageFormPrice(discounted > 0 ? discounted : sumPrice);

        const maxTat = Math.max(...selected.map((t) => t.tatHours || 2));
        setPackageFormTatHours(maxTat);

        const minExpiry = Math.min(...selected.map((t) => t.expiryHours || 2));
        setPackageFormExpiryHours(minExpiry);
      } else {
        setPackageFormPrice("");
      }

      return next;
    });
  };

  // Save Package to Database
  const handleSavePackage = async () => {
    if (!packageFormName.trim()) {
      toast({
        title: "Package Name Required",
        description: "Please enter a descriptive name for the diagnostic package.",
        variant: "destructive",
      });
      return;
    }

    if (selectedTestIds.size < 2) {
      toast({
        title: "At Least 2 Tests Required",
        description: "A package must bundle at least 2 existing tests from the master catalog.",
        variant: "destructive",
      });
      return;
    }

    const selectedTests = tests.filter((t) => selectedTestIds.has(t.id));

    // Combine all parameters sequentially
    const bundledParameters: any[] = [];
    let sortCounter = 1;
    selectedTests.forEach((t) => {
      t.parameters.forEach((p) => {
        bundledParameters.push({
          parameter_name: p.name.trim(),
          unit: p.unit || "",
          value_type: p.valueType === "qualitative" ? "TEXT" : "NUMBER",
          ref_range_low: p.refRangeLow !== undefined && p.refRangeLow !== null ? Number(p.refRangeLow) : null,
          ref_range_high: p.refRangeHigh !== undefined && p.refRangeHigh !== null ? Number(p.refRangeHigh) : null,
          ref_range_text: p.refRangeText || (p.refRangeLow != null && p.refRangeHigh != null ? `${p.refRangeLow} - ${p.refRangeHigh} ${p.unit || ""}`.trim() : "-"),
          critical_low: p.criticalLow !== undefined && p.criticalLow !== null ? Number(p.criticalLow) : null,
          critical_high: p.criticalHigh !== undefined && p.criticalHigh !== null ? Number(p.criticalHigh) : null,
          gender: p.gender || "Both",
          remarks: p.remarks || `Sub-test: ${t.testName}`,
          sort_order: sortCounter++,
        });
      });
    });

    const uniqueSampleTypes = Array.from(new Set(selectedTests.map((t) => t.sampleType))).join(" + ");
    const includesStr = `Includes: ${selectedTests.map((t) => t.testName).join(", ")}`;

    const apiPayload = {
      test_code: (packageFormCode.trim() || `PKG-${Date.now().toString().slice(-4)}`).toUpperCase(),
      test_name: packageFormName.trim(),
      category_name: packageFormCategory,
      sample_type: uniqueSampleTypes || "Multi-Specimen Panel",
      required_volume: "As per sub-test collection tubes",
      tat_hours: Number(packageFormTatHours) || 4,
      expiry_time_hours: Number(packageFormExpiryHours) || 2,
      price: Number(packageFormPrice) || selectedTests.reduce((sum, t) => sum + (t.price || 0), 0),
      test_status: 1,
      includes_details: includesStr,
      is_panel: true,
      is_outsourced: packageFormIsOutsourced,
      outsource_lab: packageFormIsOutsourced ? packageFormOutsourceLab.trim() : "In-house lab",
      parameters: bundledParameters,
    };

    setIsSavingPackage(true);

    try {
      const res = await labTestMasterApi.create(apiPayload);
      const savedRecord = res.data.data;
      const savedMasterTest = mapBackendToMasterTest(savedRecord);

      setTests((prev) => [savedMasterTest, ...prev]);
      setExpandedTestIds(new Set([savedMasterTest.id]));
      setIsPackageModalOpen(false);

      toast({
        title: "Package Created Successfully",
        description: `Created "${packageFormName}" with ${selectedTests.length} sub-tests and ${bundledParameters.length} parameters.`,
      });
    } catch (err: any) {
      console.error("Error creating diagnostic package:", err);
      toast({
        title: "Failed to Create Package",
        description: err?.response?.data?.message || err.message || "Could not persist package to database.",
        variant: "destructive",
      });
    } finally {
      setIsSavingPackage(false);
    }
  };



  // Toggle Test Status
  const handleToggleStatus = async (testId: string) => {
    const current = tests.find((t) => t.id === testId);
    if (!current) return;
    const nextStatus = current.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    // Optimistic UI update
    setTests((prev) =>
      prev.map((t) =>
        t.id === testId ? { ...t, status: nextStatus } : t
      )
    );
    try {
      await labTestMasterApi.update(testId, {
        test_status: nextStatus === "ACTIVE" ? 1 : 0,
      });
      toast({
        title: "Test Status Updated",
        description: `Set status of "${current.testName}" to ${nextStatus}.`,
      });
    } catch (err: any) {
      console.warn("Could not persist status update to backend:", err);
    }
  };

  // Delete Test
  const handleDeleteTest = async (testId: string, testName: string) => {
    if (confirm(`Are you sure you want to remove "${testName}" from the diagnostic master?`)) {
      try {
        await labTestMasterApi.delete(testId);
        setTests((prev) => prev.filter((t) => t.id !== testId));
        toast({
          title: "Test Removed",
          description: `Removed "${testName}" from diagnostic master in database.`,
        });
      } catch (err: any) {
        console.warn("Could not delete from backend:", err);
        const errMsg = err?.response?.data?.message || "";
        if (errMsg.includes("foreign key") || errMsg.includes("constraint") || errMsg.includes("order")) {
          toast({
            title: "Cannot Delete Test",
            description: `"${testName}" is associated with existing lab records. Setting to INACTIVE instead.`,
            variant: "destructive",
          });
          handleToggleStatus(testId);
        } else {
          setTests((prev) => prev.filter((t) => t.id !== testId));
          toast({
            title: "Test Removed",
            description: `Removed "${testName}" from view.`,
          });
        }
      }
    }
  };

  // Parameter Builder actions inside Drawer
  const handleAddParameterRow = () => {
    const newParam: MasterParameter = {
      id: `p-${Date.now()}-${Math.random()}`,
      name: "",
      unit: "mg/dL",
      valueType: "numeric",
      refRangeLow: 0,
      refRangeHigh: 100,
      refRangeText: "",
      gender: "Both",
      sortOrder: formParameters.length + 1,
    };
    setFormParameters((prev) => [...prev, newParam]);
  };

  const handleUpdateParameterField = (
    paramId: string,
    field: keyof MasterParameter,
    value: any
  ) => {
    setFormParameters((prev) =>
      prev.map((p) => (p.id === paramId ? { ...p, [field]: value } : p))
    );
  };

  const handleRemoveParameterRow = (paramId: string) => {
    if (formParameters.length === 1) {
      toast({
        title: "Minimum Parameter Required",
        description: "A diagnostic test must have at least one diagnostic parameter.",
        variant: "destructive",
      });
      return;
    }
    setFormParameters((prev) => prev.filter((p) => p.id !== paramId));
  };

  // Save Test from Drawer to PostgreSQL Database
  const handleSaveTest = async () => {
    if (!formTestName.trim()) {
      toast({
        title: "Test Name Required",
        description: "Please enter a valid test name.",
        variant: "destructive",
      });
      return;
    }
    if (!formTestCode.trim()) {
      toast({
        title: "Test Code Required",
        description: "Please enter a test code (e.g., HEM-CBC-01).",
        variant: "destructive",
      });
      return;
    }

    const validParameters = formParameters.filter((p) => p.name.trim().length > 0);
    if (validParameters.length === 0) {
      toast({
        title: "Parameters Required",
        description: "Please define at least one valid parameter name with its reference range.",
        variant: "destructive",
      });
      return;
    }

    const matchedCap = TUBE_CAP_OPTIONS.find((t) => t.name === formTubeCap);

    setIsSavingTest(true);

    const apiParameters = validParameters.map((p, idx) => ({
      lab_test_parameter_id: p.id && !p.id.startsWith("param-") && !p.id.startsWith("p-") ? p.id : undefined,
      parameter_name: p.name.trim(),
      unit: p.unit || "",
      value_type: p.valueType === "qualitative" ? "TEXT" : "NUMBER",
      ref_range_low: p.refRangeLow !== undefined && p.refRangeLow !== null && p.refRangeLow !== ("" as any) ? Number(p.refRangeLow) : null,
      ref_range_high: p.refRangeHigh !== undefined && p.refRangeHigh !== null && p.refRangeHigh !== ("" as any) ? Number(p.refRangeHigh) : null,
      ref_range_text:
        p.refRangeText ||
        (p.valueType === "numeric" && p.refRangeLow !== undefined && p.refRangeHigh !== undefined
          ? `${p.refRangeLow} - ${p.refRangeHigh} ${p.unit || ""}`.trim()
          : "-"),
      critical_low: p.criticalLow !== undefined && p.criticalLow !== null && p.criticalLow !== ("" as any) ? Number(p.criticalLow) : null,
      critical_high: p.criticalHigh !== undefined && p.criticalHigh !== null && p.criticalHigh !== ("" as any) ? Number(p.criticalHigh) : null,
      gender: p.gender === "Both" || !p.gender ? "All" : p.gender,
      remarks: p.remarks || null,
      sort_order: idx + 1,
    }));

    const apiPayload = {
      test_code: formTestCode.trim().toUpperCase(),
      test_name: formTestName.trim(),
      category_name: formCategory,
      sample_type: formSampleType,
      required_volume: formRequiredVolume,
      tat_hours: Number(formTatHours) || 2,
      expiry_time_hours: Number(formExpiryHours) || 2,
      price: Number(formPrice) || 300,
      test_status: formStatus === "ACTIVE" ? 1 : 0,
      includes_details: formDescription,
      is_panel: validParameters.length > 1,
      is_outsourced: formIsOutsourced,
      outsource_lab: formIsOutsourced ? formOutsourceLab.trim() : "In-house lab",
      parameters: apiParameters,
    };

    try {
      let savedRecord: LabTestMasterRecord;
      if (editingTestId) {
        const res = await labTestMasterApi.update(editingTestId, apiPayload);
        savedRecord = res.data.data;
      } else {
        const res = await labTestMasterApi.create(apiPayload);
        savedRecord = res.data.data;
      }

      const savedMasterTest = mapBackendToMasterTest(savedRecord);

      if (editingTestId) {
        setTests((prev) =>
          prev.map((t) => (t.id === editingTestId ? savedMasterTest : t))
        );
        toast({
          title: "Diagnostic Test Updated",
          description: `Updated "${savedMasterTest.testName}" with ${savedMasterTest.parameters.length} parameters in database.`,
        });
      } else {
        setTests((prev) => [savedMasterTest, ...prev]);
        toast({
          title: "New Test Created",
          description: `Added "${savedMasterTest.testName}" with ${savedMasterTest.parameters.length} parameters to database.`,
        });
      }

      setExpandedTestIds((prev) => new Set(prev).add(savedMasterTest.id));
      setIsDrawerOpen(false);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("lab_master_updated", { detail: savedMasterTest }));
      }
    } catch (err: any) {
      console.error("Failed to save lab master to database:", err);
      const errMsg = err?.response?.data?.message || err?.message || "Failed to save test to database";
      toast({
        title: "Save Failed",
        description: errMsg,
        variant: "destructive",
      });
    } finally {
      setIsSavingTest(false);
    }
  };

  // Export Catalog as Excel (.xlsx) Form
  const handleExportCatalog = () => {
    try {
      // 1. Detailed Master Parameters Sheet
      const parameterRows: any[] = [];
      tests.forEach((t) => {
        const cleanCode = (t.testCode || "").replace(/-COPY/gi, "");
        const cleanName = (t.testName || "").replace(/\s*\(Copy\)/gi, "");

        if (!t.parameters || t.parameters.length === 0) {
          parameterRows.push({
            "Test Code": cleanCode,
            "Classification": t.testType || (t.isOutsourced ? "Outsourced" : "In-house"),
            "Laboratory / Partner": t.outsourceLab || (t.isOutsourced ? "Outsourced Partner" : "In-house lab"),
            "Test Profile Name": cleanName,
            "Department": t.category,
            "Specimen Type": t.sampleType,
            "Container / Tube": t.tubeCapColor,
            "Required Volume": t.requiredVolume,
            "Param #": "-",
            "Parameter Name": "-",
            "Unit": "-",
            "Value Type": "-",
            "Reference Range (Low)": "-",
            "Reference Range (High)": "-",
            "Reference Range / Text": "-",
            "Critical Panic (Low)": "-",
            "Critical Panic (High)": "-",
            "Target Gender": "-",
            "TAT (Hours)": t.tatHours,
            "Sample Stability (Hours)": t.expiryHours || 2.0,
            "Price (INR)": t.price,
            "Status": t.status,
            "Description": t.description || "",
          });
        } else {
          t.parameters.forEach((p, idx) => {
            parameterRows.push({
              "Test Code": cleanCode,
              "Classification": t.testType || (t.isOutsourced ? "Outsourced" : "In-house"),
              "Laboratory / Partner": t.outsourceLab || (t.isOutsourced ? "Outsourced Partner" : "In-house lab"),
              "Test Profile Name": cleanName,
              "Department": t.category,
              "Specimen Type": t.sampleType,
              "Container / Tube": t.tubeCapColor,
              "Required Volume": t.requiredVolume,
              "Param #": idx + 1,
              "Parameter Name": p.name,
              "Unit": p.unit || "-",
              "Value Type": p.valueType || "numeric",
              "Reference Range (Low)": p.refRangeLow ?? "-",
              "Reference Range (High)": p.refRangeHigh ?? "-",
              "Reference Range / Text":
                p.refRangeText ||
                (p.refRangeLow != null && p.refRangeHigh != null
                  ? `${p.refRangeLow} - ${p.refRangeHigh} ${p.unit || ""}`.trim()
                  : "-"),
              "Critical Panic (Low)": p.criticalLow ?? "-",
              "Critical Panic (High)": p.criticalHigh ?? "-",
              "Target Gender": p.gender || "Both",
              "TAT (Hours)": t.tatHours,
              "Sample Stability (Hours)": t.expiryHours || 2.0,
              "Price (INR)": t.price,
              "Status": t.status,
              "Description": t.description || "",
            });
          });
        }
      });

      // 2. High-level Test Catalog Summary Sheet
      const testSummaryRows = tests.map((t) => ({
        "Test Code": (t.testCode || "").replace(/-COPY/gi, ""),
        "Classification": t.testType || (t.isOutsourced ? "Outsourced" : "In-house"),
        "Laboratory / Partner": t.outsourceLab || (t.isOutsourced ? "Outsourced Partner" : "In-house lab"),
        "Test Profile Name": (t.testName || "").replace(/\s*\(Copy\)/gi, ""),
        "Department": t.category,
        "Specimen Type": t.sampleType,
        "Container / Tube": t.tubeCapColor,
        "Required Volume": t.requiredVolume,
        "Parameter Count": t.parameters ? t.parameters.length : 0,
        "TAT (Hours)": t.tatHours,
        "Sample Stability (Hours)": t.expiryHours || 2.0,
        "Price (INR)": t.price,
        "Status": t.status,
        "Description": t.description || "",
      }));

      // Create Workbook
      const wb = XLSX.utils.book_new();

      const wsParameters = XLSX.utils.json_to_sheet(parameterRows);
      const wsSummary = XLSX.utils.json_to_sheet(testSummaryRows);

      // Auto-fit column widths
      const applyColWidths = (ws: any, rows: any[]) => {
        if (!rows || rows.length === 0) return;
        const keys = Object.keys(rows[0]);
        ws["!cols"] = keys.map((key) => {
          let maxLen = key.length;
          rows.forEach((r) => {
            const val = r[key];
            if (val != null) {
              const strLen = String(val).length;
              if (strLen > maxLen) maxLen = strLen;
            }
          });
          return { wch: Math.min(Math.max(maxLen + 3, 12), 40) };
        });
      };

      applyColWidths(wsParameters, parameterRows);
      applyColWidths(wsSummary, testSummaryRows);

      XLSX.utils.book_append_sheet(wb, wsParameters, "Diagnostic Parameters");
      XLSX.utils.book_append_sheet(wb, wsSummary, "Test Summary");

      // Write and download native .xlsx file
      const filename = `Lab_Master_Catalog_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, filename);

      toast({
        title: "Excel Catalog Exported",
        description: `Exported ${tests.length} tests and all parameters as ${filename}.`,
      });
    } catch (error) {
      console.error("Failed to export Excel file:", error);
      toast({
        title: "Export Failed",
        description: "An error occurred while generating the Excel spreadsheet.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex bg-[#f8fafc] text-slate-800 antialiased font-sans selection:bg-blue-100">
      {/* Global Lab Navigation Sidebar */}
      <LabNav activeTab="Lab Master" />

      {/* Main Content Area */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col min-w-0 bg-[#f8fafc]">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Sliders className="w-5 h-5 text-[#00488D]" />
              <span>Lab Master Configuration</span>
            </h1>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-[#00488D] border border-blue-200 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[#00488D]" />
              <span>Database Lab Master ({stats.totalTests})</span>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportCatalog}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 rounded-lg transition cursor-pointer inline-flex items-center gap-1.5"
              title="Export Diagnostic Catalog as Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Excel</span>
            </button>
            <button
              type="button"
              onClick={handleOpenCreateDrawer}
              className="px-3.5 py-1.5 text-xs font-bold bg-[#00488D] hover:bg-blue-800 text-white rounded-lg shadow-xs transition cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Test</span>
            </button>

            <div className="h-6 w-px bg-slate-200 mx-1" />

            <LabNotificationBell size="md" />
            <UserProfileDropdown
              userName={displayName}
              userSubtext={displayRole}
              onLogout={handleLogout}
              profilePath="/lab/profile"
              hideNotifications
            />
          </div>
        </header>

        {/* Page Content */}
        <main className="p-8 space-y-6">

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  Master Tests
                </p>
                <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                  {stats.totalTests}
                </h3>
                <p className="text-[10.5px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{stats.activeTests} Active</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#00488D]">
                <Layers className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  In-House Tests
                </p>
                <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                  {stats.inhouseCount}
                </h3>
                <p className="text-[10.5px] text-slate-500 font-medium mt-0.5">
                  Hospital lab processed
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <FlaskConical className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wide flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  Outsourced Tests
                </p>
                <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                  {stats.outsourcedCount}
                </h3>
                <p className="text-[10.5px] text-slate-500 font-medium mt-0.5">
                  DDC, Core, Thyrocare, etc.
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                <Activity className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  Parameters
                </p>
                <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                  {stats.totalParams}
                </h3>
                <p className="text-[10.5px] text-slate-500 font-medium mt-0.5">
                  Across {stats.testsWithParams} panels
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                <Sliders className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  Departments
                </p>
                <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                  {stats.categoriesCount}
                </h3>
                <p className="text-[10.5px] text-slate-500 font-medium mt-0.5">
                  Specialty sections
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
                <Filter className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row items-center justify-between gap-3">
            <div className="relative w-full lg:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search test, lab, code, parameter..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>

            <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0 flex-wrap">
              {/* Classification Segmented Control */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setClassificationFilter("ALL")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                    classificationFilter === "ALL"
                      ? "bg-white text-[#00488D] shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All ({stats.totalTests})
                </button>
                <button
                  type="button"
                  onClick={() => setClassificationFilter("IN_HOUSE")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer inline-flex items-center gap-1.5 ${
                    classificationFilter === "IN_HOUSE"
                      ? "bg-white text-emerald-700 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  In-House ({stats.inhouseCount})
                </button>
                <button
                  type="button"
                  onClick={() => setClassificationFilter("OUTSOURCED")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer inline-flex items-center gap-1.5 ${
                    classificationFilter === "OUTSOURCED"
                      ? "bg-white text-indigo-700 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  Outsourced ({stats.outsourcedCount})
                </button>
              </div>

              {/* Scope Toggle Button */}
              <button
                type="button"
                onClick={() => setScopeFilter(scopeFilter === "ALL" ? "WITH_PARAMS" : "ALL")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer inline-flex items-center gap-1.5 shrink-0 ${
                  scopeFilter === "WITH_PARAMS"
                    ? "bg-blue-50 border-blue-200 text-[#00488D] font-bold"
                    : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"
                }`}
                title="Filter tests with configured individual parameters"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Panels ({stats.testsWithParams})</span>
              </button>

              {/* Partner Lab Filter */}
              <select
                value={selectedLab}
                onChange={(e) => setSelectedLab(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shrink-0"
              >
                <option value="ALL">All Partner Labs</option>
                {availableLabs.map((lab) => (
                  <option key={lab} value={lab}>
                    {lab}
                  </option>
                ))}
              </select>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shrink-0"
              >
                <option value="ALL">All Departments</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shrink-0"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          {/* Test Catalog Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Diagnostic Test Catalog ({filteredTests.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click any row to expand parameters and reference intervals.
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                  Showing {filteredTests.length} of {tests.length} tests
                </span>
                <button
                  type="button"
                  onClick={handleOpenCreatePackageModal}
                  className="px-3 py-1.5 text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white rounded-lg shadow-xs transition cursor-pointer inline-flex items-center gap-1.5"
                  title="Create a multi-test package by bundling existing lab tests"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Add Package</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenCreateDrawer}
                  className="px-3 py-1.5 text-xs font-bold bg-[#00488D] hover:bg-blue-800 text-white rounded-lg shadow-xs transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Test</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4 w-10 text-center"></th>
                    <th className="py-3 px-4">Test Code</th>
                    <th className="py-3 px-4">Classification & Lab</th>
                    <th className="py-3 px-4">Test Profile Name</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Specimen &amp; Container</th>
                    <th className="py-3 px-4 text-center">Parameters</th>
                    <th className="py-3 px-4 text-center">TAT</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredTests.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <Layers className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                        <p className="font-semibold text-slate-700">No diagnostic tests match your criteria</p>
                        <p className="text-xs text-slate-400 mt-1">Try adjusting your search query, classification, or department filter.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredTests.map((test) => {
                      const isExpanded = expandedTestIds.has(test.id);
                      const isPkg = isPackageTest(test.testName, test.testCode, test.description);
                      const pkgSubDefs = isPkg ? decomposePackageTest(test.testName, test.testCode, test.description) : [];

                      // STRICT: Only include sub-tests that actually have parameters belonging to them in this test!
                      const validSubTests = pkgSubDefs
                        .map((st) => ({
                          ...st,
                          params: test.parameters.filter((p) => st.filterParameter(p.name)),
                        }))
                        .filter((st) => st.params.length > 0);
                      const isMultiSubTestPkg = isPkg && validSubTests.length > 1;

                      return (
                        <React.Fragment key={test.id}>
                          <tr
                            onClick={() => toggleRowExpansion(test.id)}
                            className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${
                              isExpanded ? (isMultiSubTestPkg ? "bg-purple-50/30" : "bg-blue-50/20") : ""
                            }`}
                          >
                            {/* Expand Chevron */}
                            <td className="py-3 px-4 text-center text-slate-400">
                              {isExpanded ? (
                                <ChevronDown className={`w-4 h-4 ${isMultiSubTestPkg ? "text-purple-700" : "text-[#00488D]"}`} />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                              )}
                            </td>

                            {/* Code */}
                            <td className="py-3 px-4 font-mono font-bold text-[#00488D]">
                              {(test.testCode || "").replace(/-COPY/gi, "")}
                            </td>

                            {/* Classification & Lab */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              {!test.isOutsourced ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs w-fit">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    IN-HOUSE
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-medium pl-0.5">
                                    {test.outsourceLab || "In-house lab"}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-0.5">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs w-fit">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                    OUTSOURCED
                                  </span>
                                  <span className="text-[10.5px] text-slate-700 font-semibold pl-0.5">
                                    {test.outsourceLab || "Partner Lab"}
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Name */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-900 text-[13px]">
                                  {(test.testName || "").replace(/\s*\(Copy\)/gi, "")}
                                </span>
                                {isMultiSubTestPkg && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-purple-100 text-purple-800 border border-purple-200 shrink-0">
                                    <Package className="w-3 h-3 text-purple-600" />
                                    MULTI-TEST PACKAGE ({validSubTests.length} Sub-Tests)
                                  </span>
                                )}
                              </div>
                              {test.description && (
                                <span className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 block">
                                  {test.description}
                                </span>
                              )}
                            </td>

                            {/* Category */}
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                {test.category}
                              </span>
                            </td>

                            {/* Specimen & Container */}
                            <td className="py-3 px-4">
                              {isMultiSubTestPkg ? (
                                <div>
                                  <span className="font-semibold text-purple-900 block text-[11.5px] flex items-center gap-1">
                                    <Boxes className="w-3.5 h-3.5 text-purple-600" />
                                    {validSubTests.length} Discrete Collection Tubes
                                  </span>
                                  <span className="text-[10px] text-slate-500 block mt-0.5">
                                    {validSubTests.map((st) => st.code).join(" • ")}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-3 h-3 rounded-full shrink-0 shadow-2xs border border-white"
                                    style={{ backgroundColor: test.tubeCapHex }}
                                    title={test.tubeCapColor}
                                  />
                                  <div>
                                    <span className="font-semibold text-slate-800 block text-[11.5px]">
                                      {test.sampleType}
                                    </span>
                                    <span className="text-[10.5px] text-slate-500 block mt-0.5">
                                      {test.tubeCapColor} • {test.requiredVolume} •{" "}
                                      <span className="inline-flex items-center gap-0.5 text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[10px]">
                                        ⏱️ {test.expiryHours || 2}h stability
                                      </span>
                                    </span>
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Parameter Pill */}
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${isMultiSubTestPkg ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-blue-50 text-[#00488D] border-blue-200"}`}>
                                {test.parameters.length} Parameters
                              </span>
                              {isMultiSubTestPkg && (
                                <span className="block text-[10px] text-purple-700 font-semibold mt-1">
                                  across {validSubTests.length} Sub-Tests
                                </span>
                              )}
                            </td>

                            {/* TAT */}
                            <td className="py-3 px-4 text-center text-slate-600 font-semibold font-mono">
                              {test.tatHours}h
                            </td>

                            {/* Status */}
                            <td
                              className="py-3 px-4 text-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(test.id)}
                                className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold tracking-wide uppercase transition-colors cursor-pointer ${
                                  test.status === "ACTIVE"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-slate-100 text-slate-500 border border-slate-200"
                                }`}
                              >
                                {test.status}
                              </button>
                            </td>

                            {/* Actions */}
                            <td
                              className="py-3 px-4 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditDrawer(test)}
                                  className="p-1.5 text-slate-600 hover:text-[#00488D] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                  title="Edit Test &amp; Parameters"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTest(test.id, test.testName)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Test"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Parameter Details Row */}
                          {isExpanded && (
                            <tr className="bg-slate-50/70 border-b border-slate-200">
                              <td colSpan={10} className="p-4 sm:px-8">
                                {isMultiSubTestPkg ? (
                                  /* MULTI-TEST PACKAGE: CLASSIFIED INTO SUB-TEST SEPARATE TABLES */
                                  (() => {
                                    const matchedParamIds = new Set(
                                      validSubTests.flatMap((st) => st.params.map((p) => p.id))
                                    );
                                    const unclassifiedParams = test.parameters.filter(
                                      (p) => !matchedParamIds.has(p.id)
                                    );

                                    return (
                                      <div className="space-y-4">
                                        {/* Package Overview Card */}
                                        <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 rounded-xl border border-purple-200 p-4.5 shadow-2xs">
                                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div>
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <span className="p-1.5 bg-purple-600 text-white rounded-lg shadow-2xs">
                                                  <Package className="w-4 h-4" />
                                                </span>
                                                <h4 className="font-extrabold text-slate-900 text-sm">
                                                  {test.testName} — Composite Package Sub-Tests
                                                </h4>
                                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-200 text-purple-900 border border-purple-300">
                                                  {test.parameters.length} Total Parameters • {validSubTests.length} Sub-Test Panels
                                                </span>
                                                {!test.isOutsourced ? (
                                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10.5px] font-bold">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                    In-House Facility
                                                  </span>
                                                ) : (
                                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10.5px] font-bold">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                                    Outsourced: {test.outsourceLab}
                                                  </span>
                                                )}
                                              </div>
                                              <p className="text-xs text-slate-600 mt-1">
                                                In the diagnostic workflow, each sub-test receives an independent vacutainer tube, unique barcode label, and generates its own certified diagnostic report card.
                                              </p>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => handleOpenEditDrawer(test)}
                                              className="text-xs font-bold text-purple-700 hover:text-purple-900 bg-white px-3 py-1.5 rounded-lg border border-purple-200 hover:bg-purple-100/50 shadow-2xs cursor-pointer inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0"
                                            >
                                              <Edit2 className="w-3.5 h-3.5" />
                                              <span>Edit Test &amp; Reference Values</span>
                                            </button>
                                          </div>

                                          {/* Sub-Test Mini-Cards Architecture Grid */}
                                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                                            {validSubTests.map((st, idx) => (
                                              <div
                                                key={st.key || idx}
                                                className="bg-white p-3 rounded-lg border border-purple-100 shadow-2xs flex flex-col justify-between"
                                              >
                                                <div className="flex items-center justify-between gap-1">
                                                  <span className="text-[11px] font-bold font-mono text-purple-700 px-2 py-0.5 bg-purple-50 rounded border border-purple-200">
                                                    {st.code}
                                                  </span>
                                                  <span className="text-[10.5px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                                                    {st.params.length} params
                                                  </span>
                                                </div>
                                                <h5 className="font-bold text-slate-900 text-xs mt-1.5 line-clamp-1" title={st.name}>
                                                  {st.name}
                                                </h5>
                                                <div className="mt-2 text-[10.5px] space-y-0.5 border-t border-slate-100 pt-1.5">
                                                  <div className="text-slate-600 flex items-center gap-1">
                                                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                                    <span className="font-medium line-clamp-1">{st.containerType}</span>
                                                  </div>
                                                  <div className="text-slate-500 flex items-center justify-between text-[10px]">
                                                    <span>{st.analyzerBench}</span>
                                                    <span className="font-semibold text-amber-700">⏱️ {st.stabilityHours}h</span>
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>

                                        {/* Individual Sub-Test Parameter Tables */}
                                        {validSubTests.map((st, sIdx) => {
                                          const badgeColor = getContainerBadgeClass(st.containerColor);

                                          return (
                                            <div
                                              key={st.key || sIdx}
                                              className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden"
                                            >
                                              {/* Sub-test Table Header */}
                                              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                                                <div className="flex items-center gap-2.5 flex-wrap">
                                                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                                    <Activity className="w-4 h-4 text-[#00488D]" />
                                                    <span>Sub-Test {sIdx + 1}: <strong className="text-[#00488D]">{st.name}</strong></span>
                                                  </span>
                                                  <span className="font-mono text-[10.5px] font-bold px-2 py-0.5 bg-slate-200/70 text-slate-700 rounded">
                                                    {st.code}
                                                  </span>
                                                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold border ${badgeColor}`}>
                                                    <span>Tube: {st.containerType}</span>
                                                  </span>
                                                  <span className="text-[10.5px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 font-medium">
                                                    Bench: {st.analyzerBench}
                                                  </span>
                                                  <span className="text-[10.5px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                                                    ⏱️ Stability: {st.stabilityHours}h
                                                  </span>
                                                </div>
                                                <span className="text-xs font-bold text-slate-700 bg-blue-50 text-[#00488D] border border-blue-200 px-2.5 py-0.5 rounded-full">
                                                  {st.params.length} Parameters
                                                </span>
                                              </div>

                                              {/* Sub-test Parameter Table */}
                                              <table className="w-full text-left text-xs">
                                                <thead>
                                                  <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-bold text-[10.5px] uppercase">
                                                    <th className="py-2.5 px-4 w-12 text-center">#</th>
                                                    <th className="py-2.5 px-4">Parameter Name</th>
                                                    <th className="py-2.5 px-4 text-center">Unit</th>
                                                    <th className="py-2.5 px-4 text-center">Biological Reference Interval (Normal)</th>
                                                    <th className="py-2.5 px-4 text-center">Critical / Panic Alert Limit</th>
                                                    <th className="py-2.5 px-4 text-center">Gender Target</th>
                                                    <th className="py-2.5 px-4">Remarks / Clinical Notes</th>
                                                  </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 font-medium">
                                                  {st.params.map((p, pIdx) => (
                                                    <tr key={p.id} className="hover:bg-slate-50/50">
                                                      <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px] text-center">
                                                        {pIdx + 1}
                                                      </td>
                                                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                                                        {p.name}
                                                      </td>
                                                      <td className="py-2.5 px-4 text-center font-mono text-slate-600">
                                                        {p.unit || "—"}
                                                      </td>
                                                      <td className="py-2.5 px-4 text-center">
                                                        <span className="font-semibold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 font-mono">
                                                          {p.refRangeText || (p.refRangeLow !== undefined && p.refRangeHigh !== undefined ? `${p.refRangeLow} - ${p.refRangeHigh}` : "Normal")}
                                                        </span>
                                                      </td>
                                                      <td className="py-2.5 px-4 text-center">
                                                        {p.criticalLow !== undefined || p.criticalHigh !== undefined ? (
                                                          <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded font-mono">
                                                            {p.criticalLow !== undefined ? `< ${p.criticalLow} ` : ""}
                                                            {p.criticalHigh !== undefined ? `> ${p.criticalHigh}` : ""}
                                                          </span>
                                                        ) : (
                                                          <span className="text-slate-400 font-mono text-[11px]">—</span>
                                                        )}
                                                      </td>
                                                      <td className="py-2.5 px-4 text-center">
                                                        <span className="text-[11px] font-medium text-slate-600">
                                                          {p.gender}
                                                        </span>
                                                      </td>
                                                      <td className="py-2.5 px-4 text-[11px] text-slate-500">
                                                        {p.remarks || "—"}
                                                      </td>
                                                    </tr>
                                                  ))}
                                                </tbody>
                                              </table>
                                            </div>
                                          );
                                        })}

                                        {/* Unclassified Parameters if any */}
                                        {unclassifiedParams.length > 0 && (
                                          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                                            <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                                              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                                <Sliders className="w-4 h-4 text-slate-600" />
                                                Additional Diagnostic Parameters ({unclassifiedParams.length})
                                              </span>
                                            </div>
                                            <table className="w-full text-left text-xs">
                                              <thead>
                                                <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-bold text-[10.5px] uppercase">
                                                  <th className="py-2.5 px-4 w-12 text-center">#</th>
                                                  <th className="py-2.5 px-4">Parameter Name</th>
                                                  <th className="py-2.5 px-4 text-center">Unit</th>
                                                  <th className="py-2.5 px-4 text-center">Biological Reference Interval (Normal)</th>
                                                  <th className="py-2.5 px-4 text-center">Critical / Panic Alert Limit</th>
                                                  <th className="py-2.5 px-4 text-center">Gender Target</th>
                                                  <th className="py-2.5 px-4">Remarks</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-slate-100 font-medium">
                                                {unclassifiedParams.map((p, pIdx) => (
                                                  <tr key={p.id} className="hover:bg-slate-50/50">
                                                    <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px] text-center">
                                                      {pIdx + 1}
                                                    </td>
                                                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                                                      {p.name}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-center font-mono text-slate-600">
                                                      {p.unit || "—"}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-center">
                                                      <span className="font-semibold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 font-mono">
                                                        {p.refRangeText || (p.refRangeLow !== undefined && p.refRangeHigh !== undefined ? `${p.refRangeLow} - ${p.refRangeHigh}` : "Normal")}
                                                      </span>
                                                    </td>
                                                    <td className="py-2.5 px-4 text-center">
                                                      {p.criticalLow !== undefined || p.criticalHigh !== undefined ? (
                                                        <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded font-mono">
                                                          {p.criticalLow !== undefined ? `< ${p.criticalLow} ` : ""}
                                                          {p.criticalHigh !== undefined ? `> ${p.criticalHigh}` : ""}
                                                        </span>
                                                      ) : (
                                                        <span className="text-slate-400 font-mono text-[11px]">—</span>
                                                      )}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-center">
                                                      <span className="text-[11px] font-medium text-slate-600">
                                                        {p.gender}
                                                      </span>
                                                    </td>
                                                    <td className="py-2.5 px-4 text-[11px] text-slate-500">
                                                      {p.remarks || "—"}
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()
                                ) : (
                                  /* STANDARD SINGLE TEST PARAMETER TABLE */
                                  <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                                    <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                                      <div className="flex items-center gap-2.5 flex-wrap">
                                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                          <Activity className="w-4 h-4 text-[#00488D]" />
                                          Diagnostic Parameters for {test.testName} ({test.parameters.length})
                                        </span>
                                        {!test.isOutsourced ? (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10.5px] font-bold">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                            In-House Facility
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10.5px] font-bold">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                            Outsourced Partner: {test.outsourceLab}
                                          </span>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditDrawer(test)}
                                        className="text-xs font-bold text-[#00488D] hover:underline cursor-pointer inline-flex items-center gap-1"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                        <span>Edit Parameters / Reference Values</span>
                                      </button>
                                    </div>

                                    <table className="w-full text-left text-xs">
                                      <thead>
                                        <tr className="border-b border-slate-200 text-slate-500 font-bold text-[10.5px] uppercase">
                                          <th className="py-2.5 px-4 w-12 text-center">#</th>
                                          <th className="py-2.5 px-4">Parameter Name</th>
                                          <th className="py-2.5 px-4 text-center">Unit</th>
                                          <th className="py-2.5 px-4 text-center">Biological Reference Interval (Normal)</th>
                                          <th className="py-2.5 px-4 text-center">Critical / Panic Alert Limit</th>
                                          <th className="py-2.5 px-4 text-center">Gender Target</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 font-medium">
                                        {test.parameters.map((p, pIdx) => (
                                          <tr key={p.id} className="hover:bg-slate-50/50">
                                            <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px] text-center">
                                              {pIdx + 1}
                                            </td>
                                            <td className="py-2.5 px-4 font-semibold text-slate-900">
                                              {p.name}
                                            </td>
                                            <td className="py-2.5 px-4 text-center font-mono text-slate-600">
                                              {p.unit || "—"}
                                            </td>
                                            <td className="py-2.5 px-4 text-center">
                                              <span className="font-semibold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 font-mono">
                                                {p.refRangeText || (p.refRangeLow !== undefined && p.refRangeHigh !== undefined ? `${p.refRangeLow} - ${p.refRangeHigh}` : "Normal")}
                                              </span>
                                            </td>
                                            <td className="py-2.5 px-4 text-center">
                                              {p.criticalLow !== undefined || p.criticalHigh !== undefined ? (
                                                <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded font-mono">
                                                  {p.criticalLow !== undefined ? `< ${p.criticalLow} ` : ""}
                                                  {p.criticalHigh !== undefined ? `> ${p.criticalHigh}` : ""}
                                                </span>
                                              ) : (
                                                <span className="text-slate-400 font-mono text-[11px]">—</span>
                                              )}
                                            </td>
                                            <td className="py-2.5 px-4 text-center">
                                              <span className="text-[11px] font-medium text-slate-600">
                                                {p.gender}
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* ==================================================================== */}
      {/* SLIDING SIDE DRAWER / SHEET FOR TEST & PARAMETERS BUILDER            */}
      {/* ==================================================================== */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden select-none">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-3xl bg-white shadow-2xl flex flex-col justify-between border-l border-slate-200">
              {/* Drawer Header */}
              <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-[#00488D]" />
                    <span>
                      {editingTestId ? `Edit Diagnostic Test` : `Add New Diagnostic Test`}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure test profile metadata, specimen containers, and individual parameter reference ranges.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* SECTION 1: Test Profile Details */}
                <div className="space-y-4 bg-slate-50/70 p-5 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#00488D]" />
                    <span>1. Test Profile Information</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {/* Test Classification Selector */}
                    <div className="sm:col-span-2 bg-white p-3.5 rounded-lg border border-slate-200">
                      <label className="font-bold text-slate-800 block mb-2 text-xs">
                        Test Classification &amp; Processing Origin <span className="text-rose-500">*</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                            !formIsOutsourced
                              ? "border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500"
                              : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="testClassification"
                            checked={!formIsOutsourced}
                            onChange={() => {
                              setFormIsOutsourced(false);
                              setFormOutsourceLab("In-house lab");
                            }}
                            className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                          />
                          <div>
                            <span className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              In-House Diagnostic Test
                            </span>
                            <span className="text-[11px] text-slate-500 block mt-0.5">
                              Analyzed on-site in hospital laboratory facility.
                            </span>
                          </div>
                        </label>

                        <label
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                            formIsOutsourced
                              ? "border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500"
                              : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="testClassification"
                            checked={formIsOutsourced}
                            onChange={() => {
                              setFormIsOutsourced(true);
                              if (formOutsourceLab === "In-house lab") {
                                setFormOutsourceLab("DDC");
                              }
                            }}
                            className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div>
                            <span className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                              Outsourced Reference Test
                            </span>
                            <span className="text-[11px] text-slate-500 block mt-0.5">
                              Referred to accredited external partner (DDC, Core, Thyrocare, etc.).
                            </span>
                          </div>
                        </label>
                      </div>

                      {formIsOutsourced && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <label className="font-bold text-slate-700 block mb-1 text-[11.5px]">
                            Partner Reference Laboratory <span className="text-rose-500">*</span>
                          </label>
                          <div className="flex gap-2">
                            <select
                              value={["DDC", "Core Diagnostics", "AMPATH", "MedGenome", "Strand Life Sciences", "Thyrocare", "Neuberg Diagnostics", "Agilus Diagnostics"].includes(formOutsourceLab) ? formOutsourceLab : "CUSTOM"}
                              onChange={(e) => {
                                if (e.target.value !== "CUSTOM") {
                                  setFormOutsourceLab(e.target.value);
                                }
                              }}
                              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                            >
                              <option value="DDC">DDC Laboratory</option>
                              <option value="Core Diagnostics">Core Diagnostics</option>
                              <option value="AMPATH">AMPATH</option>
                              <option value="MedGenome">MedGenome</option>
                              <option value="Strand Life Sciences">Strand Life Sciences</option>
                              <option value="Thyrocare">Thyrocare</option>
                              <option value="Neuberg Diagnostics">Neuberg Diagnostics</option>
                              <option value="Agilus Diagnostics">Agilus Diagnostics</option>
                              <option value="CUSTOM">Other / Custom Lab</option>
                            </select>
                            <input
                              type="text"
                              value={formOutsourceLab}
                              onChange={(e) => setFormOutsourceLab(e.target.value)}
                              placeholder="Enter laboratory vendor name"
                              className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Test Profile Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formTestName}
                        onChange={(e) => setFormTestName(e.target.value)}
                        placeholder="e.g. Complete Blood Count (CBC)"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Test Code / SKU <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formTestCode}
                        onChange={(e) => setFormTestCode(e.target.value.toUpperCase())}
                        placeholder="e.g. HEM-CBC-01"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Department / Laboratory Category
                      </label>
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                      >
                        {CATEGORY_OPTIONS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Specimen / Sample Type
                      </label>
                      <input
                        type="text"
                        value={formSampleType}
                        onChange={(e) => setFormSampleType(e.target.value)}
                        placeholder="e.g. Whole Blood, Serum, Urine"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Vacutainer Tube Cap Color
                      </label>
                      <select
                        value={formTubeCap}
                        onChange={(e) => setFormTubeCap(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                      >
                        {TUBE_CAP_OPTIONS.map((tc) => (
                          <option key={tc.name} value={tc.name}>
                            {tc.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Minimum Volume &amp; Standard TAT
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={formRequiredVolume}
                          onChange={(e) => setFormRequiredVolume(e.target.value)}
                          placeholder="e.g. 2.0 mL"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        <input
                          type="number"
                          value={formTatHours}
                          onChange={(e) => setFormTatHours(Number(e.target.value))}
                          placeholder="TAT (Hours)"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-200">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          <span>⏱️ Specimen Stability / Expiry (Hours)</span>
                          <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[11px] font-semibold text-amber-800">
                          Live Countdown Trigger
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          max="72"
                          value={formExpiryHours}
                          onChange={(e) => setFormExpiryHours(Number(e.target.value))}
                          placeholder="Hours"
                          className="w-24 px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {[1, 2, 4, 24].map((hrs) => (
                            <button
                              key={hrs}
                              type="button"
                              onClick={() => setFormExpiryHours(hrs)}
                              className={`px-2.5 py-1 text-[11px] rounded-md border font-semibold transition cursor-pointer ${
                                formExpiryHours === hrs
                                  ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {hrs === 1 ? "1h (STAT)" : hrs === 2 ? "2h (CBC/Urine)" : hrs === 4 ? "4h (Serum/Gel)" : "24h (Cold)"}
                            </button>
                          ))}
                        </div>
                      </div>
                      <p className="text-[10.5px] text-slate-500 mt-1.5 leading-snug">
                        Once drawn at phlebotomy, a live countdown timer runs for {formExpiryHours || 2} hour(s) before sample degrades and triggers lab alerts.
                      </p>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: Dynamic Parameters Builder */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-[#00488D]" />
                        <span>2. Diagnostic Parameters &amp; Reference Intervals ({formParameters.length})</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Define normal ranges and critical panic alert cutoffs for each test parameter.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddParameterRow}
                      className="px-3 py-1.5 text-xs font-bold bg-[#00488D] text-white hover:bg-[#093a6b] rounded-lg shadow-2xs transition cursor-pointer inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Parameter</span>
                    </button>
                  </div>

                  {/* Parameter Rows List */}
                  <div className="space-y-3">
                    {formParameters.map((param, index) => (
                      <div
                        key={param.id}
                        className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3 relative hover:border-blue-300 transition"
                      >
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-mono">
                              {index + 1}
                            </span>
                            <span>{param.name || `Parameter #${index + 1}`}</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => handleRemoveParameterRow(param.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                            title="Remove parameter"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Parameter Fields Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div>
                            <label className="font-semibold text-slate-600 block mb-1">
                              Parameter Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={param.name}
                              onChange={(e) => handleUpdateParameterField(param.id, "name", e.target.value)}
                              placeholder="e.g. Hemoglobin, Total Bilirubin"
                              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-medium focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="font-semibold text-slate-600 block mb-1">
                              Unit of Measure
                            </label>
                            <input
                              type="text"
                              list="common-units-list"
                              value={param.unit}
                              onChange={(e) => handleUpdateParameterField(param.id, "unit", e.target.value)}
                              placeholder="e.g. g/dL, mg/dL, %"
                              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-medium focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono"
                            />
                            <datalist id="common-units-list">
                              {COMMON_UNITS.map((u) => (
                                <option key={u} value={u} />
                              ))}
                            </datalist>
                          </div>

                          <div>
                            <label className="font-semibold text-slate-600 block mb-1">
                              Value Type
                            </label>
                            <select
                              value={param.valueType}
                              onChange={(e) => handleUpdateParameterField(param.id, "valueType", e.target.value as any)}
                              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-medium focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
                            >
                              <option value="numeric">Numeric Range (Low - High)</option>
                              <option value="qualitative">Qualitative / Text (Normal/Negative)</option>
                            </select>
                          </div>
                        </div>

                        {/* Reference Values Row */}
                        {param.valueType === "numeric" ? (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                            <div>
                              <label className="text-[10.5px] font-bold text-slate-700 block mb-0.5">
                                Normal Low
                              </label>
                              <input
                                type="number"
                                step="any"
                                value={param.refRangeLow ?? ""}
                                onChange={(e) => handleUpdateParameterField(param.id, "refRangeLow", e.target.value === "" ? "" : Number(e.target.value))}
                                placeholder="Low limit"
                                className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-center font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10.5px] font-bold text-slate-700 block mb-0.5">
                                Normal High
                              </label>
                              <input
                                type="number"
                                step="any"
                                value={param.refRangeHigh ?? ""}
                                onChange={(e) => handleUpdateParameterField(param.id, "refRangeHigh", e.target.value === "" ? "" : Number(e.target.value))}
                                placeholder="High limit"
                                className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-center font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10.5px] font-bold text-rose-700 block mb-0.5">
                                Critical Low (Red)
                              </label>
                              <input
                                type="number"
                                step="any"
                                value={param.criticalLow ?? ""}
                                onChange={(e) => handleUpdateParameterField(param.id, "criticalLow", e.target.value === "" ? undefined : Number(e.target.value))}
                                placeholder="Panic Low"
                                className="w-full px-2.5 py-1 bg-rose-50/50 border border-rose-300 rounded text-center font-mono text-rose-800 focus:ring-1 focus:ring-rose-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10.5px] font-bold text-rose-700 block mb-0.5">
                                Critical High (Red)
                              </label>
                              <input
                                type="number"
                                step="any"
                                value={param.criticalHigh ?? ""}
                                onChange={(e) => handleUpdateParameterField(param.id, "criticalHigh", e.target.value === "" ? undefined : Number(e.target.value))}
                                placeholder="Panic High"
                                className="w-full px-2.5 py-1 bg-rose-50/50 border border-rose-300 rounded text-center font-mono text-rose-800 focus:ring-1 focus:ring-rose-500 focus:outline-none"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                            <label className="text-[10.5px] font-bold text-slate-700 block mb-0.5">
                              Expected Normal Reference Text
                            </label>
                            <input
                              type="text"
                              value={param.refRangeText ?? ""}
                              onChange={(e) => handleUpdateParameterField(param.id, "refRangeText", e.target.value)}
                              placeholder="e.g. Negative, Non-Reactive, Nil, Clear"
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingTest}
                  onClick={handleSaveTest}
                  className="px-6 py-2 text-xs font-bold text-white bg-[#00488D] hover:bg-[#093a6b] rounded-lg shadow-sm transition cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingTest ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>{isSavingTest ? "Saving to Database..." : "Save Test & Parameters"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ADD DIAGNOSTIC PACKAGE MODAL                                         */}
      {/* ==================================================================== */}
      {isPackageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs select-none">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/20 shadow-2xs">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Create Multi-Test Diagnostic Package
                  </h3>
                  <p className="text-xs text-purple-100 mt-0.5">
                    Bundle existing tests from lab master into a combined clinical package with separate sample tubes and discrete reporting.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPackageModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: 2 Columns */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT COLUMN: Package Metadata (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3.5 text-xs">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-700" />
                    <span>Package Information</span>
                  </h4>

                  {/* Package Name */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Package Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={packageFormName}
                      onChange={(e) => setPackageFormName(e.target.value)}
                      placeholder="e.g. Senior Citizen Complete Profile"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  {/* Package Code & Category */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700">Code <span className="text-rose-500">*</span></label>
                        <button
                          type="button"
                          onClick={() => setPackageFormCode(`PKG-${Math.floor(100 + Math.random() * 900)}`)}
                          className="text-[10px] text-purple-700 hover:underline font-semibold cursor-pointer"
                        >
                          Auto
                        </button>
                      </div>
                      <input
                        type="text"
                        value={packageFormCode}
                        onChange={(e) => setPackageFormCode(e.target.value)}
                        placeholder="PKG-001"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold uppercase focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Department</label>
                      <input
                        type="text"
                        value={packageFormCategory}
                        onChange={(e) => setPackageFormCategory(e.target.value)}
                        placeholder="Health Package"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Price & TAT */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Package Price (₹) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={packageFormPrice}
                        onChange={(e) => setPackageFormPrice(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="e.g. 1200"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        TAT (Hours)
                      </label>
                      <input
                        type="number"
                        value={packageFormTatHours}
                        onChange={(e) => setPackageFormTatHours(Number(e.target.value))}
                        placeholder="4"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Expiry Hours */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Sample Expiry / Stability (Hours)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={packageFormExpiryHours}
                      onChange={(e) => setPackageFormExpiryHours(Number(e.target.value))}
                      placeholder="2"
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Defaulted to shortest stability among included sub-tests.
                    </span>
                  </div>

                  {/* Origin */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Processing Facility</label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs ${!packageFormIsOutsourced ? "bg-emerald-50 border-emerald-400 text-emerald-900 font-bold" : "bg-white border-slate-200 text-slate-600"}`}>
                        <input
                          type="radio"
                          name="pkgOrigin"
                          checked={!packageFormIsOutsourced}
                          onChange={() => {
                            setPackageFormIsOutsourced(false);
                            setPackageFormOutsourceLab("In-house lab");
                          }}
                        />
                        <span>In-House Lab</span>
                      </label>
                      <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs ${packageFormIsOutsourced ? "bg-indigo-50 border-indigo-400 text-indigo-900 font-bold" : "bg-white border-slate-200 text-slate-600"}`}>
                        <input
                          type="radio"
                          name="pkgOrigin"
                          checked={packageFormIsOutsourced}
                          onChange={() => {
                            setPackageFormIsOutsourced(true);
                            setPackageFormOutsourceLab("DDC");
                          }}
                        />
                        <span>Outsourced</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Selected Tests Summary Pill Card */}
                <div className="bg-purple-50/70 p-4 rounded-xl border border-purple-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      Bundled Tests ({selectedTestIds.size})
                    </span>
                    <span className="text-[11px] font-bold text-purple-700 bg-white px-2 py-0.5 rounded border border-purple-200">
                      {Array.from(selectedTestIds).reduce((acc, id) => {
                        const t = tests.find((x) => x.id === id);
                        return acc + (t?.parameters.length || 0);
                      }, 0)} Parameters
                    </span>
                  </div>

                  {selectedTestIds.size === 0 ? (
                    <p className="text-[11.5px] text-slate-400 italic py-2 text-center">
                      Select 2 or more tests from the right panel to bundle them into this package.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {tests
                        .filter((t) => selectedTestIds.has(t.id))
                        .map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center justify-between p-2 bg-white rounded-lg border border-purple-200 shadow-2xs"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: t.tubeCapHex }}
                              />
                              <span className="font-bold text-slate-800 text-[11.5px]">
                                {t.testName}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ({t.parameters.length}p)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleToggleSelectTest(t.id)}
                              className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: Available Diagnostic Tests Picker (7 cols) */}
              <div className="lg:col-span-7 flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Boxes className="w-3.5 h-3.5 text-purple-700" />
                    <span>Select Tests to Include in Package</span>
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {selectedTestIds.size} selected
                  </span>
                </div>

                {/* Filter & Search Bar */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={packageSearchQuery}
                      onChange={(e) => setPackageSearchQuery(e.target.value)}
                      placeholder="Search existing tests..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                    />
                  </div>
                  <select
                    value={packageCategoryFilter}
                    onChange={(e) => setPackageCategoryFilter(e.target.value)}
                    className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-purple-500 cursor-pointer"
                  >
                    <option value="ALL">All Categories</option>
                    {availableCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Test Picker List */}
                <div className="flex-1 overflow-y-auto max-h-[460px] border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                  {tests
                    .filter((t) => {
                      if (isPackageTest(t.testName, t.testCode, t.description)) return false; // Don't nest packages
                      if (packageCategoryFilter !== "ALL" && t.category !== packageCategoryFilter) return false;
                      const q = packageSearchQuery.toLowerCase().trim();
                      if (!q) return true;
                      return (
                        t.testName.toLowerCase().includes(q) ||
                        t.testCode.toLowerCase().includes(q) ||
                        t.category.toLowerCase().includes(q)
                      );
                    })
                    .map((t) => {
                      const isSelected = selectedTestIds.has(t.id);
                      return (
                        <div
                          key={t.id}
                          onClick={() => handleToggleSelectTest(t.id)}
                          className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition ${
                            isSelected
                              ? "bg-purple-50/70 border-l-4 border-l-purple-600"
                              : "hover:bg-slate-50 border-l-4 border-l-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by parent onClick
                              className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-xs">
                                  {t.testName}
                                </span>
                                <span className="font-mono text-[10px] font-bold text-slate-500 px-1.5 py-0.5 bg-slate-100 rounded">
                                  {t.testCode}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-[10.5px] text-slate-500">
                                <span className="flex items-center gap-1">
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: t.tubeCapHex }}
                                  />
                                  <span>{t.tubeCapColor}</span>
                                </span>
                                <span>•</span>
                                <span>{t.sampleType}</span>
                                <span>•</span>
                                <span className="font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                                  {t.parameters.length} params
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-bold text-slate-900 text-xs font-mono">
                              ₹{t.price}
                            </span>
                            <span className="block text-[10px] text-slate-400">
                              {t.tatHours}h TAT
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsPackageModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingPackage || selectedTestIds.size < 2 || !packageFormName.trim()}
                onClick={handleSavePackage}
                className="px-6 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-lg shadow-sm transition cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSavingPackage ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>
                  {isSavingPackage
                    ? "Creating Package..."
                    : `Create & Save Package (${selectedTestIds.size} Tests)`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

