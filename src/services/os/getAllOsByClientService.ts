import prismaClient from "../../prisma";

export class GetAllOsByClientService {
  async execute(clientId: number) {
    const count = await prismaClient.os.count({
      where: { client_id: clientId },
    });

    const os = await prismaClient.os.findMany({
      where: {
        client_id: clientId,
      },
      select: {
        id: true,
        contato: true,
        horaChegada: true,
        horaSaida: true,
        defeito: true,
        defeitoConstatado: true,
        garantiaPeca: true,
        garantiaServico: true,
        modeloEquipamento: true,
        solucao: true,
        tipoServico: true,
        total: true,
        valMaterial: true,
        valServico: true,
        created_at: true,
        client: true,
      },
    });
    return { os, count };
  }
}
