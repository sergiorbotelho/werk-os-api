import { Request, Response } from "express";
import { ZodError } from "zod";
import { badRequest, serverError } from "../../helpers/http";
import { createOrUpdateServiceSchema } from "../../schemas/order";
import { CreateOsService } from "../../services/os/createOsService";
import AppError from "../../utils/appError";

export class CreateOsControllers {
  async handle(req: Request, res: Response) {
    try {
      const data = await createOrUpdateServiceSchema.parseAsync(req.body);

      const createOsService = new CreateOsService();
      const os = await createOsService.execute(data);

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
