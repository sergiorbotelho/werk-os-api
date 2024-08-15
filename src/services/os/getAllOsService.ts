import prismaClient from "../../prisma";

export class GetAllOsService {
  async execute() {
    const count = await prismaClient.os.count();
    // const page = 0;
    const os = await prismaClient.os.findMany({
      // skip: page * 2,
      // take: 2,
      select: {
        id: true,
        client_id: true,
      },
    });

    return { os, count };
  }
}
