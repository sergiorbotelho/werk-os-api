import { NextFunction, Request, Response } from "express";
import { verify } from "jsonwebtoken";
import AppError from "../utils/appError";

interface Payload {
  sub: string;
}

export function isAuthenticated(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authToken = req.headers.authorization;

  if (!authToken) {
    throw new AppError("Não autorizado", 401);
  }

  const [, token] = authToken.split(" ");

  try {
    const { sub } = verify(token, process.env.JWT_SECRET) as Payload;

    req.user_id = sub;

    return next();
  } catch (error) {
    console.log(error);
    throw new AppError("Não autorizado", 401);
  }
}
