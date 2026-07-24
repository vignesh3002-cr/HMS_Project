{/*import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { PrescriptionService } from "./prescription.service";

const service = new PrescriptionService();

export class PrescriptionController {

    async createPrescription(req: Request, res: Response) {

        try {

            const errors = validationResult(req);

            if (!errors.isEmpty()) {

                return res.status(400).json({
                    success: false,
                    message: errors.array()[0].msg,
                    errors: errors.array()
                });

            }

            const createdBy = (req as any).user?.role || "SYSTEM";

            const prescription = await service.createPrescription(req.body, createdBy);

            return res.status(201).json({
                success: true,
                message: "Prescription created successfully",
                data: prescription
            });

        } catch (error: any) {

            return res.status(400).json({
                success: false,
                message: error.message
            });

        }

    }

    async getPrescriptions(req: Request, res: Response) {

        try {

            const errors = validationResult(req);

            if (!errors.isEmpty()) {

                return res.status(400).json({
                    success: false,
                    message: errors.array()[0].msg,
                    errors: errors.array()
                });

            }

            const prescriptions = await service.getPrescriptions({

                branchId: req.query.branchId as string,
                doctorId: req.query.doctorId as string,
                patientId: req.query.patientId as string,
                encounterId: req.query.encounterId as string,
                status: req.query.status as string,
                date: req.query.date as string,
                dateFrom: req.query.dateFrom as string,
                dateTo: req.query.dateTo as string,
                search: req.query.search as string,
                sortBy: req.query.sortBy as any,
                sortOrder: req.query.sortOrder as any,
                page: Number(req.query.page || 1),
                limit: Number(req.query.limit || 10)

            });

            return res.json({
                success: true,
                message: "Prescriptions fetched successfully",
                data: prescriptions
            });

        } catch (error: any) {

            return res.status(500).json({
                success: false,
                message: error.message
            });

        }

    }

    async getPrescriptionById(req: Request, res: Response) {

        try {

            const prescription = await service.getPrescriptionById(
                req.params.prescriptionId as string
            );

            return res.json({
                success: true,
                message: "Prescription fetched successfully",
                data: prescription
            });

        } catch (error: any) {

            return res.status(404).json({
                success: false,
                message: error.message
            });

        }

    }

    async updatePrescription(req: Request, res: Response) {

        try {

            const errors = validationResult(req);

            if (!errors.isEmpty()) {

                return res.status(400).json({
                    success: false,
                    message: errors.array()[0].msg,
                    errors: errors.array()
                });

            }

            const updatedBy = (req as any).user?.role || "SYSTEM";

            const prescription = await service.updatePrescription(
                req.params.prescriptionId as string,
                req.body,
                updatedBy
            );

            return res.json({
                success: true,
                message: "Prescription updated successfully",
                data: prescription
            });

        } catch (error: any) {

            return res.status(400).json({
                success: false,
                message: error.message
            });

        }

    }

    async deletePrescription(req: Request, res: Response) {

        try {

            const updatedBy = (req as any).user?.role || "SYSTEM";

            const prescription = await service.deletePrescription(
                req.params.prescriptionId as string,
                updatedBy
            );

            return res.json({
                success: true,
                message: "Prescription cancelled successfully",
                data: prescription
            });

        } catch (error: any) {

            return res.status(400).json({
                success: false,
                message: error.message
            });

        }

    }

    async getPrescriptionItems(req: Request, res: Response) {

        try {

            const items = await service.getPrescriptionItems(
                req.params.prescriptionId as string
            );

            return res.json({
                success: true,
                message: "Prescription items fetched successfully",
                data: items
            });

        } catch (error: any) {

            return res.status(404).json({
                success: false,
                message: error.message
            });

        }

    }

    async addPrescriptionItem(req: Request, res: Response) {

        try {

            const errors = validationResult(req);

            if (!errors.isEmpty()) {

                return res.status(400).json({
                    success: false,
                    message: errors.array()[0].msg,
                    errors: errors.array()
                });

            }

            const item = await service.addPrescriptionItem(
                req.params.prescriptionId as string,
                req.body
            );

            return res.status(201).json({
                success: true,
                message: "Medicine added to prescription successfully",
                data: item
            });

        } catch (error: any) {

            return res.status(400).json({
                success: false,
                message: error.message
            });

        }

    }

    async updatePrescriptionItem(req: Request, res: Response) {

        try {

            const errors = validationResult(req);

            if (!errors.isEmpty()) {

                return res.status(400).json({
                    success: false,
                    message: errors.array()[0].msg,
                    errors: errors.array()
                });

            }

            const item = await service.updatePrescriptionItem(
                req.params.prescriptionId as string,
                req.params.itemId as string,
                req.body
            );

            return res.json({
                success: true,
                message: "Prescription item updated successfully",
                data: item
            });

        } catch (error: any) {

            return res.status(400).json({
                success: false,
                message: error.message
            });

        }

    }

    async deletePrescriptionItem(req: Request, res: Response) {

        try {

            await service.deletePrescriptionItem(
                req.params.prescriptionId as string,
                req.params.itemId as string
            );

            return res.json({
                success: true,
                message: "Prescription item removed successfully"
            });

        } catch (error: any) {

            return res.status(400).json({
                success: false,
                message: error.message
            });

        }

    }

}
*/}