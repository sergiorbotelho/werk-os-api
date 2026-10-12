import { Request, Response } from "express";
import { idParamSchema } from "../../schemas/common";
import { GetOsPdfService } from "../../services/os/getOsPdfService";

export class GetOsPdfController {
  async handle(req: Request, res: Response) {
    const id = await idParamSchema.parseAsync(req.params.id);

    const getOsPdfService = new GetOsPdfService();
    const pdf = await getOsPdfService.execute(id);

    // Gerado a cada pedido com os dados atuais da OS, por isso sem cache
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="OS-${id}.pdf"`);
    res.setHeader("Cache-Control", "no-store");

    return res.status(200).send(pdf);
  }
}
