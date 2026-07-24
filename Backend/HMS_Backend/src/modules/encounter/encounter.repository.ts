import { Prisma } from "@prisma/client";
import prisma from "../../config/prisma";
import { generateId } from "../../utils/idGenerator";
import { GetEncountersQuery } from "./encounter.types";

const encounterDetailInclude = {

    patient_bio_data: {
        select: {
            patient_id: true,
            patient_first_name: true,
            patient_middle_name: true,
            patient_last_name: true,
            patient_gender: true,
            patient_primary_mobile: true
        }
    },

    employees: {
        select: {
            employee_id: true,
            first_name: true,
            middle_name: true,
            last_name: true,
            specialization: true
        }
    },

    branch: {
        select: {
            branch_id: true,
            branch_name: true,
            branch_area: true
        }
    },

    department_master: {
        select: {
            department_id: true,
            department_name: true
        }
    },

    appointment_history: {
        select: {
            appointment_id: true,
            appointment_date: true,
            appointment_time: true,
            status: true,
            reason_for_visit: true,
            token_number: true
        }
    },

    doctor_schedule: {
        select: {
            schedule_id: true,
            day_of_week: true,
            shift_name: true
        }
    },

    _count: {
        select: {
            lab_order: true
        }
    }

} satisfies Prisma.encounterInclude;

export class EncounterRepository {

    async findAppointmentForEncounter(appointmentId: string) {

        return prisma.appointment_history.findUnique({

            where: { appointment_id: appointmentId },

            include: {
                patient_bio_data: true,
                employees: {
                    include: {
                        user_table: { select: { role_type: true } }
                    }
                },
                branch: true,
                department_master: true,
                doctor_schedule: true
            }

        });

    }

    async findDiagnosis(diagnosisId: string) {

        return prisma.diagnosis.findUnique({
            where: { diagnosis_id: diagnosisId }
        });

    }

    async findDoctorBranchMapping(employeeId: string, branchId: string) {

        return prisma.user_branch_mapping.findFirst({
            where: {
                employee_id: employeeId,
                branch_id: branchId,
                status: 1
            }
        });

    }

    async findEncounterByAppointmentId(appointmentId: string) {

        return prisma.encounter.findUnique({
            where: { appointment_id: appointmentId }
        });

    }

    async generateEncounterNumber(tx: Prisma.TransactionClient) {

        return generateId(tx, "ENCOUNTER");

    }

    async createEncounter(
        tx: Prisma.TransactionClient,
        data: Prisma.encounterUncheckedCreateInput
    ) {

        return tx.encounter.create({
            data
        });

    }

    async updateAppointmentStatus(
        tx: Prisma.TransactionClient,
        appointmentId: string,
        status: string
    ) {

        return tx.appointment_history.update({
            where: { appointment_id: appointmentId },
            data: { status }
        });

    }

    async getEncounterByNumber(encounterNo: string) {

        return prisma.encounter.findUnique({
            where: { encounter_no: encounterNo },
            include: encounterDetailInclude
        });

    }

    async updateEncounter(
        encounterNo: string,
        data: Prisma.encounterUncheckedUpdateInput
    ) {

        return prisma.encounter.update({
            where: { encounter_no: encounterNo },
            data,
            include: encounterDetailInclude
        });

    }

    async closeEncounter(
        tx: Prisma.TransactionClient,
        encounterNo: string,
        data: Prisma.encounterUncheckedUpdateInput
    ) {

        return tx.encounter.update({
            where: { encounter_no: encounterNo },
            data,
            include: encounterDetailInclude
        });

    }

    async getEncounters(query: GetEncountersQuery) {

        const {
            branchId,
            doctorId,
            patientId,
            status,
            encounterType,
            date,
            dateFrom,
            dateTo,
            search,
            sortBy = "encounter_ts",
            sortOrder = "desc",
            page = 1,
            limit = 10
        } = query;

        const where: Prisma.encounterWhereInput = {};

        if (branchId) where.branch_id = branchId;
        if (doctorId) where.employee_id = doctorId;
        if (patientId) where.patient_id = patientId;
        if (status) where.status = status;
        if (encounterType) where.encounter_type = encounterType;

        if (date) {

            where.encounter_ts = {
                gte: startOfDay(date),
                lt: startOfNextDay(date)
            };

        } else if (dateFrom || dateTo) {

            where.encounter_ts = {
                ...(dateFrom ? { gte: startOfDay(dateFrom) } : {}),
                ...(dateTo ? { lt: startOfNextDay(dateTo) } : {})
            };

        }

        if (search) {

            where.OR = [
                { encounter_no: { contains: search, mode: "insensitive" } },
                {
                    patient_bio_data: {
                        OR: [
                            { patient_first_name: { contains: search, mode: "insensitive" } },
                            { patient_last_name: { contains: search, mode: "insensitive" } }
                        ]
                    }
                },
                {
                    employees: {
                        OR: [
                            { first_name: { contains: search, mode: "insensitive" } },
                            { last_name: { contains: search, mode: "insensitive" } }
                        ]
                    }
                }
            ];

        }

        const orderBy: Prisma.encounterOrderByWithRelationInput =
            sortBy === "created_at"
                ? { created_at: sortOrder }
                : sortBy === "status"
                ? { status: sortOrder }
                : { encounter_ts: sortOrder };

        const [encounters, total] = await Promise.all([

            prisma.encounter.findMany({
                where,
                include: encounterDetailInclude,
                orderBy,
                skip: (page - 1) * limit,
                take: limit
            }),

            prisma.encounter.count({ where })

        ]);

        return {

            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            encounters

        };

    }

}

function startOfDay(date: string): Date {
    return new Date(`${date}T00:00:00.000Z`);
}

function startOfNextDay(date: string): Date {
    const day = startOfDay(date);
    day.setUTCDate(day.getUTCDate() + 1);
    return day;
}
