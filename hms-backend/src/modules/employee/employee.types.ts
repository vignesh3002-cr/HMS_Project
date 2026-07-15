export interface WorkingHourDto {

    branch_id: string;

    day_of_week:
        | "MONDAY"
        | "TUESDAY"
        | "WEDNESDAY"
        | "THURSDAY"
        | "FRIDAY"
        | "SATURDAY"
        | "SUNDAY";

    shift_name: string;

    start_time: string;

    end_time: string;

}

export interface CreateEmployeeDto {

    // Login

    username: string;
    password: string;
    role_type:
        | "DOCTOR"
        | "NURSE"
        | "LAB_TECHNICIAN"
        | "PHARMACIST"
        | "RECEPTIONIST";

    // Personal

    first_name: string;
    middle_name?: string;
    last_name: string;

    email: string;
    mobile_no: string;

    blood_group?: string;
    nationality?: string;
    marital_status?: string;

    aadhaar_no?: string;
    pan_no?: string;
    passport_no?: string;

    permanent_address?: string;
    current_address?: string;

    emergency_contact_name?: string;
    emergency_contact_relationship?: string;
    emergency_contact_number?: string;

    // Employment

    department_id: string;
    designation: string;
    joining_date: string;
    emp_status: boolean;

    // Doctor only

    specialization: string;
    qualification: string;
    doc_license_no: string;
    consultation_minutes: number;

    // Multi Branch

    branch_ids: string[];

    // Doctor Schedule

    working_hours?: WorkingHourDto[];
}

export interface GetEmployeesQuery {

    roleType?: string;

    branchId?: string;

    department?: string;

    status?: boolean;

    search?: string;

    page?: number;

    limit?: number;

}