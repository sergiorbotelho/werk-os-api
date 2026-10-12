import { Request, Response } from "express";
import { idParamSchema } from "../../schemas/common";
import { GetCustomerByIdService } from "../../services/customer/getCustomerByIdService";

export class GetClientByIdControllers {
  async handle(req: Request, res: Response) {
    const id = await idParamSchema.parseAsync(req.params.id);

    const getCustomerByIdService = new GetCustomerByIdService();
    const client = await getCustomerByIdService.execute(id);

    return res.status(200).json(client);
  }
}
