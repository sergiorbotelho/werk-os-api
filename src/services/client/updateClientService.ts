import { Prisma } from "@prisma/client";
import prismaClient from "../../prisma";
import { cnpj as cpnjValid, cpf as cpfValid } from "cpf-cnpj-validator";

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

export class UpdateClientService {
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

    const existingClient = await prismaClient.client.findUnique({
      where: { id },
    });

    if (!existingClient) {
      throw new Error("Cliente não encontrado");
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
        throw new Error("CPF ou CNPJ já cadastrado em outro cliente");
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
