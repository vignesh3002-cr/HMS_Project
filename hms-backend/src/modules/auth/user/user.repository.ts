import prisma from "../../../config/prisma";

export class UserRepository {

    async findByUsername(username: string) {

        return prisma.user_table.findFirst({
            where: {
                username
            }
        });

    }

    async findLastUser(role: string) {

        return prisma.user_table.findFirst({

            where: {
                role_type: role
            },

            orderBy: {
                id: "desc"
            }

        });

    }
        async findByMobile(mobile: string) {
        return prisma.employees.findFirst({
            where: {
                mobile_no: mobile
            }
        });
    }

    async create(data: any) {

        return prisma.user_table.create({
            data
        });

    }
    async findByEmail(email: string) {
        return prisma.employees.findFirst({
            where: {
                email
            }
        });
    }

}