import { Request, Response } from "express";
import { ZodError } from "zod";
import { badRequest, serverError } from "../../helpers/http";
import { createOrUpdateServiceSchema } from "../../schemas/order";
import { CreateOsService } from "../../services/os/createOsService";

export class CreateOsControllers {
  async handle(req: Request, res: Response) {
    try {
      const params = req.body;

      await createOrUpdateServiceSchema.parseAsync(params);
      const createOsService = new CreateOsService();

      const os = await createOsService.execute(params);

      res.status(201).json(os);
    } catch (error) {
      if (error instanceof ZodError) {
        return badRequest(res, error.issues[0].message);
      }
      return serverError(res);
    }
  }
}
