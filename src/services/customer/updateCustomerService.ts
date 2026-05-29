import prismaClient from "../../prisma";
import AppError from "../../utils/appError";

interface ClientProps {
  id: number;
  nome: string;
  telefone: string;
  cpf?: string | null;
  cnpj?: string | null;
  cep: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export class UpdateCustomerService {
  async execute({
    id,
    nome,
    telefone,
    cpf,
    cnpj,
    cep,
    endereco,
    numero,
    bairro,
    cidade,
    uf,
  }: ClientProps) {
    const existingClient = await prismaClient.client.findUnique({
      where: { id },
    });

    if (!existingClient) {
      throw new AppError("Cliente não encontrado", 400);
    }

    if (
      (cpf && cpf !== existingClient.cpf) ||
      (cnpj && cnpj !== existingClient.cnpj)
    ) {
      const clientExists = await prismaClient.client.findFirst({
        where: {
          OR: [
            { cpf: cpf ?? undefined, id: { not: id } },
            { cnpj: cnpj ?? undefined, id: { not: id } },
          ],
        },
      });

      if (clientExists) {
        throw new AppError("CPF ou CNPJ já cadastrado em outro cliente", 400);
      }
    }

    const cliente = await prismaClient.client.update({
      where: {
        id,
      },
      data: {
        nome,
        telefone,
        cpf: cpf && cpf.trim() !== "" ? cpf : null,
        cnpj: cnpj && cnpj.trim() !== "" ? cnpj : null,
        cep,
        endereco,
        numero,
        bairro,
        cidade,
        uf,
      },
    });

    return cliente;
  }
}
