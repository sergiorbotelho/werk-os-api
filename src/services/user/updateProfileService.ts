import prismaClient from "../../prisma";
import { UpdateProfileInput } from "../../schemas/user";
import { profileSelect } from "./userSelect";

interface UpdateProfileRequest extends UpdateProfileInput {
  userId: string;
}

export class UpdateProfileService {
  async execute({ userId, name }: UpdateProfileRequest) {
    // O usuário existe: o isAuthenticated acabou de buscá-lo
    return prismaClient.user.update({
      where: { id: userId },
      data: { name },
      select: profileSelect,
    });
  }
}
