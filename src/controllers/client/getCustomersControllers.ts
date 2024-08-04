import { Request, Response } from "express";
import { GetCustomersServices } from "../../services/client/getCustomersServices";

export class GetCustomersControllers {
  async handle(req: Request, res: Response) {
    const getCustomersServices = new GetCustomersServices();

    const customers = await getCustomersServices.execute();

    return res.status(200).json(customers);
  }
}
