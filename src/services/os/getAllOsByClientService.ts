import prismaClient from "../../prisma";

export class GetAllOsByClientService {
  async execute(clientId: string) {
    const count = await prismaClient.os.count();

    const os = await prismaClient.os.findMany({
      where: {
        client_id: {
          equals: parseInt(clientId),
        },
      },
      select: {
        id: true,
        modeloEquipamento: true,
        defeito: true,
        defeitoConstatado: true,
        solucao: true,
        valServico: true,
        valMaterial: true,
        total: true,
        garantiaPeca: true,
        garantiaServico: true,
      },
    });
    return { os, count };
  }
}
