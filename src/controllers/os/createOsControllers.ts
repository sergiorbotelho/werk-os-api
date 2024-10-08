import { Request, Response } from "express";
import { CreateOsService } from "../../services/os/createOsService";

export class CreateOsControllers {
  async handle(req: Request, res: Response) {
    const {
      contato,
      horaChegada,
      horaSaida,
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
      contato,
      horaChegada,
      horaSaida,
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
