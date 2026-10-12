import { Request, Response } from "express";
import { ZodError } from "zod";
import { badRequest, serverError } from "../../helpers/http";
import { idParamSchema } from "../../schemas/common";
import { createOrUpdateServiceSchema } from "../../schemas/order";
import { UpdateOsService } from "../../services/os/updateOsService";
import AppError from "../../utils/appError";

export class UpdateOsControllers {
  async handle(req: Request, res: Response) {
    try {
      const id = await idParamSchema.parseAsync(req.params.id);
      const data = await createOrUpdateServiceSchema.parseAsync(req.body);

      const updateOsService = new UpdateOsService();
      const os = await updateOsService.execute({ id, ...data });

      return res.status(201).json(os);
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
