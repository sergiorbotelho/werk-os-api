import { Request, Response } from "express";
import { createCustomerSchema } from "../../schemas/customer";
import { CreateCustomerService } from "../../services/customer/createCustomerService";

export class CreateCustomerController {
  async handle(req: Request, res: Response) {
    const data = await createCustomerSchema.parseAsync(req.body);

    const createClientService = new CreateCustomerService();
    const client = await createClientService.execute(data);

    return res.status(201).json(client);
  }
}
