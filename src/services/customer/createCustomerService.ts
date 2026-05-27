import prismaClient from "../../prisma";
import AppError from "../../utils/appError";

interface CustomerProps {
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
  created_at?: Date | string | null;
  update_at?: Date | string | null;
}
export class CreateCustomerService {
  async execute({
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
  }: CustomerProps) {
    const clientExists = await prismaClient.client.findFirst({
      where: {
        OR: [{ cpf: cpf }, { cnpj: cnpj }],
      },
    });

    if (clientExists) {
      throw new AppError("CPF ou CNPJ Já cadastrado", 400);
    }

    const cliente = await prismaClient.client.create({
      data: {
        nome: nome,
        telefone: telefone,
        cpf: cpf && cpf.trim() !== "" ? cpf : null,
        cnpj: cnpj && cnpj.trim() !== "" ? cnpj : null,
        cep: cep,
        endereco: endereco,
        numero: numero,
        bairro: bairro,
        cidade: cidade,
        uf: uf,
      },
    });

    return cliente;
  }
}
