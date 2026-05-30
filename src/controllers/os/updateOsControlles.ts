import { Request, Response } from "express";
import { ZodError } from "zod";
import { badRequest, serverError } from "../../helpers/http";
import { UpdateOsService } from "../../services/os/updateOsService";
import AppError from "../../utils/appError";

export class UpdateOsControllers {
  async handle(req: Request, res: Response) {
    try {
      const isIdString = req.params.id;
      const id = Number(isIdString);
      const params = req.body;

      const updateOsService = new UpdateOsService();

      const os = await updateOsService.execute({
        id,
        ...params,
      });

      res.status(201).json(os);
    } catch (error) {
      if (error instanceof ZodError) {
        return badRequest(res, error.issues[0].message);
      }
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      return serverError(res);
    }
  }
}
