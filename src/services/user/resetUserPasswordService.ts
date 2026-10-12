import { hash } from "bcryptjs";
import prismaClient from "../../prisma";
import AppError from "../../utils/appError";
import { generateTemporaryPassword } from "../../utils/generateTemporaryPassword";

interface ResetUserPasswordRequest {
  id: string;
  actorId: string;
}

export class ResetUserPasswordService {
  async execute({ id, actorId }: ResetUserPasswordRequest) {
    if (id === actorId) {
      throw new AppError("Use a página Meu perfil para trocar sua senha", 400);
    }

    const user = await prismaClient.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!user) {
      throw new AppError("Usuário não encontrado", 404);
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hash(temporaryPassword, 8);

    await prismaClient.user.update({
      where: { id },
      data: { password: passwordHash, mustChangePassword: true },
    });

    return { temporaryPassword };
  }
}
