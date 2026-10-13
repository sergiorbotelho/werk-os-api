import prismaClient from "../../prisma";
import AppError from "../../utils/appError";

export class GetAvatarService {
  async execute(userId: string) {
    const avatar = await prismaClient.userAvatar.findUnique({
      where: { userId },
      select: { data: true, mimeType: true },
    });

    if (!avatar) {
      throw new AppError("Foto não encontrada", 404);
    }

    return avatar;
  }
}
