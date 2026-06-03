import { Request, Response } from "express";
import { serverError } from "../../helpers/http";
import { DeleteCustomerService } from "../../services/customer/deleteCustomerServic";
import AppError from "../../utils/appError";

export class DeleteCustomerController {
  async handle(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);

      const service = new DeleteCustomerService();

      const result = await service.execute({ id });

      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      return serverError(res);
    }
  }
}
