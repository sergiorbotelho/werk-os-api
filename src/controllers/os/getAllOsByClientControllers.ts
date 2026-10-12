import { Request, Response } from "express";
import { ZodError } from "zod";
import { badRequest, serverError } from "../../helpers/http";
import { idParamSchema } from "../../schemas/common";
import { GetAllOsByClientService } from "../../services/os/getAllOsByClientService";
import AppError from "../../utils/appError";

export class GetAllOsByController {
  async handle(req: Request, res: Response) {
    try {
      const clientId = await idParamSchema.parseAsync(req.params.clientId);

      const getAllOsClientService = new GetAllOsByClientService();
      const os = await getAllOsClientService.execute(clientId);

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
