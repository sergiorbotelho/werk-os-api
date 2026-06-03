import prismaClient from "../../prisma";
import AppError from "../../utils/appError";

interface ClientProps {
  id: number;
  nome: string;
  email: string;
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
    email,
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

    const normalizedCpf = cpf?.trim() || null;
    const normalizedCnpj = cnpj?.trim() || null;
    if (!normalizedCpf && !normalizedCnpj) {
      throw new AppError("Informe um CPF ou um CNPJ", 400);
    }

    if (
      normalizedCpf !== existingClient.cpf ||
      normalizedCnpj !== existingClient.cnpj
    ) {
      const clientExists = await prismaClient.client.findFirst({
        where: {
          id: { not: id },
          OR: [
            normalizedCpf ? { cpf: normalizedCpf } : {},
            normalizedCnpj ? { cnpj: normalizedCnpj } : {},
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
        email,
        cpf: normalizedCpf,
        cnpj: normalizedCnpj,
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
