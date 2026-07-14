import { Request, Response } from "express";
import {DepartmentService} from "./department.services";
const departmentService = new DepartmentService();
export class DepartmentController {
    async getAllDepartments(req: Request, res: Response) {
        try {
            const departments = await departmentService.getAllDepartments();
            return res.status(200).json({
                success: true,
                data: departments
            });
        } catch (error: any) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
}