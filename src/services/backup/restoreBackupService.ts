import {
  checkBackupIntegrity,
  countBackupRows,
  decodeBackup,
} from "../../lib/backupFile";
import { Prisma } from "@prisma/client";
import prismaClient from "../../prisma";

interface RestoreBackupRequest {
  file: Buffer;
  userId: string;
}

// Lotes de 1000: a OS tem 17 colunas, longe do limite de parâmetros do Postgres
function chunk<T>(items: T[], size = 1000) {
  const batches: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    batches.push(items.slice(start, start + size));
  }
  return batches;
}

export class RestoreBackupService {
  async execute({ file, userId }: RestoreBackupRequest) {
    // Tudo é validado antes de apagar qualquer dado
    const backup = decodeBackup(file);
    checkBackupIntegrity(backup.data);

    // Lido antes do TRUNCATE: o admin pode não existir no backup
    const admin = await prismaClient.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const { users, userAvatars, clients, os } = backup.data;
    const counts = countBackupRows(backup.data);

    // Qualquer erro desfaz tudo. TRUNCATE é transacional no Postgres e trava as
    // tabelas: requisições concorrentes esperam o fim do restore.
    await prismaClient.$transaction(
      async (tx) => {
        await tx.$executeRaw`TRUNCATE TABLE user_avatars, os, clients, users`;

        // Ids, created_at e update_at explícitos: o Prisma só preenche
        // @updatedAt quando o valor não é enviado
        for (const batch of chunk(users)) {
          await tx.user.createMany({ data: batch });
        }
        for (const batch of chunk(userAvatars)) {
          await tx.userAvatar.createMany({
            data: batch as Prisma.UserAvatarCreateManyInput[],
          });
        }
        for (const batch of chunk(clients)) {
          await tx.client.createMany({ data: batch });
        }
        for (const batch of chunk(os)) {
          await tx.os.createMany({ data: batch });
        }

        // Próximo id depois do maior restaurado; tabela vazia volta a começar em 1
        await tx.$queryRaw`SELECT setval(pg_get_serial_sequence('clients', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM clients`;
        await tx.$queryRaw`SELECT setval(pg_get_serial_sequence('os', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM os`;

        await tx.backupLog.create({
          data: {
            action: "RESTORE",
            userName: admin.name,
            userEmail: admin.email,
            counts,
          },
        });
      },
      { maxWait: 10_000, timeout: 120_000 },
    );

    return counts;
  }
}
