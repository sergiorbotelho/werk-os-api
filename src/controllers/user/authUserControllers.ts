import { Request, Response } from "express";
import { ZodError } from "zod";
import { badRequest, serverError } from "../../helpers/http";
import { authUserSchema } from "../../schemas/user";
import { AuthUserService } from "../../services/user/authUserService";
import AppError from "../../utils/appError";

export class authUserControllers {
  async handle(req: Request, res: Response) {
    try {
      const params = req.body;

      await authUserSchema.parseAsync(params);

      const authUserService = new AuthUserService();

      const auth = await authUserService.execute(params);

      return res.status(200).json(auth);
    } catch (error) {
      if (error instanceof ZodError) {
        return badRequest(res, error.issues[0].message);
      }
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      console.error(error);
      return serverError(res);
    }
  }
}
