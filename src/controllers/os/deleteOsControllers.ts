import { Request, Response } from "express";
import { idParamSchema } from "../../schemas/common";
import { DeleteOsService } from "../../services/os/deleteOsService";

export class DeleteOsController {
  async handle(req: Request, res: Response) {
    const id = await idParamSchema.parseAsync(req.params.id);

    const service = new DeleteOsService();
    const result = await service.execute({ id });

    return res.status(200).json(result);
  }
}
