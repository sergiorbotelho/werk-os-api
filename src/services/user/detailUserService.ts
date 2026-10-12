import prismaClient from "../../prisma";
import AppError from "../../utils/appError";
import { profileSelect } from "./userSelect";

export class DetailUserService {
  async execute(user_id: string) {
    const user = await prismaClient.user.findUnique({
      where: {
        id: user_id,
      },
      select: profileSelect,
    });

    if (!user) {
      throw new AppError("Usuário não encontrado", 404);
    }

    return user;
  }
}
