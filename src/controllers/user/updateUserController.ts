import { Request, Response } from "express";
import { uuidParamSchema } from "../../schemas/common";
import { updateUserSchema } from "../../schemas/user";
import { UpdateUserService } from "../../services/user/updateUserService";

export class UpdateUserController {
  async handle(req: Request, res: Response) {
    const id = await uuidParamSchema.parseAsync(req.params.id);
    const data = await updateUserSchema.parseAsync(req.body);

    const updateUserService = new UpdateUserService();
    const user = await updateUserService.execute({
      id,
      actorId: req.user_id,
      ...data,
    });

    return res.status(200).json(user);
  }
}
