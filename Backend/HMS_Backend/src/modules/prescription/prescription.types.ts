{/*export interface CreatePrescriptionItemDTO {

    medicine_id: string;
    dosage?: string;
    dosage_unit?: string;
    strength?: string;
    route?: string;
    frequency?: string;
    timing?: string;
    duration_value?: number;
    duration_unit?: string;
    quantity?: number;
    refill_count?: number;
    instructions?: string;
    substitution_allowed?: boolean;
    notes?: string;

}

export interface CreatePrescriptionDTO {

    encounter_no: string;
    chief_complaint?: string;
    clinical_notes?: string;
    advice?: string;
    followup_date?: string; // YYYY-MM-DD
    medicines: CreatePrescriptionItemDTO[];

}

export interface UpdatePrescriptionDTO {

    chief_complaint?: string;
    clinical_notes?: string;
    advice?: string;
    followup_date?: string; // YYYY-MM-DD
    diagnosis_id?: string;
    status?: "DRAFT" | "FINALIZED" | "CANCELLED";

}

export interface CreatePrescriptionItemRequestDTO extends CreatePrescriptionItemDTO {}

export interface UpdatePrescriptionItemDTO {

    medicine_id?: string;
    dosage?: string;
    dosage_unit?: string;
    strength?: string;
    route?: string;
    frequency?: string;
    timing?: string;
    duration_value?: number;
    duration_unit?: string;
    quantity?: number;
    refill_count?: number;
    instructions?: string;
    substitution_allowed?: boolean;
    dispense_status?: string;
    notes?: string;

}

export interface GetPrescriptionsQuery {

    branchId?: string;
    doctorId?: string;
    patientId?: string;
    encounterId?: string;
    status?: string;

    date?: string;
    dateFrom?: string;
    dateTo?: string;

    search?: string;

    sortBy?: "prescription_date" | "created_at" | "status";
    sortOrder?: "asc" | "desc";

    page?: number;
    limit?: number;

}
*/}