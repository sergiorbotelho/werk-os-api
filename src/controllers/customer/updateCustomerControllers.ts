import { Request, Response } from "express";
import { ZodError } from "zod";
import { badRequest, serverError } from "../../helpers/http";
import { createOrUpdateCustomerSchema } from "../../schemas/customer";
import { UpdateCustomerService } from "../../services/customer/updateCustomerService";
import AppError from "../../utils/appError";

export class UpdateCustomerController {
  async handle(req: Request, res: Response) {
    try {
      const isIdString = req.params.id;
      const id = Number(isIdString);
      const params = req.body;

      await createOrUpdateCustomerSchema.parseAsync(params);

      const updateCustomerService = new UpdateCustomerService();

      const customer = await updateCustomerService.execute({ id, ...params });

      return res.status(201).json(customer);
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
