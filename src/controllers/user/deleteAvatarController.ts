import { Request, Response } from "express";
import { DeleteAvatarService } from "../../services/user/deleteAvatarService";

export class DeleteAvatarController {
  async handle(req: Request, res: Response) {
    const deleteAvatarService = new DeleteAvatarService();
    await deleteAvatarService.execute(req.user_id);

    return res.status(200).json({ message: "Foto removida" });
  }
}
