import prisma from "../../../config/prisma";

export class UserRepository {

    async findByUsername(username: string) {

        return prisma.global_master.findFirst({
            where: {
                username
            }
        });

    }

    async findLastUser(role: string) {

        return prisma.global_master.findFirst({

            where: {
                role_type: role
            },

            orderBy: {
                branch_id: "desc"
            }

        });

    }
        async findByMobile(mobile: string) {
        return prisma.global_master.findFirst({
            where: {
                mobile
            }
        });
    }

    async create(data: any) {

        return prisma.global_master.create({
            data
        });

    }
    async findByEmail(email: string) {
    return prisma.global_master.findFirst({
        where: {
            email
        }
    });
}

}