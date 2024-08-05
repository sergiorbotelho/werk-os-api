import { Prisma } from "@prisma/client";
import prismaClient from "../../prisma";
import { cnpj as cpnjValid, cpf as cpfValid } from "cpf-cnpj-validator";
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
  }: Prisma.ClientCreateInput) {
    if (nome.trim().length === 0) {
      throw new Error("Nome inválido");
    }

    if (cpf.trim().length === 0 && cnpj.trim().length === 0) {
      throw new Error("Informa ao menos um CPF ou CNPJ");
    }

    if (cpf.trim().length !== 0 && !cpfValid.isValid(cpf)) {
      throw new Error("CPF Inválido");
    }
    if (cnpj.trim().length !== 0 && !cpnjValid.isValid(cnpj)) {
      throw new Error("CNPJ Inválido");
    }

    const clientExists = await prismaClient.client.findFirst({
      where: {
        OR: [{ cpf: cpf }, { cnpj: cnpj }],
      },
    });

    if (clientExists) {
      throw new Error("CPF ou CNPJ Já cadastrado");
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
