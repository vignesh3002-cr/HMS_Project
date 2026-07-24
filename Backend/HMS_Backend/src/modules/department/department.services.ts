import prisma from "../../config/prisma";
import { generateId } from "../../utils/idGenerator";
import { DepartmentRepository } from "./department.repository";
import { CreateDepartmentDto } from "./department.types";

const departmentRepository = new DepartmentRepository();

export class DepartmentService {

    async getAllDepartments() {
        const departments = await departmentRepository.getAllDepartments();

        return departments.map((department) => ({
            department_id: department.department_id,
            department_name: department.department_name
        }));
    }

    async createDepartment(data: CreateDepartmentDto) {
        
        const existingDepartment = await departmentRepository.findDepartmentByName(
        data.department_name
    );

    if (existingDepartment) {
        throw new Error("Department already exists");
    }

    const result = await prisma.$transaction(async (tx) => {

        const departmentId = await generateId(
            tx,
            "DEPARTMENT"
        );

        const department = await departmentRepository.createDepartment(
            tx,
            {
                department_id: departmentId,
                department_name: data.department_name
            }
        );

        return {
            department_id: department.department_id,
            department_name: department.department_name
        };

    });

    return result;
}

}

    

