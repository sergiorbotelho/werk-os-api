import {
  Client,
  Os,
  Role,
  TipoServico,
  User,
  UserAvatar,
} from "@prisma/client";
import { z } from "zod";
import { avatarMimeTypes } from "./user";

export const invalidBackupMessage =
  "Arquivo inválido: envie um backup .json.gz gerado pelo sistema";

export const backupMimeTypes = [
  "application/gzip",
  "application/x-gzip",
] as const;

// Datas chegam em ISO (JSON.stringify de Date)
const date = z.iso.datetime({ offset: true }).transform((value) => new Date(value));

// Decimal(30,2) serializado como string: "150", "0.5", "1234.56"
const money = z
  .string()
  .regex(/^-?\d{1,28}(\.\d{1,2})?$/)
  .nullable();

const text = (max: number) => z.string().max(max);

export const backupUserSchema = z.object({
  id: z.string().min(1),
  name: text(255),
  email: text(255),
  password: text(255),
  role: z.enum(Role),
  active: z.boolean(),
  mustChangePassword: z.boolean(),
  avatarUpdatedAt: date.nullable(),
  created_at: date.nullable(),
  update_at: date.nullable(),
});

export const backupUserAvatarSchema = z.object({
  userId: z.string().min(1),
  data: z
    .base64()
    .min(1)
    .transform((value) => Buffer.from(value, "base64")),
  mimeType: z.enum(avatarMimeTypes),
  updated_at: date,
});

export const backupClientSchema = z.object({
  id: z.number().int().positive(),
  nome: text(255),
  telefone: text(20),
  email: text(255),
  cpf: text(11).nullable(),
  cnpj: text(14).nullable(),
  cep: text(8).nullable(),
  endereco: text(255).nullable(),
  numero: text(20).nullable(),
  bairro: text(255).nullable(),
  cidade: text(150).nullable(),
  uf: text(2).nullable(),
  created_at: date.nullable(),
  update_at: date.nullable(),
});

export const backupOsSchema = z.object({
  id: z.number().int().positive(),
  contato: z.string(),
  modeloEquipamento: z.string(),
  horaChegada: z.string(),
  horaSaida: z.string().nullable(),
  defeito: z.string(),
  defeitoConstatado: z.string().nullable(),
  solucao: z.string().nullable(),
  valServico: money,
  valMaterial: money,
  total: money,
  garantiaPeca: z.string().nullable(),
  garantiaServico: z.string().nullable(),
  created_at: date.nullable(),
  update_at: date.nullable(),
  tipoServico: z.enum(TipoServico),
  client_id: z.number().int().positive(),
});

// Se um model ganhar uma coluna que o schema de linha não tem (ou o contrário),
// o build falha aqui: "Type 'false' does not satisfy the constraint 'true'".
// Coluna nova obrigatória entra com .default(...), para que backups antigos
// continuem restauráveis.
type SameKeys<A, B> = [
  Exclude<keyof A, keyof B>,
  Exclude<keyof B, keyof A>,
] extends [never, never]
  ? true
  : false;
type Assert<T extends true> = T;
export type BackupColumnsCheck = [
  Assert<SameKeys<z.output<typeof backupUserSchema>, User>>,
  Assert<SameKeys<z.output<typeof backupUserAvatarSchema>, UserAvatar>>,
  Assert<SameKeys<z.output<typeof backupClientSchema>, Client>>,
  Assert<SameKeys<z.output<typeof backupOsSchema>, Os>>,
];

export const backupFileSchema = z.object({
  format: z.literal("werk-backup", { error: invalidBackupMessage }),
  version: z.literal(1, { error: "Versão de backup não suportada" }),
  createdAt: z.string(),
  createdBy: z.string(),
  migration: z.string().nullable(),
  data: z.object({
    users: z.array(backupUserSchema),
    userAvatars: z.array(backupUserAvatarSchema),
    clients: z.array(backupClientSchema),
    os: z.array(backupOsSchema),
  }),
});

// Corpo lido pelo express.raw. Com outro Content-Type o corpo não é lido e
// req.body fica {}. A assinatura 1F 8B confirma que é gzip.
export const backupUploadSchema = z
  .instanceof(Buffer, { error: invalidBackupMessage })
  .refine(
    (data) => data.length > 2 && data[0] === 0x1f && data[1] === 0x8b,
    { error: invalidBackupMessage },
  );

export type BackupFile = z.infer<typeof backupFileSchema>;
export type BackupData = BackupFile["data"];
export type BackupCounts = {
  users: number;
  userAvatars: number;
  clients: number;
  os: number;
};
