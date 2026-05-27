import prismaClient from "../../prisma";

export class GetClientByNameService {
  async execute(name: string) {
    const client = prismaClient.client.findMany({
      where: {
        nome: {
          startsWith: name,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
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
    return client;
  }
}
