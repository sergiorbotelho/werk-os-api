import { Request, Response } from "express";
import { UpdateClientService } from "../../services/client/updateClientService";

export class UpdateClientController {
  async handle(req: Request, res: Response) {
    const isIdString = req.params.id;
    const id = Number(isIdString);
    const {
      nome,
      telefone,
      cpf,
      cnpj,
      cep,
      endereco,
      numero,
      bairro,
      cidade,
      uf,
    } = req.body;

    const updateClientService = new UpdateClientService();

    const client = await updateClientService.execute({
      id,
      nome,
      telefone,
      cpf,
      cnpj,
      cep,
      endereco,
      numero,
      bairro,
      cidade,
      uf,
    });

    return res.status(201).json(client);
  }
}
