import prismaClient from "../../prisma";

export class GetCustomersServices {
  async execute() {
    const customers = prismaClient.client.findMany({
      select: {
        nome: true,
        telefone: true,
        cpf: true,
        cnpj: true,
        endereco: true,
        numero: true,
        bairro: true,
        cidade: true,
        uf: true,
        cep: true,
      },
    });

    return customers;
  }
}
