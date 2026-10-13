import { Request, Response } from "express";
import { GetBackupStatusService } from "../../services/backup/getBackupStatusService";

export class GetBackupStatusController {
  async handle(req: Request, res: Response) {
    const getBackupStatusService = new GetBackupStatusService();
    const status = await getBackupStatusService.execute();

    return res.status(200).json(status);
  }
}
