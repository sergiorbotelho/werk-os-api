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

    // Carregado só aqui: o pdfmake pesa ~150 ms na subida e lê arquivos do disco ao carregar
    const { renderPdf } = await import("../../lib/pdf");

    return renderPdf(buildOsPdfDefinition(os));
  }
}
