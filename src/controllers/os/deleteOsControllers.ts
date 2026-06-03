import { Request, Response } from "express";
import { serverError } from "../../helpers/http";
import { DeleteOsService } from "../../services/os/deleteOsService";
import AppError from "../../utils/appError";

export class DeleteOsController {
  async handle(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);

      const service = new DeleteOsService();

      const result = await service.execute({ id });

      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      return serverError(res);
    }
  }
}
