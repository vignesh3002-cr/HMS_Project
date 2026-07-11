import prisma from "../../config/prisma";

export class AuthRepository {

  async findUserByUsername(username: string) {

    return prisma.user_table.findFirst({
      where: {
        username: username,
      },
      include: {
          branch: true
      }
    });

  }

}