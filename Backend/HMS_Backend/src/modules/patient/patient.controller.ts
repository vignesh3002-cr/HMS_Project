import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { PatientService } from "./patient.service";

const service = new PatientService();

export class PatientController {

    async createPatient(req: Request, res: Response) {

        try {

            const createdBy = (req as any).user?.role || "SYSTEM";

            const errors = validationResult(req);

            if (!errors.isEmpty()) {

                return res.status(400).json({
                    success: false,
                    message: errors.array()[0].msg,
                    errors: errors.array()
                });

            }

            const patient = await service.createPatient(req.body,createdBy);

            return res.status(201).json({
                success: true,
                message: "Patient created successfully",
                data: patient
            });

        } catch (error: any) {

            return res.status(400).json({
                success: false,
                message: error.message
            });

        }

    }

    async getPatients(req: Request, res: Response) {

        try {

            const patients = await service.getPatients({

                branchId: req.query.branchId as string,

                patientType: req.query.patientType as string,

                status: req.query.status as string,

                search: req.query.search as string,

                page: Number(req.query.page || 1),

                limit: Number(req.query.limit || 10)

            });

            return res.json({
                success: true,
                message: "Patients fetched successfully",
                data: patients
            });

        } catch (error: any) {

            return res.status(500).json({
                success: false,
                message: error.message
            });

        }

    }

    async getPatientById(req: Request, res: Response) {

        try {

            const patient = await service.getPatientById(
                req.params.patientId as string
            );

            return res.json({
                success: true,
                message: "Patient fetched successfully",
                data: patient
            });

        } catch (error: any) {

            return res.status(404).json({
                success: false,
                message: error.message
            });

        }

    }

    async updatePatient(req: Request, res: Response) {

        try {

            const errors = validationResult(req);

            if (!errors.isEmpty()) {

                return res.status(400).json({
                    success: false,
                    message: errors.array()[0].msg,
                    errors: errors.array()
                });

            }

            const patient = await service.updatePatient(
                req.params.patientId as string,
                req.body
            );

            return res.json({
                success: true,
                message: "Patient updated successfully",
                data: patient
            });

        } catch (error: any) {

            return res.status(400).json({
                success: false,
                message: error.message
            });

        }

    }

}
