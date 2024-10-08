import { Request, Response } from "express";
import { UpdateOsService } from "../../services/os/updateOsService";

export class UpdateOsControllers {
  async handle(req: Request, res: Response) {
    const isIdString = req.params.id;
    const id = Number(isIdString);
    const {
      contato,
      modeloEquipamento,
      horaChegada,
      horaSaida,
      defeito,
      defeitoConstatado,
      solucao,
      valServico,
      valMaterial,
      garantiaPeca,
      garantiaServico,
      tipoServico,
      cliente_id,
    } = req.body;
    const updateOsService = new UpdateOsService();

    const os = await updateOsService.execute({
      id,
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
      tipoServico,
      cliente_id,
    });

    res.status(201).json(os);
  }
}
