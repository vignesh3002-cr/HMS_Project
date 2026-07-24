import bcrypt from "bcrypt";
import prisma from "../../config/prisma";
import { PatientRepository } from "./patient.repository";
import {
    CreatePatientRequest,
    UpdatePatientRequest,
    GetPatientsQuery
} from "./patient.types";
import { generateId } from "../../utils/idGenerator";

const repository = new PatientRepository();

export class PatientService {

    async createPatient(data: CreatePatientRequest,createdBy: string) {

        const username = await repository.findUsername(data.username);

        if (username) {
            throw new Error("Username already exists");
        }

        if (data.email) {

            const email = await repository.findEmail(data.email);

            if (email) {
                throw new Error("Email already exists");
            }

        }

        const mobile = await repository.findMobile(data.mobile);

        if (mobile) {
            throw new Error("Mobile already exists");
        }

        const branch = await repository.findBranch(data.branch_id);

        if (!branch) {
            throw new Error("Branch not found");
        }

        const hashedPassword = await bcrypt.hash(
            data.password,
            Number(process.env.BCRYPT_SALT_ROUNDS)
        );

        return prisma.$transaction(async (tx) => {

            const userId = await generateId(tx, "USER");

            const user = await tx.user_table.create({

                data: {

                    user_id: userId,

                    username: data.username,

                    password: hashedPassword,

                    role_type: "PATIENT",

                    created_by: createdBy,

                    branch_id: data.branch_id,

                    user_status: 0

                }

            });

            const patientId = await generateId(tx, "PATIENT");

            const patient = await tx.patient_bio_data.create({

                data: {

                    patient_id: patientId,

                    user_id: user.user_id,

                    branch_id: data.branch_id,

                    patient_first_name: data.first_name,

                    patient_middle_name: data.middle_name,

                    patient_last_name: data.last_name,

                    patient_gender: data.gender,

                    patient_dob: data.dob
                        ? new Date(data.dob)
                        : undefined,

                    patient_age: data.age,

                    patient_blood_group: data.blood_group,

                    patient_primary_mobile: data.mobile,

                    patient_alternate_mobile: data.alternate_mobile,

                    patient_email: data.email,

                    patient_marital_status: data.marital_status,

                    patient_nationality: data.nationality,

                    patient_photo_url: data.photo,

                    patient_type: data.patient_type,

                    patient_active: "Active",
                    patient_state:data.patient_state,
                    patient_district:data.patient_district,
                    patient_area:data.patient_area,
                    patient_pincode:data.patient_pincode

                }

            });

            return {

                patient: {
                    patient_id: patient.patient_id,
                    patient_first_name: patient.patient_first_name,
                    patient_middle_name: patient.patient_middle_name,
                    patient_last_name: patient.patient_last_name
                },

                user: {
                    user_id: user.user_id,
                    username: user.username
                }

            };

        });

    }

    async getPatients(query: GetPatientsQuery) {

        return repository.getPatients(query);

    }

    async getPatientById(patientId: string) {

        const patient = await repository.getPatientById(patientId);

        if (!patient) {
            throw new Error("Patient not found");
        }

        return patient;

    }

    async updatePatient(
        patientId: string,
        data: UpdatePatientRequest
    ) {

        const existing = await repository.getPatientById(patientId);

        if (!existing) {
            throw new Error("Patient not found");
        }

        if (
            data.email &&
            data.email !== existing.patient_email
        ) {

            const email = await repository.findEmail(data.email);

            if (email) {
                throw new Error("Email already exists");
            }

        }

        if (
            data.mobile &&
            data.mobile !== existing.patient_primary_mobile
        ) {

            const mobile = await repository.findMobile(data.mobile);

            if (mobile) {
                throw new Error("Mobile already exists");
            }

        }

        if (data.branch_id) {

            const branch = await repository.findBranch(data.branch_id);

            if (!branch) {
                throw new Error("Branch not found");
            }

        }

        return repository.updatePatient(patientId, {

            patient_first_name: data.first_name,

            patient_middle_name: data.middle_name,

            patient_last_name: data.last_name,

            patient_gender: data.gender,

            patient_dob: data.dob
                ? new Date(data.dob)
                : undefined,

            patient_age: data.age,

            patient_blood_group: data.blood_group,

            patient_primary_mobile: data.mobile,

            patient_alternate_mobile: data.alternate_mobile,

            patient_email: data.email,

            patient_marital_status: data.marital_status,

            patient_nationality: data.nationality,

            patient_photo_url: data.photo,

            patient_type: data.patient_type,

            patient_active: data.patient_active,
            patient_state:data.patient_state,
            patient_district:data.patient_district,
            patient_area:data.patient_area,
            patient_pincode:data.patient_pincode,

            branch: data.branch_id
                ? {
                    connect: {
                        branch_id: data.branch_id
                    }
                }
                : undefined

        });

    }

}
