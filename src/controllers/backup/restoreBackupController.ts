import { Request, Response } from "express";
import { backupUploadSchema } from "../../schemas/backup";
import { RestoreBackupService } from "../../services/backup/restoreBackupService";

export class RestoreBackupController {
  async handle(req: Request, res: Response) {
    const file = await backupUploadSchema.parseAsync(req.body);

    const restoreBackupService = new RestoreBackupService();
    const counts = await restoreBackupService.execute({
      file,
      userId: req.user_id,
    });

    return res.status(200).json({ message: "Backup restaurado", counts });
  }
}
