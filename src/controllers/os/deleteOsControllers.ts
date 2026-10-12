import { Request, Response } from "express";
import { ZodError } from "zod";
import { badRequest, serverError } from "../../helpers/http";
import { idParamSchema } from "../../schemas/common";
import { DeleteOsService } from "../../services/os/deleteOsService";
import AppError from "../../utils/appError";

export class DeleteOsController {
  async handle(req: Request, res: Response) {
    try {
      const id = await idParamSchema.parseAsync(req.params.id);

      const service = new DeleteOsService();
      const result = await service.execute({ id });

      return res.status(200).json(result);
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
