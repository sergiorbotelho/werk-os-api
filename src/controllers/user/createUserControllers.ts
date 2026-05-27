import { Request, Response } from "express";
import { ZodError } from "zod";
import { EmailAlreadyInUseError } from "../../errors/user";
import { badRequest, serverError } from "../../helpers/http";
import { createUserSchema } from "../../schemas/user";
import { CreateUserService } from "../../services/user/createUserServices";

export class CreateUserController {
  async handle(req: Request, res: Response) {
    try {
      const params = req.body;

      await createUserSchema.parseAsync(params);

      const createUserService = new CreateUserService();
      const user = await createUserService.execute(params);
      return res.status(201).json(user);
    } catch (error) {
      if (error instanceof ZodError) {
        return badRequest(res, error.issues[0].message);
      }

      if (error instanceof EmailAlreadyInUseError) {
        return badRequest(res, error.message);
      }

      return serverError(res);
    }
  }
}
