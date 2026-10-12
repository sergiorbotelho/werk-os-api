import { Request, Response } from "express";
import { ListUsersService } from "../../services/user/listUsersService";

export class ListUsersController {
  async handle(req: Request, res: Response) {
    const listUsersService = new ListUsersService();
    const result = await listUsersService.execute();

    return res.status(200).json(result);
  }
}
