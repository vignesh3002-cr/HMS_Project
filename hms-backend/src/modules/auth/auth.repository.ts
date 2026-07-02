import prisma from "../../config/prisma";

export class AuthRepository {

  async findUserByUsername(username: string) {

    return prisma.global_master.findFirst({
      where: {
        username: username,
      },
    });

  }

}