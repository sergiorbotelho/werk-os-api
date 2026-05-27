import { Request, Response } from "express";
import { ZodError } from "zod";
import { badRequest, serverError } from "../../helpers/http";
import { createCustomerSchema } from "../../schemas/customer";
import { CreateCustomerService } from "../../services/customer/createCustomerService";
import AppError from "../../utils/appError";

export class CreateCustomerController {
  async handle(req: Request, res: Response) {
    try {
      const params = req.body;

      await createCustomerSchema.parseAsync(params);
      const createClientService = new CreateCustomerService();

      const client = await createClientService.execute(params);

      return res.status(201).json(client);
    } catch (error) {
      if (error instanceof ZodError) {
        return badRequest(res, error.issues[0].message);
      }
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      return serverError(res);
    }
  }
}
