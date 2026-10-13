import { Request, Response } from "express";
import { CreateBackupService } from "../../services/backup/createBackupService";

export class CreateBackupController {
  async handle(req: Request, res: Response) {
    const createBackupService = new CreateBackupService();
    const { fileName, file } = await createBackupService.execute(req.user_id);

    res.setHeader("Content-Type", "application/gzip");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    // O front está em outra origem: sem isto o navegador esconde o nome do arquivo
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    res.setHeader("Cache-Control", "no-store");

    return res.status(200).send(file);
  }
}
