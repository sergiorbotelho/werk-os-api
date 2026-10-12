import { Request, Response } from "express";
import { uuidParamSchema } from "../../schemas/common";
import { ResetUserPasswordService } from "../../services/user/resetUserPasswordService";

export class ResetUserPasswordController {
  async handle(req: Request, res: Response) {
    const id = await uuidParamSchema.parseAsync(req.params.id);

    const resetUserPasswordService = new ResetUserPasswordService();
    const result = await resetUserPasswordService.execute({ id });

    return res.status(200).json(result);
  }
}
