import { Request, Response } from "express";
import { CreateClientService } from "../../services/client/createClientService";

export class CreateClientController {
  async handle(req: Request, res: Response) {
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

    const createClientService = new CreateClientService();

    const client = await createClientService.execute({
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

    return res.json(client);
  }
}
