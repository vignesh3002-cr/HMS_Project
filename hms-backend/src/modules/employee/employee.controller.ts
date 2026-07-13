import { Response } from "express";
import { AuthRequest } from "../auth/auth.middleware";
import { EmployeeService } from "./employee.service";

const service = new EmployeeService();

export class EmployeeController {

    async createEmployee(req: AuthRequest, res: Response) {

        try {

            const createdBy = req.user!.role || "SYSTEM";

            const employee = await service.createEmployee(
                req.body,
                createdBy
            );

            return res.status(201).json({

                success: true,

                message: "Employee created successfully",

                data: employee

            });

        } catch (error: any) {

            return res.status(400).json({

                success: false,

                message: error.message

            });

        }

    }

}