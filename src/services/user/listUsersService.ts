import prismaClient from "../../prisma";
import { userSelect } from "./userSelect";

export class ListUsersService {
  async execute() {
    const users = await prismaClient.user.findMany({
      select: userSelect,
      orderBy: { name: "asc" },
    });

    return { users, count: users.length };
  }
}
