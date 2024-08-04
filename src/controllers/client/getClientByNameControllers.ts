import { Request, Response } from "express";
import { GetClientByNameService } from "../../services/client/getClientByNameService";

export class GetClientByNameControllers {
  async handle(req: Request, res: Response) {
    const { name } = req.params;

    const getClientByNameService = new GetClientByNameService();

    const client = await getClientByNameService.execute(name);

    return res.status(200).json({ client });
  }
}
