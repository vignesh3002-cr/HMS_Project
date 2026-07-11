import { Request, Response } from "express";
import { EmployeeService } from "./employee.service";

const service = new EmployeeService();

export class EmployeeController {

    async createEmployee(req: Request, res: Response) {

        try {

            // Later this will come from JWT
            const createdBy = "SYSTEM";

            const result = await service.createEmployee(
                req.body,
                createdBy
            );

            return res.status(201).json({
                success: true,
                message: "Employee created successfully",
                data: result.data
            });

        } catch (error: any) {

            return res.status(400).json({
                success: false,
                message: error.message
            });

        }

    }

}