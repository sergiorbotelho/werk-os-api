import prismaClient from "../../prisma";

export class DeleteAvatarService {
  async execute(userId: string) {
    // deleteMany: remover sem foto não é erro
    await prismaClient.$transaction([
      prismaClient.userAvatar.deleteMany({ where: { userId } }),
      prismaClient.user.update({
        where: { id: userId },
        data: { avatarUpdatedAt: null },
      }),
    ]);
  }
}
