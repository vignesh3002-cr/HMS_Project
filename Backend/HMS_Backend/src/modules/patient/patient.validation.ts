import { body } from "express-validator";

export const createPatientValidation = [

    body("username")
        .notEmpty()
        .withMessage("Username is required"),

    body("password")
        .isLength({ min: 6 })
        .withMessage("Password should contain minimum 6 characters"),

    body("first_name")
        .notEmpty()
        .withMessage("First name is required"),

    body("mobile")
        .isMobilePhone("any")
        .withMessage("Valid mobile number is required"),

    body("email")
        .optional()
        .isEmail()
        .withMessage("Valid email is required"),

    body("branch_id")
        .notEmpty()
        .withMessage("Branch is required"),

    body("created_by")
        .notEmpty()
        .withMessage("Created by is required")

];

export const updatePatientValidation = [

    body("mobile")
        .optional()
        .isMobilePhone("any")
        .withMessage("Valid mobile number is required"),

    body("email")
        .optional()
        .isEmail()
        .withMessage("Valid email is required")

];
