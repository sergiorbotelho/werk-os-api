import prismaClient from "../../prisma";

interface RequestProps {
  modeloEquipamento: string;
  defeito: string;
  defeitoConstatado: string;
  solucao: string;
  valServico: number;
  valeMaterial: number;
  garantiaPeca: string;
  garantiaServico: string;
  cliente_id: string;
}

export class CreateOsService {
  async execute({
    modeloEquipamento,
    defeito,
    defeitoConstatado,
    solucao,
    valServico,
    valeMaterial,
    garantiaPeca,
    garantiaServico,
    cliente_id,
  }: RequestProps) {
    const os = await prismaClient.os.create({
      data: {
        modeloEquipamento: modeloEquipamento,
        defeito: defeito,
        defeitoConstatado: defeitoConstatado,
        solucao: solucao,
        valServico: valServico,
        valMaterial: valeMaterial,
        total: valServico + valeMaterial,
        garantiaPeca: garantiaPeca,
        garantiaServico: garantiaServico,
        client_id: cliente_id,
      },
    });

    return { os };
  }
}
