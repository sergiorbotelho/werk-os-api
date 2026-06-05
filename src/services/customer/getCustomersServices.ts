import prismaClient from "../../prisma";

export class GetCustomersServices {
  async execute() {
    const count = await prismaClient.client.count();
    // const page = 0;
    const customers = await prismaClient.client.findMany({
      orderBy: {
        nome: "asc",
      },

      // skip: page * 2,
      // take: 2,
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
        _count: {
          select: {
            os: true,
          },
        },
      },
    });

    const formattedCustomers = customers.map(({ _count, ...customer }) => ({
      ...customer,
      totalOs: _count.os,
    }));

    return {
      customers: formattedCustomers,
      count,
    };
  }
}
