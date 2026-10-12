import { NextFunction, Request, Response } from "express";
import AppError from "../utils/appError";

// Sempre depois de isAuthenticated, que preenche req.user_role
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user_role !== "ADMIN") {
    throw new AppError("Acesso negado", 403);
  }

  return next();
}
