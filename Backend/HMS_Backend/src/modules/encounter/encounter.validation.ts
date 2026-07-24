import { body, param, query } from "express-validator";
import { ENCOUNTER_STATUS_VALUES } from "./encounter.constants";

export const createEncounterValidation = [

    body("appointment_id")
        .notEmpty()
        .withMessage("Appointment is required")

];

export const updateEncounterValidation = [

    param("encounterNo")
        .notEmpty(),

    body("chief_complaint").optional().isString(),
    body("symptoms").optional().isString(),
    body("diagnosis_id").optional().notEmpty(),
    body("clinical_notes").optional().isString(),
    body("advice").optional().isString(),

    body("follow_up_date")
        .optional()
        .isISO8601()
        .withMessage("Follow-up date must be a valid date (YYYY-MM-DD)"),

    body("height").optional().isFloat({ min: 0 }),
    body("weight").optional().isFloat({ min: 0 }),
    body("pulse").optional().isInt({ min: 0 }),
    body("systolic_bp").optional().isInt({ min: 0 }),
    body("diastolic_bp").optional().isInt({ min: 0 }),
    body("temperature").optional().isFloat({ min: 0 }),
    body("respiratory_rate").optional().isInt({ min: 0 }),
    body("spo2").optional().isInt({ min: 0, max: 100 })

];

export const closeEncounterValidation = [

    param("encounterNo")
        .notEmpty()

];

export const getEncountersValidation = [

    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("status").optional().isIn(ENCOUNTER_STATUS_VALUES),
    query("date").optional().isISO8601(),
    query("dateFrom").optional().isISO8601(),
    query("dateTo").optional().isISO8601()

];
