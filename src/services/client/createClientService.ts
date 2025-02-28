import { cpf as cpfValid, cnpj as cpnjValid } from "cpf-cnpj-validator";
import prismaClient from "../../prisma";
import AppError from "../../utils/appError";

interface ClientProps {
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
export class CreateClientService {
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
  }: ClientProps) {
    if (nome.trim().length === 0) {
      throw new AppError("Nome inválido", 400);
    }

    if (cpf.trim().length === 0 && cnpj.trim().length === 0) {
      throw new AppError("Informa ao menos um CPF ou CNPJ", 400);
    }

    if (cpf.trim().length !== 0 && !cpfValid.isValid(cpf)) {
      throw new AppError("CPF Inválido", 400);
    }
    if (cnpj.trim().length !== 0 && !cpnjValid.isValid(cnpj)) {
      throw new AppError("CNPJ Inválido", 400);
    }

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
