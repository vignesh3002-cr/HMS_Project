import prisma from "../../config/prisma";
import { Prisma } from "@prisma/client";

export class DepartmentRepository {

    async getAllDepartments() {
        return await prisma.department_master.findMany({
            orderBy: {
                department_name: "asc"
            }
        });
    }

    // NEW METHOD 1
    async findDepartmentByName(department_name: string) {
        return await prisma.department_master.findFirst({
            where: {
                department_name
            }
        });
    }
    // NEW METHOD 2
    async createDepartment(
    tx: Prisma.TransactionClient,
    data: {
        department_id: string;
        department_name: string;
    }
) {
    return await tx.department_master.create({
        data
    });
}
}
