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
        return prisma.global_master.findFirst({
            where: {
                username
            }
        });
    }

    async findEmail(email: string) {
        return prisma.global_master.findFirst({
            where: {
                email
            }
        });
    }

    async findMobile(mobile: string) {
        return prisma.global_master.findFirst({
            where: {
                mobile
            }
        });
    }

}