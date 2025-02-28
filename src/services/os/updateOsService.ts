import prismaClient from "../../prisma";
import AppError from "../../utils/appError";

interface OsProps {
  id: number;
  contato: string;
  horaChegada: string;
  horaSaida: string;
  modeloEquipamento: string;
  defeito: string;
  defeitoConstatado: string;
  solucao: string;
  valServico: number;
  valMaterial: number;
  garantiaPeca: string;
  garantiaServico: string;
  cliente_id: number;
  tipoServico: "GARANTIA" | "FORADEGARANTIA" | "ORCAMENTO" | "CONTRATO";
}

export class UpdateOsService {
  async execute({
    id,
    contato,
    horaChegada,
    horaSaida,
    modeloEquipamento,
    defeito,
    defeitoConstatado,
    solucao,
    valServico,
    valMaterial,
    garantiaPeca,
    garantiaServico,
    tipoServico,
    cliente_id,
  }: OsProps) {
    const idExists = await prismaClient.os.findFirst({
      where: {
        id,
      },
    });

    if (!idExists) {
      throw new AppError("Os não encontrada", 404);
    }

    const os = await prismaClient.os.update({
      where: {
        id,
      },
      data: {
        contato,
        modeloEquipamento,
        horaChegada,
        horaSaida,
        defeito,
        defeitoConstatado,
        solucao,
        valServico,
        valMaterial,
        garantiaPeca,
        garantiaServico,
        tipoServico,
        client_id: cliente_id,
      },
    });

    return os;
  }
}
