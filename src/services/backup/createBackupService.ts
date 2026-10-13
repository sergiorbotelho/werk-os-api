import { Prisma } from "@prisma/client";
import {
  BACKUP_MAX_BYTES,
  backupFileName,
  countBackupRows,
  encodeBackup,
} from "../../lib/backupFile";
import prismaClient from "../../prisma";
import AppError from "../../utils/appError";

export class CreateBackupService {
  async execute(userId: string) {
    const admin = await prismaClient.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    // RepeatableRead: as quatro leituras enxergam o mesmo instante do banco
    const [users, userAvatars, clients, os, migrations] =
      await prismaClient.$transaction(
        [
          prismaClient.user.findMany({ orderBy: { id: "asc" } }),
          prismaClient.userAvatar.findMany({ orderBy: { userId: "asc" } }),
          prismaClient.client.findMany({ orderBy: { id: "asc" } }),
          prismaClient.os.findMany({ orderBy: { id: "asc" } }),
          prismaClient.$queryRaw<{ migration_name: string }[]>`
            SELECT migration_name FROM _prisma_migrations
            WHERE finished_at IS NOT NULL
            ORDER BY finished_at DESC, migration_name DESC
            LIMIT 1`,
        ],
        { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
      );

    const createdAt = new Date();
    const counts = countBackupRows({ users, userAvatars, clients, os });

    const file = encodeBackup({
      format: "werk-backup",
      version: 1,
      createdAt: createdAt.toISOString(),
      createdBy: admin.email,
      migration: migrations[0]?.migration_name ?? null,
      data: {
        users,
        // Sem isto, JSON.stringify gravaria o Buffer como { type, data: [bytes] }
        userAvatars: userAvatars.map((avatar) => ({
          ...avatar,
          data: Buffer.from(avatar.data).toString("base64"),
        })),
        clients,
        os,
      },
    });

    if (file.length > BACKUP_MAX_BYTES) {
      throw new AppError(
        "Backup maior que o limite de 4 MB. Use o procedimento manual do README.",
        413,
      );
    }

    await prismaClient.backupLog.create({
      data: {
        action: "BACKUP",
        userName: admin.name,
        userEmail: admin.email,
        counts,
      },
    });

    return { fileName: backupFileName(createdAt), file };
  }
}
