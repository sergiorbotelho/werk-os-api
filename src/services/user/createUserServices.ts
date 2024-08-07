import { hash } from "bcryptjs";
import prismaClient from "../../prisma";
import { Prisma } from "@prisma/client";
export class CreateUserService {
  async execute({ name, email, password }: Prisma.UserCreateInput) {
    if (!email) {
      throw new Error("Email incorrect");
    }

    const userAlreadyExists = await prismaClient.user.findFirst({
      where: {
        email: email,
      },
    });

    if (userAlreadyExists) {
      throw new Error("User alreary exists");
    }

    const passwordHash = await hash(password, 8);

    const user = await prismaClient.user.create({
      data: {
        name: name,
        email: email,
        password: passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return { user };
  }
}
