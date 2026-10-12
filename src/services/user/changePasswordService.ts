import { compare, hash } from "bcryptjs";
import prismaClient from "../../prisma";
import { ChangePasswordInput } from "../../schemas/user";
import AppError from "../../utils/appError";

interface ChangePasswordRequest extends ChangePasswordInput {
  userId: string;
}

export class ChangePasswordService {
  async execute({ userId, currentPassword, newPassword }: ChangePasswordRequest) {
    const user = await prismaClient.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("Usuário não encontrado", 404);
    }

    const currentPasswordMatches = await compare(currentPassword, user.password);

    if (!currentPasswordMatches) {
      throw new AppError("Senha atual incorreta", 400);
    }

    if (currentPassword === newPassword) {
      throw new AppError("A nova senha deve ser diferente da atual", 400);
    }

    const passwordHash = await hash(newPassword, 8);

    await prismaClient.user.update({
      where: { id: userId },
      data: { password: passwordHash, mustChangePassword: false },
    });

    return { message: "Senha alterada com sucesso" };
  }
}
