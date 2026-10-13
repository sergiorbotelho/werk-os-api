import { gunzipSync, gzipSync } from "zlib";
import {
  BackupCounts,
  BackupData,
  BackupFile,
  backupFileSchema,
  invalidBackupMessage,
} from "../schemas/backup";
import AppError from "../utils/appError";

// A Vercel limita corpo de requisição e de resposta a 4,5 MB
export const BACKUP_MAX_BYTES = 4 * 1024 * 1024;

// Protege contra "bomba de gzip": arquivo pequeno que descompacta para gigabytes
const MAX_JSON_BYTES = 64 * 1024 * 1024;

export function encodeBackup(content: unknown): Buffer {
  return gzipSync(Buffer.from(JSON.stringify(content), "utf8"));
}

export function decodeBackup(file: Buffer): BackupFile {
  let json: unknown;

  try {
    const text = gunzipSync(file, { maxOutputLength: MAX_JSON_BYTES });
    json = JSON.parse(text.toString("utf8"));
  } catch {
    throw new AppError(invalidBackupMessage, 400);
  }

  const result = backupFileSchema.safeParse(json);

  if (!result.success) {
    const issue = result.error.issues[0];
    const [field] = issue.path;

    if (field === undefined) {
      throw new AppError(invalidBackupMessage, 400);
    }

    // format e version já têm mensagem própria no schema
    if (field === "format" || field === "version") {
      throw new AppError(issue.message, 400);
    }

    throw new AppError(
      `Backup inválido: campo ${issue.path.join(".")} fora do formato esperado`,
      400,
    );
  }

  return result.data;
}

function hasDuplicates(values: unknown[]) {
  const present = values.filter((value) => value !== null);
  return new Set(present).size !== present.length;
}

// Regras que o schema de linha não enxerga, conferidas antes de apagar qualquer dado
export function checkBackupIntegrity({
  users,
  userAvatars,
  clients,
  os,
}: BackupData) {
  const duplicated = (table: string) =>
    new AppError(`Backup inconsistente: registros duplicados em ${table}`, 400);

  if (
    hasDuplicates(users.map((user) => user.id)) ||
    hasDuplicates(users.map((user) => user.email))
  ) {
    throw duplicated("usuários");
  }

  if (hasDuplicates(userAvatars.map((avatar) => avatar.userId))) {
    throw duplicated("fotos");
  }

  if (
    hasDuplicates(clients.map((client) => client.id)) ||
    hasDuplicates(clients.map((client) => client.cpf)) ||
    hasDuplicates(clients.map((client) => client.cnpj))
  ) {
    throw duplicated("clientes");
  }

  if (hasDuplicates(os.map((order) => order.id))) {
    throw duplicated("ordens de serviço");
  }

  const userIds = new Set(users.map((user) => user.id));
  const clientIds = new Set(clients.map((client) => client.id));

  if (
    userAvatars.some((avatar) => !userIds.has(avatar.userId)) ||
    os.some((order) => !clientIds.has(order.client_id))
  ) {
    throw new AppError(
      "Backup inconsistente: registro relacionado não encontrado",
      400,
    );
  }

  // Sem um admin ativo, ninguém entraria para gerenciar o sistema
  if (!users.some((user) => user.role === "ADMIN" && user.active)) {
    throw new AppError("O backup não tem nenhum administrador ativo", 400);
  }
}

export function countBackupRows(data: {
  users: unknown[];
  userAvatars: unknown[];
  clients: unknown[];
  os: unknown[];
}): BackupCounts {
  return {
    users: data.users.length,
    userAvatars: data.userAvatars.length,
    clients: data.clients.length,
    os: data.os.length,
  };
}

// Recife não tem horário de verão: UTC-3 fixo. "werk-backup-2026-10-13-1430.json.gz"
export function backupFileName(date: Date, suffix = "") {
  const recife = new Date(date.getTime() - 3 * 60 * 60 * 1000).toISOString();
  const day = recife.slice(0, 10);
  const time = recife.slice(11, 16).replace(":", "");
  return `werk-backup-${day}-${time}${suffix}.json.gz`;
}
