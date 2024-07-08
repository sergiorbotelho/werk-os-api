import { Request, Response } from "express";
import { AuthUserService } from "../../services/user/authUserService";

export class authUserControllers {
  async handle(req: Request, res: Response) {
    const { email, password } = req.body;

    const authUserService = new AuthUserService();

    const auth = await authUserService.execute({ email, password });

    return res.json(auth);
  }
}
