import { Request, Response } from "express";
import { GetAllOsByClientService } from "../../services/os/getAllOsByClientService";

export class GetAllOsByController {
  async handle(req: Request, res: Response) {
    const { clientId } = req.params;
    const getAllOsClientService = new GetAllOsByClientService();

    const os = await getAllOsClientService.execute(clientId);

    return res.status(200).json(os);
  }
}
