import { Request, Response } from "express";
import { AuthUserService } from "../../services/user/authUserService";
import AppError from "../../utils/appError";

export class authUserControllers {
  async handle(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const authUserService = new AuthUserService();
      const auth = await authUserService.execute({ email, password });

      return res.status(200).json(auth);
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      console.error(error); // Log do erro para depuração
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}
