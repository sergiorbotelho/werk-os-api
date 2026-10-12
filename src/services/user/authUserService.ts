import { compare } from "bcryptjs";
import { sign } from "jsonwebtoken";
import prismaClient from "../../prisma";
import { AuthUserInput } from "../../schemas/user";
import AppError from "../../utils/appError";

export class AuthUserService {
  async execute({ email, password }: AuthUserInput) {
    // Sem diferenciar maiúsculas: e-mails antigos podem ter sido gravados com maiúsculas
    const user = await prismaClient.user.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
      },
    });

    if (!user) {
      throw new AppError("E-mail ou senha incorretos", 401);
    }

    const passwordMatch = await compare(password, user.password);

    if (!passwordMatch) {
      throw new AppError("E-mail ou senha incorretos", 401);
    }

    if (!user.active) {
      throw new AppError("Usuário desativado. Fale com o administrador.", 403);
    }

    const token = sign(
      {
        name: user.name,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        subject: user.id,
        expiresIn: "30d",
      }
    );

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      token: token,
    };
  }
}
