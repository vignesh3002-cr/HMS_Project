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
     async getEmployees(req: Request, res: Response) {
        try {

        const employees =
            await service.getEmployees({

                roleType: req.query.roleType as string,

                branchId: req.query.branchId as string,

                department: req.query.department as string,

                search: req.query.search as string,

                status:
                    req.query.status !== undefined
                        ? req.query.status === "true"
                        : undefined,

                page:
                    Number(req.query.page || 1),

                limit:
                    Number(req.query.limit || 10)

            });

        res.json({

            success: true,

            message:
                "Employees fetched successfully",

            data: employees

        });

    }

    catch (error: any) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};
 async getEmployeeById (

    req: Request,

    res: Response

) {

    try {

        const employee =
            await service.getEmployeeById(
                req.params.employeeId as string
            );

        res.json({

            success: true,

            message:
                "Employee fetched successfully",

            data: employee

        });

    }

    catch (error: any) {

        res.status(404).json({

            success: false,

            message: error.message

        });

    }

};
}