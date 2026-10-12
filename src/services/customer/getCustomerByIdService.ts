import prismaClient from "../../prisma";
import AppError from "../../utils/appError";

export class GetCustomerByIdService {
  async execute(id: number) {
    const client = await prismaClient.client.findUnique({
      where: { id },
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

    if (!client) {
      throw new AppError("Cliente não encontrado", 404);
    }

    return client;
  }
}
