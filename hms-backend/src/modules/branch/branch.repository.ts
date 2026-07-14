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
        async getAllBranches() {
        return await prisma.branch.findMany({
            orderBy: {
                id: "desc"
            },
            include: {
                hospital: true
            }
        });
    }
        }