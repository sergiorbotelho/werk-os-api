"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.backupUploadSchema = exports.backupFileSchema = exports.backupOsSchema = exports.backupClientSchema = exports.backupUserAvatarSchema = exports.backupUserSchema = exports.backupMimeTypes = exports.invalidBackupMessage = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const user_1 = require("./user");
exports.invalidBackupMessage = "Arquivo inválido: envie um backup .json.gz gerado pelo sistema";
exports.backupMimeTypes = [
    "application/gzip",
    "application/x-gzip",
];
// Datas chegam em ISO (JSON.stringify de Date)
const date = zod_1.z.iso.datetime({ offset: true }).transform((value) => new Date(value));
// Decimal(30,2) serializado como string: "150", "0.5", "1234.56"
const money = zod_1.z
    .string()
    .regex(/^-?\d{1,28}(\.\d{1,2})?$/)
    .nullable();
const text = (max) => zod_1.z.string().max(max);
exports.backupUserSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    name: text(255),
    email: text(255),
    password: text(255),
    role: zod_1.z.enum(client_1.Role),
    active: zod_1.z.boolean(),
    mustChangePassword: zod_1.z.boolean(),
    avatarUpdatedAt: date.nullable(),
    created_at: date.nullable(),
    update_at: date.nullable(),
});
exports.backupUserAvatarSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1),
    data: zod_1.z
        .base64()
        .min(1)
        .transform((value) => Buffer.from(value, "base64")),
    mimeType: zod_1.z.enum(user_1.avatarMimeTypes),
    updated_at: date,
});
exports.backupClientSchema = zod_1.z.object({
    id: zod_1.z.number().int().positive(),
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
exports.backupOsSchema = zod_1.z.object({
    id: zod_1.z.number().int().positive(),
    contato: zod_1.z.string(),
    modeloEquipamento: zod_1.z.string(),
    horaChegada: zod_1.z.string(),
    horaSaida: zod_1.z.string().nullable(),
    defeito: zod_1.z.string(),
    defeitoConstatado: zod_1.z.string().nullable(),
    solucao: zod_1.z.string().nullable(),
    valServico: money,
    valMaterial: money,
    total: money,
    garantiaPeca: zod_1.z.string().nullable(),
    garantiaServico: zod_1.z.string().nullable(),
    created_at: date.nullable(),
    update_at: date.nullable(),
    tipoServico: zod_1.z.enum(client_1.TipoServico),
    client_id: zod_1.z.number().int().positive(),
});
exports.backupFileSchema = zod_1.z.object({
    format: zod_1.z.literal("werk-backup", { error: exports.invalidBackupMessage }),
    version: zod_1.z.literal(1, { error: "Versão de backup não suportada" }),
    createdAt: zod_1.z.string(),
    createdBy: zod_1.z.string(),
    migration: zod_1.z.string().nullable(),
    data: zod_1.z.object({
        users: zod_1.z.array(exports.backupUserSchema),
        userAvatars: zod_1.z.array(exports.backupUserAvatarSchema),
        clients: zod_1.z.array(exports.backupClientSchema),
        os: zod_1.z.array(exports.backupOsSchema),
    }),
});
// Corpo lido pelo express.raw. Com outro Content-Type o corpo não é lido e
// req.body fica {}. A assinatura 1F 8B confirma que é gzip.
exports.backupUploadSchema = zod_1.z
    .instanceof(Buffer, { error: exports.invalidBackupMessage })
    .refine((data) => data.length > 2 && data[0] === 0x1f && data[1] === 0x8b, { error: exports.invalidBackupMessage });
