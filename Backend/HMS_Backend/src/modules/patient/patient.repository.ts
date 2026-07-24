import { Prisma } from "@prisma/client";
import prisma from "../../config/prisma";
import { GetPatientsQuery } from "./patient.types";

export class PatientRepository {

    async findUsername(username: string) {

        return prisma.user_table.findFirst({
            where: {
                username
            }
        });

    }

    async findMobile(mobile: string) {

        return prisma.patient_bio_data.findFirst({
            where: {
                patient_primary_mobile: mobile
            }
        });

    }

    async findEmail(email: string) {

        return prisma.patient_bio_data.findFirst({
            where: {
                patient_email: email
            }
        });

    }

    async findBranch(branchId: string) {

        return prisma.branch.findUnique({
            where: {
                branch_id: branchId
            }
        });

    }

    async getPatients(query: GetPatientsQuery) {

        const {
            branchId,
            patientType,
            status,
            search,
            page = 1,
            limit = 10
        } = query;

        const where: Prisma.patient_bio_dataWhereInput = {};

        if (branchId) {
            where.branch_id = branchId;
        }

        if (patientType) {
            where.patient_type = patientType;
        }

        if (status) {
            where.patient_active = status;
        }

        if (search) {

            where.OR = [

                {
                    patient_first_name: {
                        contains: search,
                        mode: "insensitive"
                    }
                },

                {
                    patient_last_name: {
                        contains: search,
                        mode: "insensitive"
                    }
                },

                {
                    patient_email: {
                        contains: search,
                        mode: "insensitive"
                    }
                },

                {
                    patient_primary_mobile: {
                        contains: search,
                        mode: "insensitive"
                    }
                },

                {
                    patient_id: {
                        contains: search,
                        mode: "insensitive"
                    }
                }

            ];

        }

        const patients = await prisma.patient_bio_data.findMany({

            where,

            include: {

                branch: {
                    select: {
                        branch_name: true
                    }
                },

                user_table: {
                    select: {
                        role_type: true,
                        user_status: true
                    }
                }

            },

            skip: (page - 1) * limit,

            take: limit,

            orderBy: {
                id: "desc"
            }

        });

        const total = await prisma.patient_bio_data.count({
            where
        });

        return {

            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            patients

        };

    }

    async getPatientById(patientId: string) {

        return prisma.patient_bio_data.findUnique({

            where: {
                patient_id: patientId
            },

            include: {
                branch: true,
                user_table: true
            }

        });

    }

    async updatePatient(
        patientId: string,
        data: Prisma.patient_bio_dataUpdateInput
    ) {

        return prisma.patient_bio_data.update({

            where: {
                patient_id: patientId
            },

            data

        });

    }

}
