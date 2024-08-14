import { Request, Response } from "express";
import { GetCustomersServices } from "../../services/client/getCustomersServices";
import { GetAllOsService } from "../../services/os/getAllOsService";

export class GetAllOsController {
  async handle(req: Request, res: Response) {
    const getAllOsService = new GetAllOsService();

    const os = await getAllOsService.execute();

    return res.status(200).json(os);
  }
}

//Validar Dados com ZOD
