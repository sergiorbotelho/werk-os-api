import prismaClient from "../../prisma";

export class GetCustomerByIdService {
  async execute(id: string) {
    const client = prismaClient.client.findMany({
      where: {
        id: {
          equals: parseInt(id),
        },
      },
      select: {
        id: true,
        nome: true,
        email: true,
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
    return client;
  }
}
