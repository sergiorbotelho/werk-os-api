import { Prisma } from "@prisma/client";
import prismaClient from "../../prisma";
import { OrdemServicoSchema } from "../../schemas/order";
import AppError from "../../utils/appError";

export class CreateOsService {
  async execute({ cliente_id, ...data }: OrdemServicoSchema) {
    const client = await prismaClient.client.findUnique({
      where: { id: cliente_id },
    });

    if (!client) {
      throw new AppError("Cliente não encontrado", 404);
    }

    const os = await prismaClient.os.create({
      data: {
        ...data,
        total: new Prisma.Decimal(data.valServico ?? 0).plus(
          data.valMaterial ?? 0,
        ),
        client_id: cliente_id,
      },
    });

    return { os };
  }
}
