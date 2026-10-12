import { Request, Response } from "express";
import { createOrUpdateServiceSchema } from "../../schemas/order";
import { CreateOsService } from "../../services/os/createOsService";

export class CreateOsControllers {
  async handle(req: Request, res: Response) {
    const data = await createOrUpdateServiceSchema.parseAsync(req.body);

    const createOsService = new CreateOsService();
    const os = await createOsService.execute(data);

    return res.status(201).json(os);
  }
}
