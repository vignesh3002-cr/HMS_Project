export interface CreateEncounterDTO {

    appointment_id: string;

}

export interface UpdateEncounterDTO {

    chief_complaint?: string;
    symptoms?: string;
    diagnosis_id?: string;
    clinical_notes?: string;
    advice?: string;
    follow_up_date?: string; // YYYY-MM-DD

    height?: number;
    weight?: number;
    pulse?: number;
    systolic_bp?: number;
    diastolic_bp?: number;
    temperature?: number;
    respiratory_rate?: number;
    spo2?: number;

}

export interface GetEncountersQuery {

    branchId?: string;
    doctorId?: string;
    patientId?: string;
    status?: string;
    encounterType?: string;

    date?: string;
    dateFrom?: string;
    dateTo?: string;

    search?: string;

    sortBy?: "encounter_ts" | "created_at" | "status";
    sortOrder?: "asc" | "desc";

    page?: number;
    limit?: number;

}
