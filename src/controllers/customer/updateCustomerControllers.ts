import { Request, Response } from "express";
import { ZodError } from "zod";
import { badRequest, serverError } from "../../helpers/http";
import { idParamSchema } from "../../schemas/common";
import { updateCustomerSchema } from "../../schemas/customer";
import { UpdateCustomerService } from "../../services/customer/updateCustomerService";
import AppError from "../../utils/appError";

export class UpdateCustomerController {
  async handle(req: Request, res: Response) {
    try {
      const id = await idParamSchema.parseAsync(req.params.id);
      const data = await updateCustomerSchema.parseAsync(req.body);

      const updateCustomerService = new UpdateCustomerService();
      const customer = await updateCustomerService.execute({ id, ...data });

      return res.status(201).json(customer);
    } catch (error) {
      if (error instanceof ZodError) {
        return badRequest(res, error.issues[0].message);
      }
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      console.error(error);
      return serverError(res);
    }
  }
}
