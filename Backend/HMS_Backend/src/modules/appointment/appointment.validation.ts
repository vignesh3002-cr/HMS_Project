import { body, param, query } from "express-validator";
import { APPOINTMENT_STATUS_VALUES } from "./appointment.constants";

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const createAppointmentValidation = [

    body("patient_id")
        .notEmpty()
        .withMessage("Patient is required"),

    body("employee_id")
        .notEmpty()
        .withMessage("Doctor is required"),

    body("branch_id")
        .notEmpty()
        .withMessage("Branch is required"),

    body("department_id")
        .optional()
        .notEmpty(),

    body("appointment_date")
        .notEmpty()
        .withMessage("Appointment date is required")
        .isISO8601()
        .withMessage("Appointment date must be a valid date (YYYY-MM-DD)"),

    body("appointment_time")
        .notEmpty()
        .withMessage("Appointment time is required")
        .matches(TIME_PATTERN)
        .withMessage("Appointment time must be in HH:mm format"),

    body("reason_for_visit")
        .optional()
        .isString(),

    body("referred_by")
        .optional()
        .isString(),

    body("booking_source")
        .optional()
        .isString()

];

export const updateAppointmentValidation = [

    param("appointmentNo")
        .notEmpty(),

    body("employee_id")
        .optional()
        .notEmpty(),

    body("branch_id")
        .optional()
        .notEmpty(),

    body("department_id")
        .optional()
        .notEmpty(),

    body("appointment_date")
        .optional()
        .isISO8601()
        .withMessage("Appointment date must be a valid date (YYYY-MM-DD)"),

    body("appointment_time")
        .optional()
        .matches(TIME_PATTERN)
        .withMessage("Appointment time must be in HH:mm format"),

    body("reason_for_visit")
        .optional()
        .isString(),

    body("referred_by")
        .optional()
        .isString()

];

export const updateAppointmentStatusValidation = [

    param("appointmentNo")
        .notEmpty(),

    body("status")
        .notEmpty()
        .withMessage("Status is required")
        .isIn(APPOINTMENT_STATUS_VALUES)
        .withMessage(
            `Status must be one of: ${APPOINTMENT_STATUS_VALUES.join(", ")}`
        )

];

export const getAvailableSlotsValidation = [

    query("employeeId")
        .notEmpty()
        .withMessage("Doctor is required"),

    query("branchId")
        .notEmpty()
        .withMessage("Branch is required"),

    query("date")
        .notEmpty()
        .withMessage("Date is required")
        .isISO8601()
        .withMessage("Date must be a valid date (YYYY-MM-DD)")

];

export const getAppointmentsValidation = [

    query("page")
        .optional()
        .isInt({ min: 1 }),

    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 }),

    query("status")
        .optional()
        .isIn(APPOINTMENT_STATUS_VALUES),

    query("date")
        .optional()
        .isISO8601(),

    query("dateFrom")
        .optional()
        .isISO8601(),

    query("dateTo")
        .optional()
        .isISO8601()

];
