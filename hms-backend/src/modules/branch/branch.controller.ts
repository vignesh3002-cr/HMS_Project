import { Request, Response } from "express";
import { BranchService } from "./branch.service";

const service = new BranchService();

export class BranchController {

    async createBranch(req: Request, res: Response) {

        try {

            const createdBy = "SA001"; // Replace later with JWT logged-in user

            const result = await service.createBranch(
                req.body,
                createdBy
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