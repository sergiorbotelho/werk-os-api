import prismaClient from "../../prisma";
import AppError from "../../utils/appError";

interface DeleteCustomerProps {
  id: number;
}

export class DeleteCustomerService {
  async execute({ id }: DeleteCustomerProps) {
    const customer = await prismaClient.client.findUnique({
      where: { id },
      include: {
        os: true,
      },
    });

    if (!customer) {
      throw new AppError("Cliente não encontrado", 404);
    }

    if (customer.os.length > 0) {
      throw new AppError(
        "Não é possível excluir um cliente que possui ordens de serviço vinculadas.",
        400,
      );
    }

    await prismaClient.client.delete({
      where: { id },
    });

    return {
      message: "Cliente removido com sucesso",
    };
  }
}
