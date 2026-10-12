import prismaClient from "../../prisma";
import { UpdateUserInput } from "../../schemas/user";
import AppError from "../../utils/appError";
import { userSelect } from "./userSelect";

type UpdateUserRequest = UpdateUserInput & {
  id: string;
  actorId: string;
};

export class UpdateUserService {
  async execute({ id, actorId, ...data }: UpdateUserRequest) {
    const user = await prismaClient.user.findUnique({
      where: { id },
      select: { id: true, role: true, active: true },
    });

    if (!user) {
      throw new AppError("Usuário não encontrado", 404);
    }

    // Garante que sempre reste um admin ativo: quem age é um admin ativo e
    // nunca muda o próprio perfil ou situação.
    const changesOwnAccess =
      id === actorId &&
      ((data.role !== undefined && data.role !== user.role) ||
        (data.active !== undefined && data.active !== user.active));

    if (changesOwnAccess) {
      throw new AppError(
        "Você não pode alterar seu próprio perfil ou situação",
        400
      );
    }

    return prismaClient.user.update({
      where: { id },
      data,
      select: userSelect,
    });
  }
}
