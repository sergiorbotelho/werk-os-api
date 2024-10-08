import prismaClient from "../../prisma";

interface RequestProps {
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
}

export class CreateOsService {
  async execute({
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
    cliente_id,
  }: RequestProps) {
    const os = await prismaClient.os.create({
      data: {
        contato: contato,
        horaChegada: horaChegada,
        horaSaida: horaSaida,
        modeloEquipamento: modeloEquipamento,
        defeito: defeito,
        defeitoConstatado: defeitoConstatado,
        solucao: solucao,
        valServico: valServico,
        valMaterial: valMaterial,
        total: valServico + valMaterial,
        garantiaPeca: garantiaPeca,
        garantiaServico: garantiaServico,
        client_id: cliente_id,
      },
    });

    return { os };
  }
}
