import prismaClient from "../../prisma";
import { UpdateCustomerInput } from "../../schemas/customer";
import AppError from "../../utils/appError";

interface UpdateCustomerProps extends UpdateCustomerInput {
  id: number;
}

export class UpdateCustomerService {
  async execute({ id, cpf, cnpj, ...data }: UpdateCustomerProps) {
    const existingClient = await prismaClient.client.findUnique({
      where: { id },
    });

    if (!existingClient) {
      throw new AppError("Cliente não encontrado", 404);
    }

    const normalizedCpf = cpf?.trim() || null;
    const normalizedCnpj = cnpj?.trim() || null;
    if (!normalizedCpf && !normalizedCnpj) {
      throw new AppError("Informe um CPF ou um CNPJ", 400);
    }

    if (
      normalizedCpf !== existingClient.cpf ||
      normalizedCnpj !== existingClient.cnpj
    ) {
      const clientExists = await prismaClient.client.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(normalizedCpf ? [{ cpf: normalizedCpf }] : []),
            ...(normalizedCnpj ? [{ cnpj: normalizedCnpj }] : []),
          ],
        },
      });

      if (clientExists) {
        throw new AppError("CPF ou CNPJ já cadastrado em outro cliente", 409);
      }
    }

    const cliente = await prismaClient.client.update({
      where: {
        id,
      },
      data: {
        ...data,
        cpf: normalizedCpf,
        cnpj: normalizedCnpj,
      },
    });

    return cliente;
  }
}
