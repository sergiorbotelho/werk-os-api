import { Request, Response } from "express";
import { changePasswordSchema } from "../../schemas/user";
import { ChangePasswordService } from "../../services/user/changePasswordService";

export class ChangePasswordController {
  async handle(req: Request, res: Response) {
    const data = await changePasswordSchema.parseAsync(req.body);

    const changePasswordService = new ChangePasswordService();
    const result = await changePasswordService.execute({
      userId: req.user_id,
      ...data,
    });

    return res.status(200).json(result);
  }
}
