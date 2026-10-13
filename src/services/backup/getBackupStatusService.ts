import { Prisma } from "@prisma/client";
import prismaClient from "../../prisma";

const backupLogSelect = {
  userName: true,
  created_at: true,
  counts: true,
} satisfies Prisma.BackupLogSelect;

export class GetBackupStatusService {
  async execute() {
    const [lastBackup, lastRestore] = await Promise.all([
      prismaClient.backupLog.findFirst({
        where: { action: "BACKUP" },
        orderBy: { id: "desc" },
        select: backupLogSelect,
      }),
      prismaClient.backupLog.findFirst({
        where: { action: "RESTORE" },
        orderBy: { id: "desc" },
        select: backupLogSelect,
      }),
    ]);

    return { lastBackup, lastRestore };
  }
}
