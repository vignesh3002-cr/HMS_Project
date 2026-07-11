import prisma from "../../config/prisma";

export class BranchRepository {

    async findBranchCode(branchCode: string) {
        return prisma.branch.findFirst({
            where: {
                branch_code: branchCode
            }
        });
    }

    async findUsername(username: string) {
        return prisma.user_table.findFirst({
            where: {
                username
            }
        });
    }

    async findEmail(email: string) {
        return prisma.employees.findFirst({
            where: {
                email
            }
        });
    }

    async findMobile(mobile: string) {
        return prisma.employees.findFirst({
            where: {
                mobile_no: mobile
            }
        });
    }
        async getAllBranches(role_id: string) {
        return await prisma.user_table.findMany({
            where: {
               created_by : role_id
            },
            orderBy: {
                id: "desc"
            },
            include: {
                branch: true
            }
        });
    }

}