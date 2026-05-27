import { hash } from "bcryptjs";
import { EmailAlreadyInUseError } from "../../errors/user";
import prismaClient from "../../prisma";

interface UserProps {
  id?: string;
  name: string;
  email: string;
  password: string;
  created_at?: Date | string | null;
  update_at?: Date | string | null;
}
export class CreateUserService {
  async execute({ name, email, password }: UserProps) {
    const userAlreadyExists = await prismaClient.user.findFirst({
      where: {
        email: email,
      },
    });

    if (userAlreadyExists) {
      throw new EmailAlreadyInUseError(email);
    }

    const passwordHash = await hash(password, 8);

    const user = await prismaClient.user.create({
      data: {
        name: name,
        email: email,
        password: passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return { user };
  }
}
