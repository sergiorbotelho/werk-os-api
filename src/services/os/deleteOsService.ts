import prismaClient from "../../prisma";
import AppError from "../../utils/appError";

interface DeleteOsProps {
  id: number;
}

export class DeleteOsService {
  async execute({ id }: DeleteOsProps) {
    const os = await prismaClient.os.findUnique({
      where: {
        id,
      },
    });

    if (!os) {
      throw new AppError("Ordem de serviço não encontrada", 404);
    }

    await prismaClient.os.delete({
      where: {
        id,
      },
    });

    return {
      message: "Ordem de serviço removida com sucesso",
    };
  }
}
