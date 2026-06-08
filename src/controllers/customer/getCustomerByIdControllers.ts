import { Request, Response } from "express";
import { serverError } from "../../helpers/http";
import { GetCustomerByIdService } from "../../services/customer/getCustomerByIdService";
import AppError from "../../utils/appError";

export class GetClientByIdControllers {
  async handle(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const getClientByNameService = new GetCustomerByIdService();

      const client = await getClientByNameService.execute(id);

      return res.status(200).json(client[0]);
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      return serverError(res);
    }
  }
}
