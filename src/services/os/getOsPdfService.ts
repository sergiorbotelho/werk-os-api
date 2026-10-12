import { renderPdf } from "../../lib/pdf";
import prismaClient from "../../prisma";
import { buildOsPdfDefinition } from "../../reports/osPdf";
import AppError from "../../utils/appError";

export class GetOsPdfService {
  async execute(id: number) {
    const os = await prismaClient.os.findUnique({
      where: { id },
      include: { client: true },
    });

    if (!os) {
      throw new AppError("Ordem de serviço não encontrada", 404);
    }

    return renderPdf(buildOsPdfDefinition(os));
  }
}
