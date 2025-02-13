import { Request, Response } from "express";
import { UpdateClientService } from "../../services/client/updateClientService";
import AppError from "../../utils/appError";

export class UpdateClientController {
  async handle(req: Request, res: Response) {
    try {
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
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      console.error(error); // Log do erro para depuração
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}
