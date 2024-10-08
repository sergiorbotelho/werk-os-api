import prismaClient from "../../prisma";

export class GetAllOsService {
  async execute() {
    const os = await prismaClient.os.findMany({
      // skip: page * 2,
      // take: 2,
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

    return { os };
  }
}
