export interface CreateAppointmentDTO {

    patient_id: string;

    employee_id: string; // doctor

    branch_id: string;

    department_id?: string;

    appointment_date: string; // YYYY-MM-DD

    appointment_time: string; // HH:mm

    reason_for_visit?: string;

    referred_by?: string;

    booking_source?: string;

}

export interface UpdateAppointmentDTO {

    employee_id?: string;

    branch_id?: string;

    department_id?: string;

    appointment_date?: string;

    appointment_time?: string;

    reason_for_visit?: string;

    referred_by?: string;

}

export interface UpdateAppointmentStatusDTO {

    status: string;

}

export interface GetAppointmentsQuery {

    branchId?: string;

    employeeId?: string;

    patientId?: string;

    status?: string;

    date?: string;

    dateFrom?: string;

    dateTo?: string;

    sortBy?: "appointment_date" | "created_at" | "token_number" | "status";

    sortOrder?: "asc" | "desc";

    page?: number;

    limit?: number;

}
