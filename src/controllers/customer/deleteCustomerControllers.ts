import { Request, Response } from "express";
import { idParamSchema } from "../../schemas/common";
import { DeleteCustomerService } from "../../services/customer/deleteCustomerServic";

export class DeleteCustomerController {
  async handle(req: Request, res: Response) {
    const id = await idParamSchema.parseAsync(req.params.id);

    const service = new DeleteCustomerService();
    const result = await service.execute({ id });

    return res.status(200).json(result);
  }
}
