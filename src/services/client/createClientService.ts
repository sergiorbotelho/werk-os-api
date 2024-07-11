import prismaClient from "../../prisma";

interface RequestProps {
  nome: string;
  telefone: string;
  cpf: string;
  cnpj: string;
  cep: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
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
  }: RequestProps) {
    if (nome.trim().length === 0) {
      throw new Error("Nome inválido");
    }
    if (cpf.trim().length === 0 && cnpj.trim().length === 0) {
      throw new Error("CPF/CNPJ inválido");
    }

    const cpfExists = await prismaClient.client.findFirst({
      where: {
        cpf: cpf,
      },
    });

    if (cpfExists) {
      throw new Error("CPF Já cadastrado");
    }

    const cnpjExists = await prismaClient.client.findFirst({
      where: {
        cnpj: cnpj,
      },
    });

    if (cnpjExists) {
      throw new Error("CNPJ já cadastrado");
    }

    const cliente = await prismaClient.client.create({
      data: {
        nome: nome,
        telefone: telefone,
        cpf: cpf === "" ? "null" : cpf,
        cnpj: cnpj === "" ? "null" : cnpj,
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
