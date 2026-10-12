import { hash } from "bcryptjs";
import prismaClient from "../../prisma";
import { CreateUserInput } from "../../schemas/user";
import AppError from "../../utils/appError";

export class CreateUserService {
  async execute({ name, email, password }: CreateUserInput) {
    const userAlreadyExists = await prismaClient.user.findFirst({
      where: {
        email: email,
      },
    });

    if (userAlreadyExists) {
      throw new AppError(`The e-mail ${email} is already in use.`, 409);
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
