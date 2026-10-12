import { Request, Response } from "express";
import { ZodError } from "zod";
import { badRequest, serverError } from "../../helpers/http";
import { idParamSchema } from "../../schemas/common";
import { GetOsByIdService } from "../../services/os/getOsByIdService";
import AppError from "../../utils/appError";

export class GetOsByIdController {
  async handle(req: Request, res: Response) {
    try {
      const id = await idParamSchema.parseAsync(req.params.id);

      const getOsByIdService = new GetOsByIdService();
      const os = await getOsByIdService.execute(id);

      return res.status(200).json(os);
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
