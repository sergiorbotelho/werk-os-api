import { hash } from "bcryptjs";
import prismaClient from "../../prisma";
import { CreateUserInput } from "../../schemas/user";
import AppError from "../../utils/appError";
import { generateTemporaryPassword } from "../../utils/generateTemporaryPassword";
import { userSelect } from "./userSelect";

export class CreateUserService {
  async execute({ name, email, role }: CreateUserInput) {
    // Sem diferenciar maiúsculas: e-mails antigos podem ter sido gravados com maiúsculas
    const userAlreadyExists = await prismaClient.user.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
      },
    });

    if (userAlreadyExists) {
      throw new AppError("E-mail já cadastrado", 409);
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hash(temporaryPassword, 8);

    const user = await prismaClient.user.create({
      data: {
        name,
        email,
        role,
        password: passwordHash,
        mustChangePassword: true,
      },
      select: userSelect,
    });

    // A senha temporária só existe nesta resposta: o banco guarda o hash
    return { user, temporaryPassword };
  }
}
