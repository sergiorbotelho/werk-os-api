import { NextFunction, Request, Response } from "express";
import { verify } from "jsonwebtoken";
import prismaClient from "../prisma";
import AppError from "../utils/appError";

interface Payload {
  sub: string;
}

// Lê o usuário do banco a cada requisição, para que desativação, mudança de
// perfil e senha temporária valham na hora, sem esperar o token vencer.
async function authenticate(req: Request, allowPendingPassword: boolean) {
  const authToken = req.headers.authorization;

  if (!authToken) {
    throw new AppError("Não autorizado", 401);
  }

  const [, token] = authToken.split(" ");

  let userId: string;

  try {
    const { sub } = verify(token, process.env.JWT_SECRET) as Payload;
    userId = sub;
  } catch {
    throw new AppError("Não autorizado", 401);
  }

  if (!userId) {
    throw new AppError("Não autorizado", 401);
  }

  const user = await prismaClient.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, active: true, mustChangePassword: true },
  });

  if (!user || !user.active) {
    throw new AppError("Não autorizado", 401);
  }

  if (user.mustChangePassword && !allowPendingPassword) {
    throw new AppError("Troca de senha obrigatória", 403);
  }

  req.user_id = user.id;
  req.user_role = user.role;
}

export async function isAuthenticated(
  req: Request,
  res: Response,
  next: NextFunction
) {
  await authenticate(req, false);

  return next();
}

// Só para GET /me e PUT /me/password: deixa passar quem ainda precisa trocar a senha temporária
export async function isAuthenticatedPendingPassword(
  req: Request,
  res: Response,
  next: NextFunction
) {
  await authenticate(req, true);

  return next();
}
