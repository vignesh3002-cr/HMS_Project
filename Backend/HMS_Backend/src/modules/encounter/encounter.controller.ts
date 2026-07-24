import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { EncounterService } from "./encounter.service";

const service = new EncounterService();

export class EncounterController {

    async createEncounter(req: Request, res: Response) {

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

            const encounter = await service.createEncounter(req.body, createdBy);

            return res.status(201).json({
                success: true,
                message: "Encounter created successfully",
                data: encounter
            });

        } catch (error: any) {

            return res.status(400).json({
                success: false,
                message: error.message
            });

        }

    }

    async getEncounters(req: Request, res: Response) {

        try {

            const errors = validationResult(req);

            if (!errors.isEmpty()) {

                return res.status(400).json({
                    success: false,
                    message: errors.array()[0].msg,
                    errors: errors.array()
                });

            }

            const encounters = await service.getEncounters({

                branchId: req.query.branchId as string,
                doctorId: req.query.doctorId as string,
                patientId: req.query.patientId as string,
                status: req.query.status as string,
                encounterType: req.query.encounterType as string,
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
                message: "Encounters fetched successfully",
                data: encounters
            });

        } catch (error: any) {

            return res.status(500).json({
                success: false,
                message: error.message
            });

        }

    }

    async getEncounterByNumber(req: Request, res: Response) {

        try {

            const encounter = await service.getEncounterByNumber(
                req.params.encounterNo as string
            );

            return res.json({
                success: true,
                message: "Encounter fetched successfully",
                data: encounter
            });

        } catch (error: any) {

            return res.status(404).json({
                success: false,
                message: error.message
            });

        }

    }

    async updateEncounter(req: Request, res: Response) {

        try {

            const errors = validationResult(req);

            if (!errors.isEmpty()) {

                return res.status(400).json({
                    success: false,
                    message: errors.array()[0].msg,
                    errors: errors.array()
                });

            }

            const encounter = await service.updateEncounter(
                req.params.encounterNo as string,
                req.body
            );

            return res.json({
                success: true,
                message: "Encounter updated successfully",
                data: encounter
            });

        } catch (error: any) {

            return res.status(400).json({
                success: false,
                message: error.message
            });

        }

    }

    async closeEncounter(req: Request, res: Response) {

        try {

            const closedBy = (req as any).user?.role || "SYSTEM";

            const encounter = await service.closeEncounter(
                req.params.encounterNo as string,
                closedBy
            );

            return res.json({
                success: true,
                message: "Encounter closed successfully",
                data: encounter
            });

        } catch (error: any) {

            return res.status(400).json({
                success: false,
                message: error.message
            });

        }

    }

}
