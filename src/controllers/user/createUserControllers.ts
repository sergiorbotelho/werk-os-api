import { Request, Response } from "express";
import { createUserSchema } from "../../schemas/user";
import { CreateUserService } from "../../services/user/createUserServices";

export class CreateUserController {
  async handle(req: Request, res: Response) {
    const data = await createUserSchema.parseAsync(req.body);

    const createUserService = new CreateUserService();
    const user = await createUserService.execute(data);

    return res.status(201).json(user);
  }
}
