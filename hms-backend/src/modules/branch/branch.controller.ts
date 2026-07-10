import { Response } from "express";
import { AuthRequest } from "../auth/auth.middleware";
import { BranchService } from "./branch.service";

const service = new BranchService();

export class BranchController {

    async getAllBranches(req: AuthRequest, res: Response) {

        try {

            const createdBy = req.user!.role_id;
            const hospitalId = req.user!.hospital_id;

            const result = await service.getAllBranches(createdBy, hospitalId);

            return res.status(200).json(result);

        } catch (error: any) {

            return res.status(500).json({
                success: false,
                message: error.message
            });

        }

    }

    async createBranch(req: AuthRequest, res: Response) {

        try {

            const createdBy = req.user!.role;
            const hospitalId = req.user!.hospital_id;
            console.log("by user", createdBy);
            console.log("hospital id", hospitalId);

            const result = await service.createBranch(
                req.body,
                createdBy,
                hospitalId
            );

            return res.status(201).json({
                success: true,
                message: "Branch created successfully",
                data: result
            });

        } catch (error: any) {

            return res.status(400).json({
                success: false,
                message: error.message
            });

        }

    }

}