import prismaClient from "../../prisma";
import AppError from "../../utils/appError";

export class GetOsByIdService {
  async execute(id: number) {
    const os = await prismaClient.os.findUnique({
      where: { id },
      select: {
        id: true,
        contato: true,
        modeloEquipamento: true,
        defeito: true,
        horaChegada: true,
        horaSaida: true,
        defeitoConstatado: true,
        solucao: true,
        valServico: true,
        valMaterial: true,
        total: true,
        garantiaPeca: true,
        garantiaServico: true,
        tipoServico: true,
        client_id: true,
      },
    });

    if (!os) {
      throw new AppError("Ordem de serviço não encontrada", 404);
    }

    return os;
  }
}
