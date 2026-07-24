{/*import prisma from "../../config/prisma";
import { PrescriptionRepository } from "./prescription.repository";
import {
    CreatePrescriptionDTO,
    CreatePrescriptionItemDTO,
    UpdatePrescriptionDTO,
    UpdatePrescriptionItemDTO,
    GetPrescriptionsQuery
} from "./prescription.types";
import {
    PRESCRIPTION_STATUS,
    FREQUENCY_DOSES_PER_DAY,
    DURATION_UNIT_TO_DAYS
} from "./prescription.constants";
import { ENCOUNTER_STATUS } from "../encounter/encounter.constants";

const repository = new PrescriptionRepository();

function computeQuantity(item: {
    quantity?: number;
    frequency?: string;
    duration_value?: number;
    duration_unit?: string;
}): number | undefined {

    if (item.quantity !== undefined && item.quantity !== null) {
        return item.quantity;
    }

    if (!item.frequency || !item.duration_value || !item.duration_unit) {
        return undefined;
    }

    const dosesPerDay = FREQUENCY_DOSES_PER_DAY[item.frequency];
    const daysPerUnit = DURATION_UNIT_TO_DAYS[item.duration_unit];

    if (!dosesPerDay || !daysPerUnit) {
        return undefined;
    }

    return Math.ceil(item.duration_value * daysPerUnit * dosesPerDay);

}

export class PrescriptionService {

    async createPrescription(data: CreatePrescriptionDTO, createdBy: string) {

        const encounter = await repository.findEncounterForPrescription(data.encounter_no);

        if (!encounter) {
            throw new Error("Encounter not found");
        }

        if (encounter.status !== ENCOUNTER_STATUS.OPEN) {
            throw new Error("A prescription can only be created against an OPEN encounter");
        }

        const patient = encounter.patient_bio_data;

        if (!patient) {
            throw new Error("Patient not found for this encounter");
        }

        const doctor = encounter.employees;

        if (!doctor || !doctor.employee_id) {
            throw new Error("Doctor not found for this encounter");
        }

        if (!data.medicines || data.medicines.length === 0) {
            throw new Error("At least one medicine is required");
        }

        const seenMedicineIds = new Set<string>();

        for (const item of data.medicines) {

            if (seenMedicineIds.has(item.medicine_id)) {
                throw new Error(
                    `Duplicate medicine entries are not allowed within the same prescription: ${item.medicine_id}`
                );
            }

            seenMedicineIds.add(item.medicine_id);

        }

        const resolvedItems: Array<CreatePrescriptionItemDTO & {
            medicine_name: string;
            resolved_strength?: string;
            resolved_route?: string;
            resolved_quantity?: number;
        }> = [];

        for (const item of data.medicines) {

            const medicine = await repository.findMedicine(item.medicine_id);

            if (!medicine) {
                throw new Error(`Medicine not found: ${item.medicine_id}`);
            }

            resolvedItems.push({
                ...item,
                medicine_name: medicine.medicine_name,
                resolved_strength: item.strength ?? medicine.strength ?? undefined,
                resolved_route: item.route ?? medicine.route ?? undefined,
                resolved_quantity: computeQuantity(item)
            });

        }

        const prescriptionId = await prisma.$transaction(async (tx) => {

            const prescriptionId = await repository.generatePrescriptionNumber(tx);

            const prescription = await repository.createPrescription(tx, {

                prescription_id: prescriptionId,
                encounter_no: encounter.encounter_no,
                patient_id: encounter.patient_id,
                department_id: encounter.department_id,
                diagnosis_id: encounter.diagnosis_id,
                appointment_id: encounter.appointment_id,
                branch_id: encounter.branch_id,
                doctor_employee_id: doctor.employee_id!,
                user_id: doctor.user_id,

                chief_complaint: data.chief_complaint ?? encounter.chief_complaint,
                clinical_notes: data.clinical_notes ?? encounter.clinical_notes,
                advice: data.advice ?? encounter.advice,
                followup_date: data.followup_date
                    ? new Date(data.followup_date)
                    : encounter.follow_up_date,

                status: PRESCRIPTION_STATUS.DRAFT,
                created_by: createdBy

            });

            for (const item of resolvedItems) {

                const itemId = await repository.generatePrescriptionItemId(tx);

                await repository.createPrescriptionItem(tx, {

                    prescription_item_id: itemId,
                    prescription_id: prescription.prescription_id,
                    medicine_id: item.medicine_id,
                    medicine_name: item.medicine_name,
                    dosage: item.dosage,
                    dosage_unit: item.dosage_unit,
                    strength: item.resolved_strength,
                    route: item.resolved_route,
                    frequency: item.frequency,
                    timing: item.timing,
                    duration_value: item.duration_value,
                    duration_unit: item.duration_unit,
                    quantity: item.resolved_quantity,
                    refill_count: item.refill_count,
                    instructions: item.instructions,
                    substitution_allowed: item.substitution_allowed,
                    notes: item.notes

                });

            }

            return prescription.prescription_id;

        });

        return repository.getPrescriptionById(prescriptionId);

    }

    async getPrescriptions(query: GetPrescriptionsQuery) {

        return repository.getPrescriptions(query);

    }

    async getPrescriptionById(prescriptionId: string) {

        const prescription = await repository.getPrescriptionById(prescriptionId);

        if (!prescription) {
            throw new Error("Prescription not found");
        }

        return prescription;

    }

    async updatePrescription(
        prescriptionId: string,
        data: UpdatePrescriptionDTO,
        updatedBy: string
    ) {

        const existing = await repository.getPrescriptionById(prescriptionId);

        if (!existing) {
            throw new Error("Prescription not found");
        }

        const nextStatus = data.status;

        if (nextStatus && nextStatus !== existing.status) {

            if (nextStatus === PRESCRIPTION_STATUS.FINALIZED) {

                if (existing.status !== PRESCRIPTION_STATUS.DRAFT) {
                    throw new Error("Only a draft prescription can be finalized");
                }

            } else if (nextStatus === PRESCRIPTION_STATUS.DRAFT) {

                if (existing.status !== PRESCRIPTION_STATUS.FINALIZED) {
                    throw new Error("Only a finalized prescription can be reopened");
                }

                // The JWT payload only carries the caller's role today (see
                // auth.middleware.ts), so "authorized doctor" is enforced on role.
                if (updatedBy !== "DOCTOR") {
                    throw new Error("Only a doctor can reopen a finalized prescription");
                }

            } else if (nextStatus === PRESCRIPTION_STATUS.CANCELLED) {

                if (existing.status === PRESCRIPTION_STATUS.CANCELLED) {
                    throw new Error("Prescription is already cancelled");
                }

            } else {

                throw new Error("Invalid prescription status");

            }

        } else if (existing.status === PRESCRIPTION_STATUS.FINALIZED) {

            throw new Error("Prescription is finalized and read-only. Reopen it before editing.");

        } else if (existing.status === PRESCRIPTION_STATUS.CANCELLED) {

            throw new Error("Cannot edit a cancelled prescription");

        }

        return repository.updatePrescription(prescriptionId, {

            chief_complaint: data.chief_complaint,
            clinical_notes: data.clinical_notes,
            advice: data.advice,
            followup_date: data.followup_date
                ? new Date(data.followup_date)
                : undefined,
            diagnosis_id: data.diagnosis_id,
            status: nextStatus ?? existing.status,
            updated_by: updatedBy

        });

    }

    async deletePrescription(prescriptionId: string, updatedBy: string) {

        const existing = await repository.getPrescriptionById(prescriptionId);

        if (!existing) {
            throw new Error("Prescription not found");
        }

        if (existing.status === PRESCRIPTION_STATUS.CANCELLED) {
            throw new Error("Prescription is already cancelled");
        }

        return repository.updatePrescription(prescriptionId, {
            status: PRESCRIPTION_STATUS.CANCELLED,
            updated_by: updatedBy
        });

    }

    async getPrescriptionItems(prescriptionId: string) {

        const existing = await repository.getPrescriptionById(prescriptionId);

        if (!existing) {
            throw new Error("Prescription not found");
        }

        return repository.getPrescriptionItems(prescriptionId);

    }

    async addPrescriptionItem(
        prescriptionId: string,
        data: CreatePrescriptionItemDTO
    ) {

        const existing = await repository.getPrescriptionById(prescriptionId);

        if (!existing) {
            throw new Error("Prescription not found");
        }

        if (existing.status !== PRESCRIPTION_STATUS.DRAFT) {
            throw new Error("Cannot add items to a prescription that is not in draft status");
        }

        const medicine = await repository.findMedicine(data.medicine_id);

        if (!medicine) {
            throw new Error(`Medicine not found: ${data.medicine_id}`);
        }

        const duplicate = await repository.findDuplicateMedicineItem(
            prescriptionId,
            data.medicine_id
        );

        if (duplicate) {
            throw new Error("This medicine already exists in the prescription");
        }

        const quantity = computeQuantity(data);

        return prisma.$transaction(async (tx) => {

            const itemId = await repository.generatePrescriptionItemId(tx);

            return repository.createPrescriptionItem(tx, {

                prescription_item_id: itemId,
                prescription_id: prescriptionId,
                medicine_id: data.medicine_id,
                medicine_name: medicine.medicine_name,
                dosage: data.dosage,
                dosage_unit: data.dosage_unit,
                strength: data.strength ?? medicine.strength ?? undefined,
                route: data.route ?? medicine.route ?? undefined,
                frequency: data.frequency,
                timing: data.timing,
                duration_value: data.duration_value,
                duration_unit: data.duration_unit,
                quantity,
                refill_count: data.refill_count,
                instructions: data.instructions,
                substitution_allowed: data.substitution_allowed,
                notes: data.notes

            });

        });

    }

    async updatePrescriptionItem(
        prescriptionId: string,
        itemId: string,
        data: UpdatePrescriptionItemDTO
    ) {

        const existing = await repository.getPrescriptionById(prescriptionId);

        if (!existing) {
            throw new Error("Prescription not found");
        }

        if (existing.status !== PRESCRIPTION_STATUS.DRAFT) {
            throw new Error("Cannot edit items on a prescription that is not in draft status");
        }

        const item = await repository.findPrescriptionItem(prescriptionId, itemId);

        if (!item) {
            throw new Error("Prescription item not found");
        }

        let medicineName = item.medicine_name;
        let resolvedStrength = data.strength;
        let resolvedRoute = data.route;

        if (data.medicine_id && data.medicine_id !== item.medicine_id) {

            const medicine = await repository.findMedicine(data.medicine_id);

            if (!medicine) {
                throw new Error(`Medicine not found: ${data.medicine_id}`);
            }

            const duplicate = await repository.findDuplicateMedicineItem(
                prescriptionId,
                data.medicine_id,
                itemId
            );

            if (duplicate) {
                throw new Error("This medicine already exists in the prescription");
            }

            medicineName = medicine.medicine_name;
            resolvedStrength = data.strength ?? medicine.strength ?? undefined;
            resolvedRoute = data.route ?? medicine.route ?? undefined;

        }

        const quantity = computeQuantity({
            quantity: data.quantity,
            frequency: data.frequency ?? item.frequency ?? undefined,
            duration_value: data.duration_value ?? item.duration_value ?? undefined,
            duration_unit: data.duration_unit ?? item.duration_unit ?? undefined
        }) ?? item.quantity ?? undefined;

        return repository.updatePrescriptionItem(itemId, {

            medicine_id: data.medicine_id,
            medicine_name: medicineName,
            dosage: data.dosage,
            dosage_unit: data.dosage_unit,
            strength: resolvedStrength,
            route: resolvedRoute,
            frequency: data.frequency,
            timing: data.timing,
            duration_value: data.duration_value,
            duration_unit: data.duration_unit,
            quantity,
            refill_count: data.refill_count,
            instructions: data.instructions,
            substitution_allowed: data.substitution_allowed,
            dispense_status: data.dispense_status,
            notes: data.notes

        });

    }

    async deletePrescriptionItem(prescriptionId: string, itemId: string) {

        const existing = await repository.getPrescriptionById(prescriptionId);

        if (!existing) {
            throw new Error("Prescription not found");
        }

        if (existing.status !== PRESCRIPTION_STATUS.DRAFT) {
            throw new Error("Cannot remove items from a prescription that is not in draft status");
        }

        const item = await repository.findPrescriptionItem(prescriptionId, itemId);

        if (!item) {
            throw new Error("Prescription item not found");
        }

        return repository.deletePrescriptionItem(itemId);

    }

}*/}
