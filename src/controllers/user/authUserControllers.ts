import { Request, Response } from "express";
import { authUserSchema } from "../../schemas/user";
import { AuthUserService } from "../../services/user/authUserService";

export class authUserControllers {
  async handle(req: Request, res: Response) {
    const data = await authUserSchema.parseAsync(req.body);

    const authUserService = new AuthUserService();
    const auth = await authUserService.execute(data);

    return res.status(200).json(auth);
  }
}
