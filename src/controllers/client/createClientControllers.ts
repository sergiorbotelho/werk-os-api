import { Request, Response } from "express";
import { CreateClientService } from "../../services/client/createClientService";
import AppError from "../../utils/appError";

export class CreateClientController {
  async handle(req: Request, res: Response) {
    try {
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

      return res.status(201).json(client);
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      console.error(error); // Log do erro para depuração
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}
