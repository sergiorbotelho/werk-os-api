import { Request, Response } from "express";
import { CreateOsService } from "../../services/os/createOsService";

export class CreateOsControllers {
  async handle(req: Request, res: Response) {
    const {
      modeloEquipamento,
      defeito,
      defeitoConstatado,
      solucao,
      valServico,
      valMaterial,
      garantiaPeca,
      garantiaServico,
      cliente_id,
    } = req.body;

    const createOsService = new CreateOsService();

    const os = await createOsService.execute({
      modeloEquipamento,
      defeito,
      defeitoConstatado,
      solucao,
      valServico,
      valMaterial,
      garantiaPeca,
      garantiaServico,
      cliente_id,
    });

    res.status(201).json(os);
  }
}
