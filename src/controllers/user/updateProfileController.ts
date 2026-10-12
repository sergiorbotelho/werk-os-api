import { Request, Response } from "express";
import { updateProfileSchema } from "../../schemas/user";
import { UpdateProfileService } from "../../services/user/updateProfileService";

export class UpdateProfileController {
  async handle(req: Request, res: Response) {
    const data = await updateProfileSchema.parseAsync(req.body);

    const updateProfileService = new UpdateProfileService();
    const user = await updateProfileService.execute({
      userId: req.user_id,
      ...data,
    });

    return res.status(200).json(user);
  }
}
