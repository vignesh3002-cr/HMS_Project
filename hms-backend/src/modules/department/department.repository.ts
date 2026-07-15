import prisma from "../../config/prisma";

export class DepartmentRepository {
    async getAllDepartments() {
        return await prisma.department_master.findMany({
            orderBy: {
                department_name: "asc"
            }
        });
    }
}