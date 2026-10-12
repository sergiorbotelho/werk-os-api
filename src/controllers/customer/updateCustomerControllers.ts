import { Request, Response } from "express";
import { idParamSchema } from "../../schemas/common";
import { updateCustomerSchema } from "../../schemas/customer";
import { UpdateCustomerService } from "../../services/customer/updateCustomerService";

export class UpdateCustomerController {
  async handle(req: Request, res: Response) {
    const id = await idParamSchema.parseAsync(req.params.id);
    const data = await updateCustomerSchema.parseAsync(req.body);

    const updateCustomerService = new UpdateCustomerService();
    const customer = await updateCustomerService.execute({ id, ...data });

    return res.status(200).json(customer);
  }
}
