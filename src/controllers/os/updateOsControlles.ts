import { Request, Response } from "express";
import { idParamSchema } from "../../schemas/common";
import { createOrUpdateServiceSchema } from "../../schemas/order";
import { UpdateOsService } from "../../services/os/updateOsService";

export class UpdateOsControllers {
  async handle(req: Request, res: Response) {
    const id = await idParamSchema.parseAsync(req.params.id);
    const data = await createOrUpdateServiceSchema.parseAsync(req.body);

    const updateOsService = new UpdateOsService();
    const os = await updateOsService.execute({ id, ...data });

    return res.status(200).json(os);
  }
}
