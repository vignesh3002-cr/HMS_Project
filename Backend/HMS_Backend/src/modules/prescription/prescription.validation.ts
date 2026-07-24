{/*import { body, param, query } from "express-validator";
import {
    PRESCRIPTION_STATUS_VALUES,
    TIMING_VALUES,
    DURATION_UNIT_VALUES,
    DISPENSE_STATUS_VALUES
} from "./prescription.constants";

const medicineItemValidation = (prefix: string) => {

    const field = (name: string) => (prefix ? `${prefix}.${name}` : name);

    return [
        body(field("medicine_id")).notEmpty().withMessage("Medicine is required"),
        body(field("dosage")).optional().isString(),
        body(field("dosage_unit")).optional().isString(),
        body(field("strength")).optional().isString(),
        body(field("route")).optional().isString(),
        body(field("frequency")).optional().isString(),
        body(field("timing")).optional().isIn(TIMING_VALUES),
        body(field("duration_value")).optional().isInt({ min: 1 }),
        body(field("duration_unit")).optional().isIn(DURATION_UNIT_VALUES),
        body(field("quantity")).optional().isInt({ min: 1 }),
        body(field("refill_count")).optional().isInt({ min: 0 }),
        body(field("instructions")).optional().isString(),
        body(field("substitution_allowed")).optional().isBoolean(),
        body(field("notes")).optional().isString()
    ];

};

export const createPrescriptionValidation = [

    body("encounter_no").notEmpty().withMessage("Encounter is required"),
    body("chief_complaint").optional().isString(),
    body("clinical_notes").optional().isString(),
    body("advice").optional().isString(),
    body("followup_date").optional().isISO8601().withMessage("Follow-up date must be a valid date (YYYY-MM-DD)"),
    body("medicines").isArray({ min: 1 }).withMessage("At least one medicine is required"),
    ...medicineItemValidation("medicines.*")

];

export const getPrescriptionsValidation = [

    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("status").optional().isIn(PRESCRIPTION_STATUS_VALUES),
    query("date").optional().isISO8601(),
    query("dateFrom").optional().isISO8601(),
    query("dateTo").optional().isISO8601()

];

export const getPrescriptionByIdValidation = [

    param("prescriptionId").notEmpty()

];

export const updatePrescriptionValidation = [

    param("prescriptionId").notEmpty(),
    body("chief_complaint").optional().isString(),
    body("clinical_notes").optional().isString(),
    body("advice").optional().isString(),
    body("followup_date").optional().isISO8601().withMessage("Follow-up date must be a valid date (YYYY-MM-DD)"),
    body("diagnosis_id").optional().notEmpty(),
    body("status").optional().isIn(PRESCRIPTION_STATUS_VALUES)

];

export const deletePrescriptionValidation = [

    param("prescriptionId").notEmpty()

];

export const addPrescriptionItemValidation = [

    param("prescriptionId").notEmpty(),
    ...medicineItemValidation("")

];

export const updatePrescriptionItemValidation = [

    param("prescriptionId").notEmpty(),
    param("itemId").notEmpty(),
    body("medicine_id").optional().notEmpty(),
    body("dosage").optional().isString(),
    body("dosage_unit").optional().isString(),
    body("strength").optional().isString(),
    body("route").optional().isString(),
    body("frequency").optional().isString(),
    body("timing").optional().isIn(TIMING_VALUES),
    body("duration_value").optional().isInt({ min: 1 }),
    body("duration_unit").optional().isIn(DURATION_UNIT_VALUES),
    body("quantity").optional().isInt({ min: 1 }),
    body("refill_count").optional().isInt({ min: 0 }),
    body("instructions").optional().isString(),
    body("substitution_allowed").optional().isBoolean(),
    body("dispense_status").optional().isIn(DISPENSE_STATUS_VALUES),
    body("notes").optional().isString()

];

export const deletePrescriptionItemValidation = [

    param("prescriptionId").notEmpty(),
    param("itemId").notEmpty()

];

export const getPrescriptionItemsValidation = [

    param("prescriptionId").notEmpty()

];*/}
