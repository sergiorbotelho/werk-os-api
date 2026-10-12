import { Prisma } from "@prisma/client";
import prismaClient from "../../prisma";
import { OrdemServicoSchema } from "../../schemas/order";
import AppError from "../../utils/appError";

interface UpdateOsProps extends OrdemServicoSchema {
  id: number;
}

export class UpdateOsService {
  async execute({ id, cliente_id, ...data }: UpdateOsProps) {
    const existingOs = await prismaClient.os.findUnique({
      where: { id },
    });

    if (!existingOs) {
      throw new AppError("Ordem de serviço não encontrada", 404);
    }

    const client = await prismaClient.client.findUnique({
      where: { id: cliente_id },
    });

    if (!client) {
      throw new AppError("Cliente não encontrado", 404);
    }

    // Um valor ausente no corpo mantém o valor gravado, e o total acompanha
    const valServico = data.valServico ?? existingOs.valServico ?? 0;
    const valMaterial = data.valMaterial ?? existingOs.valMaterial ?? 0;

    const os = await prismaClient.os.update({
      where: { id },
      data: {
        ...data,
        total: new Prisma.Decimal(valServico).plus(valMaterial),
        client_id: cliente_id,
      },
    });

    return os;
  }
}
