import {Request, Response } from "express";
import { EmployeeService } from "./employee.service";

const service = new EmployeeService();

export class EmployeeController {

    async createEmployee(req: Request, res: Response) {

        try {

            const createdBy = (req as any).user?.role || "SYSTEM";

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
    async updateEmployee(req: Request, res: Response) {
    try {



        const employee = await service.updateEmployee(
            String(req.params.employeeId),
            req.body
        );

        return res.status(200).json({
            success: true,
            data: employee
        });

    } catch (error: any) {

        return res.status(400).json({
            success: false,
            message: error.message
        });

    }
    
}
async softDeleteEmployee(req: Request, res: Response) {

    try {

        const result = await service.softDeleteEmployee(
            String(req.params.employeeId)
        );

        return res.status(200).json({
            success: true,
            message: result.message
        });

    } catch (error: any) {

        return res.status(400).json({
            success: false,
            message: error.message
        });

    }

}
 async getAllEmployees(req: Request, res: Response) {

        try {

            const query = {
                roleType: req.query.roleType as string | undefined,
                branchId: req.query.branchId as string | undefined,
                department: req.query.department as string | undefined,
                status: req.query.status !== undefined ? req.query.status === "true" : undefined,
                search: req.query.search as string | undefined,
                page: req.query.page ? Number(req.query.page) : 1,
                limit: req.query.limit ? Number(req.query.limit) : 10,
            };

            const result = await service.getEmployees(query);

            return res.status(200).json({
                success: true,
                message: "Employees fetched successfully",
                data: result
            });

        } catch (error: any) {

            return res.status(400).json({
                success: false,
                message: error.message
            });

        }

    }
    async getEmployeeById(req: Request, res: Response) {

        try {
            console.log("Fetching employee by ID:", req.params.employeeId);
            const employee = await service.getEmployeeById(String(req.params.employeeId));
            
            return res.status(200).json({
                success: true,
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