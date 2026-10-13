import { Request, Response } from "express";
import { uuidParamSchema } from "../../schemas/common";
import { GetAvatarService } from "../../services/user/getAvatarService";

export class GetAvatarController {
  async handle(req: Request, res: Response) {
    const id = await uuidParamSchema.parseAsync(req.params.id);

    const getAvatarService = new GetAvatarService();
    const avatar = await getAvatarService.execute(id);

    // O front pede a foto com ?v=<avatarUpdatedAt>: foto nova, URL nova
    res.setHeader("Content-Type", avatar.mimeType);
    res.setHeader("Cache-Control", "private, max-age=31536000, immutable");

    return res.status(200).send(avatar.data);
  }
}
