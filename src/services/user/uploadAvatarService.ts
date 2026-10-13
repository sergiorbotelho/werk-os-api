import prismaClient from "../../prisma";
import { AvatarInput } from "../../schemas/user";
import { profileSelect } from "./userSelect";

interface UploadAvatarRequest extends AvatarInput {
  userId: string;
}

export class UploadAvatarService {
  async execute({ userId, mimeType, data }: UploadAvatarRequest) {
    // avatarUpdatedAt muda junto com a foto: é a versão usada na URL (?v=)
    const [, user] = await prismaClient.$transaction([
      prismaClient.userAvatar.upsert({
        where: { userId },
        create: { userId, mimeType, data },
        update: { mimeType, data },
        // Sem select, a foto (até 1 MB) voltaria do banco à toa
        select: { userId: true },
      }),
      prismaClient.user.update({
        where: { id: userId },
        data: { avatarUpdatedAt: new Date() },
        select: profileSelect,
      }),
    ]);

    return user;
  }
}
