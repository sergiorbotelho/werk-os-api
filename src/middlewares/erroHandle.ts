import { Prisma } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import AppError from "../utils/appError";

// Erros do Prisma que representam falha do cliente, não do servidor
const prismaErrors: Record<string, { status: number; message: string }> = {
  P2002: { status: 409, message: "Registro já cadastrado" },
  P2003: { status: 400, message: "Registro relacionado não encontrado" },
  P2025: { status: 404, message: "Registro não encontrado" },
};

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof ZodError) {
    return res.status(400).json({ message: err.issues[0].message });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    prismaErrors[err.code]
  ) {
    const { status, message } = prismaErrors[err.code];
    return res.status(status).json({ message });
  }

  // Corpo com JSON malformado (lançado pelo express.json)
  if ((err as { type?: string }).type === "entity.parse.failed") {
    return res.status(400).json({ message: "JSON inválido" });
  }

  console.error(err);

  return res.status(500).json({ message: "Internal server error" });
}
