import { Request, Response } from "express";
import { GetOsByIdService } from "../../services/os/getOsByIdService";

export class GetOsByIdController {
  async handle(req: Request, res: Response) {
    const { id } = req.params;

    const getOsByIdService = new GetOsByIdService();

    const os = await getOsByIdService.execute(id);

    return res.status(200).json(os);
  }
}
