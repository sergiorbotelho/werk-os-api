import prismaClient from "../../prisma";

export class GetOsByIdService {
  async execute(id: string) {
    const os = prismaClient.os.findFirst({
      where: {
        id: {
          equals: parseInt(id),
        },
      },
      select: {
        modeloEquipamento: true,
        defeito: true,
        defeitoConstatado: true,
        solucao: true,
        valServico: true,
        valMaterial: true,
        total: true,
        garantiaPeca: true,
        garantiaServico: true,
        client_id: true,
      },
    });
    return os;
  }
}
