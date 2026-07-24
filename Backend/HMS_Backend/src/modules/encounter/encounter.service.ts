import prisma from "../../config/prisma";
import { EncounterRepository } from "./encounter.repository";
import { CreateEncounterDTO, UpdateEncounterDTO, GetEncountersQuery } from "./encounter.types";
import { ENCOUNTER_STATUS, ENCOUNTER_TYPE_DEFAULT } from "./encounter.constants";
import { APPOINTMENT_STATUS, TERMINAL_APPOINTMENT_STATUSES } from "../appointment/appointment.constants";

const repository = new EncounterRepository();

export class EncounterService {

    async createEncounter(data: CreateEncounterDTO, createdBy: string) {

        const appointment = await repository.findAppointmentForEncounter(
            data.appointment_id
        );

        if (!appointment) {
            throw new Error("Appointment not found");
        }

        if (TERMINAL_APPOINTMENT_STATUSES.includes(appointment.status ?? "")) {
            throw new Error(
                `Cannot create an encounter for an appointment that is already ${appointment.status}`
            );
        }

        const patient = appointment.patient_bio_data;

        if (!patient) {
            throw new Error("Patient not found");
        }

        if (patient.patient_active !== "Active") {
            throw new Error("Patient is inactive");
        }

        const doctor = appointment.employees;

        if (!doctor || !doctor.employee_id) {
            throw new Error("Doctor not found");
        }

        if (doctor.user_table?.role_type !== "DOCTOR") {
            throw new Error("Assigned employee is not a doctor");
        }

        if (doctor.emp_status !== true) {
            throw new Error("Doctor is inactive");
        }

        const branch = appointment.branch;

        if (!branch || !appointment.branch_id) {
            throw new Error("Branch not found");
        }

        if (branch.branch_status !== "Active") {
            throw new Error("Branch is inactive");
        }

        const mapping = await repository.findDoctorBranchMapping(
            doctor.employee_id,
            appointment.branch_id
        );

        if (!mapping) {
            throw new Error("Doctor is not assigned to the appointment's branch");
        }

        if (!appointment.schedule_id) {
            throw new Error("Appointment has no associated doctor schedule");
        }

        if (!appointment.doctor_schedule || !appointment.doctor_schedule.is_active) {
            throw new Error("Doctor schedule is not active");
        }

        const existingEncounter = await repository.findEncounterByAppointmentId(
            data.appointment_id
        );

        if (existingEncounter) {
            throw new Error("Encounter already exists for this appointment");
        }

        try {

            return await prisma.$transaction(async (tx) => {

                const encounterNo = await repository.generateEncounterNumber(tx);

                const encounter = await repository.createEncounter(tx, {

                    encounter_no: encounterNo,
                    patient_id: appointment.patient_id,
                    branch_id: appointment.branch_id!,
                    department_id: appointment.department_id,
                    appointment_id: appointment.appointment_id,
                    employee_id: doctor.employee_id!,
                    schedule_id: appointment.schedule_id!,
                    encounter_type: ENCOUNTER_TYPE_DEFAULT,
                    status: ENCOUNTER_STATUS.OPEN

                });

                await repository.updateAppointmentStatus(
                    tx,
                    appointment.appointment_id,
                    APPOINTMENT_STATUS.IN_CONSULTATION
                );

                return encounter;

            });

        } catch (error: any) {

            // Guards against two concurrent requests both passing the
            // pre-check above and racing to create the same encounter -
            // the DB's unique constraint on appointment_id is the real guard.
            if (error?.code === "P2002") {
                throw new Error("Encounter already exists for this appointment");
            }

            throw error;

        }

    }

    async getEncounters(query: GetEncountersQuery) {

        return repository.getEncounters(query);

    }

    async getEncounterByNumber(encounterNo: string) {

        const encounter = await repository.getEncounterByNumber(encounterNo);

        if (!encounter) {
            throw new Error("Encounter not found");
        }

        return encounter;

    }

    async updateEncounter(encounterNo: string, data: UpdateEncounterDTO) {

        const existing = await repository.getEncounterByNumber(encounterNo);

        if (!existing) {
            throw new Error("Encounter not found");
        }

        if (existing.status !== ENCOUNTER_STATUS.OPEN) {
            throw new Error("Cannot update an encounter that is not OPEN");
        }

        if (data.diagnosis_id) {

            const diagnosis = await repository.findDiagnosis(data.diagnosis_id);

            if (!diagnosis) {
                throw new Error("Diagnosis not found");
            }

        }

        return repository.updateEncounter(encounterNo, {

            chief_complaint: data.chief_complaint,
            symptoms: data.symptoms,
            diagnosis_id: data.diagnosis_id,
            clinical_notes: data.clinical_notes,
            advice: data.advice,
            follow_up_date: data.follow_up_date
                ? new Date(data.follow_up_date)
                : undefined,

            height: data.height,
            weight: data.weight,
            pulse: data.pulse,
            systolic_bp: data.systolic_bp,
            diastolic_bp: data.diastolic_bp,
            temperature: data.temperature,
            respiratory_rate: data.respiratory_rate,
            spo2: data.spo2

        });

    }

    async closeEncounter(encounterNo: string, closedBy: string) {

        const existing = await repository.getEncounterByNumber(encounterNo);

        if (!existing) {
            throw new Error("Encounter not found");
        }

        if (existing.status !== ENCOUNTER_STATUS.OPEN) {
            throw new Error("Encounter is already closed");
        }

        return prisma.$transaction(async (tx) => {

            const closedAt = new Date();

            const encounter = await repository.closeEncounter(tx, encounterNo, {
                status: ENCOUNTER_STATUS.CLOSED,
                checkout_time: closedAt,
                closed_by: closedBy,
                closed_at: closedAt
            });

            if (existing.appointment_id) {

                await repository.updateAppointmentStatus(
                    tx,
                    existing.appointment_id,
                    APPOINTMENT_STATUS.COMPLETED
                );

            }

            return encounter;

        });

    }

}
