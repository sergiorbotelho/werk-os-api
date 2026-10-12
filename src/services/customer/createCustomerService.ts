import prismaClient from "../../prisma";
import { CreateCustomerInput } from "../../schemas/customer";
import AppError from "../../utils/appError";

export class CreateCustomerService {
  async execute({ cpf, cnpj, ...data }: CreateCustomerInput) {
    const normalizedCpf = cpf?.trim() || null;
    const normalizedCnpj = cnpj?.trim() || null;

    const documentFilters = [
      ...(normalizedCpf ? [{ cpf: normalizedCpf }] : []),
      ...(normalizedCnpj ? [{ cnpj: normalizedCnpj }] : []),
    ];

    const clientExists =
      documentFilters.length > 0 &&
      (await prismaClient.client.findFirst({
        where: { OR: documentFilters },
      }));

    if (clientExists) {
      throw new AppError("CPF ou CNPJ Já cadastrado", 400);
    }

    const cliente = await prismaClient.client.create({
      data: {
        ...data,
        cpf: normalizedCpf,
        cnpj: normalizedCnpj,
      },
    });

    return cliente;
  }
}
