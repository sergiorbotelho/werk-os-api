import { Request, Response } from "express";
import { serverError } from "../../helpers/http";
import { GetCustomerByNameService } from "../../services/customer/getCustomerByNameService";
import AppError from "../../utils/appError";

export class GetClientByNameControllers {
  async handle(req: Request, res: Response) {
    try {
      const { name } = req.params;

      const getClientByNameService = new GetCustomerByNameService();

      const client = await getClientByNameService.execute(name.trim());

      return res.status(200).json({ client });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      return serverError(res);
    }
  }
}
