import { Prisma } from "@prisma/client";
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
            where: {
                  branch_status: "Active"
            },
            include: {
                hospital: true
            }
        });
    }

    async getBranchById(branchId: string) {
        return await prisma.branch.findUnique({
            where: {
                branch_id: branchId
            },
            include: {
                hospital: true
            }
        });
    }

    async updateBranch(branchId: string, data: Prisma.branchUpdateInput) {
        return await prisma.branch.update({
            where: {
                branch_id: branchId
            },
            data
        });
    }
    async deleteBranch(branchId: string) {
    return await prisma.branch.update({
        where: {
            branch_id: branchId
        },
        data: {
            branch_status: "Inactive"
        }
    });
}
}