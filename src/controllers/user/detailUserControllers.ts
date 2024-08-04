import { Request, Response } from "express";
import { DetailUserService } from "../../services/user/detailUserService";

export class detailUserController {
  async handle(req: Request, res: Response) {
    const user_id = req.user_id;

    const detailUserController = new DetailUserService();

    const user = await detailUserController.execute(user_id);

    return res.status(200).json(user);
  }
}
