import { Request, Response } from "express";
import { avatarSchema } from "../../schemas/user";
import { UploadAvatarService } from "../../services/user/uploadAvatarService";

export class UploadAvatarController {
  async handle(req: Request, res: Response) {
    const data = await avatarSchema.parseAsync({
      mimeType: req.headers["content-type"],
      data: req.body,
    });

    const uploadAvatarService = new UploadAvatarService();
    const user = await uploadAvatarService.execute({
      userId: req.user_id,
      ...data,
    });

    return res.status(200).json(user);
  }
}
