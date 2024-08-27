import { Prisma, TipoServico } from "@prisma/client";
import prismaClient from "../../prisma";
import { cnpj as cpnjValid, cpf as cpfValid } from "cpf-cnpj-validator";

interface OsProps {
  id: number;
  modeloEquipamento: string;
  defeito: string;
  defeitoConstatado: string;
  solucao: string;
  valServico: number;
  valMaterial: number;
  garantiaPeca: string;
  garantiaServico: string;
  cliente_id: number;
  tipoServico: TipoServico;
}

export class UpdateOsService {
  async execute({
    id,
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
      throw new Error("Os não encontrada");
    }

    const os = await prismaClient.os.update({
      where: {
        id,
      },
      data: {
        modeloEquipamento,
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
