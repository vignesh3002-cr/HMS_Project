import { body } from "express-validator";

export const updateBranchValidation = [

    body("branch_name")
        .optional()
        .notEmpty()
        .withMessage("Branch Name cannot be empty"),

    body("branch_type")
        .optional()
        .notEmpty()
        .withMessage("Branch Type cannot be empty"),

    body("email")
        .optional()
        .isEmail()
        .withMessage("Valid Branch Email is required"),

    body("pincode")
        .optional()
        .isInt()
        .withMessage("Pincode must be a number"),

    body("total_beds")
        .optional()
        .isInt()
        .withMessage("Total beds must be a number"),

    body("date_of_establish")
        .optional()
        .isISO8601()
        .withMessage("Date of establish must be a valid date"),

    body("branch_status")
        .optional()
        .isIn(["Active", "Inactive"])
        .withMessage("Branch status must be either Active or Inactive")

];

export const createBranchValidation = [

    body("branch_code")
        .notEmpty()
        .withMessage("Branch Code is required"),

    body("name")
        .notEmpty()
        .withMessage("Branch Name is required"),

    body("branch_type")
        .notEmpty()
        .withMessage("Branch Type is required"),

    body("phone")
        .notEmpty()
        .withMessage("Phone Number is required"),

    body("email")
        .isEmail()
        .withMessage("Valid Branch Email is required"),

    body("address_line1")
        .notEmpty()
        .withMessage("Address is required"),

    body("city")
        .notEmpty()
        .withMessage("City is required"),

    body("state_name")
        .notEmpty()
        .withMessage("State is required"),

    body("country_code")
        .notEmpty()
        .withMessage("Country Code is required"),

    //------------------------------------
    // Branch Admin Details
    //------------------------------------

    body("admin_name")
        .notEmpty()
        .withMessage("Branch Admin Name is required"),

    body("username")
        .notEmpty()
        .withMessage("Username is required"),

    body("password")
        .isLength({ min: 8 })
        .withMessage("Password should contain minimum 8 characters"),

    body("mobile")
        .notEmpty()
        .withMessage("Mobile Number is required"),

    body("admin_email")
        .isEmail()
        .withMessage("Valid Admin Email is required")

];