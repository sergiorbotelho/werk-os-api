import { Request, Response } from "express";
import { idParamSchema } from "../../schemas/common";
import { GetAllOsByClientService } from "../../services/os/getAllOsByClientService";

export class GetAllOsByController {
  async handle(req: Request, res: Response) {
    const clientId = await idParamSchema.parseAsync(req.params.clientId);

    const getAllOsClientService = new GetAllOsByClientService();
    const os = await getAllOsClientService.execute(clientId);

    return res.status(200).json(os);
  }
}
