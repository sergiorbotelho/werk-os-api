import { Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import prismaClient from "../../prisma";
import AppError from "../../utils/appError";
export class CreateUserService {
  async execute({ name, email, password }: Prisma.UserCreateInput) {
    if (!email) {
      throw new AppError("Email incorrect", 400);
    }

    const userAlreadyExists = await prismaClient.user.findFirst({
      where: {
        email: email,
      },
    });

    if (userAlreadyExists) {
      throw new AppError("User alreary exists", 400);
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
