import { Request, Response, NextFunction } from "express";
import AppError from "../utils/appError"; // Caminho da classe personalizada

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: "error",
      message: err.message,
    });
  }

  console.error(err); // Para logar erros inesperados no servidor

  return res.status(500).json({
    status: "error",
    message: "Internal server error",
  });
}
