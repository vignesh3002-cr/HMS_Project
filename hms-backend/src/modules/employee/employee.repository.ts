import prisma from "../../config/prisma";

export class EmployeeRepository {

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

    async findAadhaar(aadhaar: string) {
        return prisma.employees.findFirst({
            where: {
                aadhaar_no: aadhaar
            }
        });
    }

    async findPAN(pan: string) {
        return prisma.employees.findFirst({
            where: {
                pan_no: pan
            }
        });
    }

    async findLicense(license: string) {
        return prisma.doctor_profile.findFirst({
            where: {
                license_no: license
            }
        });
    }

    async findDepartment(id: string) {
        return prisma.department_master.findUnique({
            where: {
                department_id: id
            }
        });
    }

    async findBranch(branchId: string) {
        return prisma.branch.findUnique({
            where: {
                branch_id: branchId
            }
        });
    }
}