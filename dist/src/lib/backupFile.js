"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BACKUP_MAX_BYTES = void 0;
exports.encodeBackup = encodeBackup;
exports.decodeBackup = decodeBackup;
exports.checkBackupIntegrity = checkBackupIntegrity;
exports.countBackupRows = countBackupRows;
exports.backupFileName = backupFileName;
const zlib_1 = require("zlib");
const backup_1 = require("../schemas/backup");
const appError_1 = __importDefault(require("../utils/appError"));
// A Vercel limita corpo de requisição e de resposta a 4,5 MB
exports.BACKUP_MAX_BYTES = 4 * 1024 * 1024;
// Protege contra "bomba de gzip": arquivo pequeno que descompacta para gigabytes
const MAX_JSON_BYTES = 64 * 1024 * 1024;
function encodeBackup(content) {
    return (0, zlib_1.gzipSync)(Buffer.from(JSON.stringify(content), "utf8"));
}
function decodeBackup(file) {
    let json;
    try {
        const text = (0, zlib_1.gunzipSync)(file, { maxOutputLength: MAX_JSON_BYTES });
        json = JSON.parse(text.toString("utf8"));
    }
    catch (_a) {
        throw new appError_1.default(backup_1.invalidBackupMessage, 400);
    }
    const result = backup_1.backupFileSchema.safeParse(json);
    if (!result.success) {
        const issue = result.error.issues[0];
        const [field] = issue.path;
        if (field === undefined) {
            throw new appError_1.default(backup_1.invalidBackupMessage, 400);
        }
        // format e version já têm mensagem própria no schema
        if (field === "format" || field === "version") {
            throw new appError_1.default(issue.message, 400);
        }
        throw new appError_1.default(`Backup inválido: campo ${issue.path.join(".")} fora do formato esperado`, 400);
    }
    return result.data;
}
function hasDuplicates(values) {
    const present = values.filter((value) => value !== null);
    return new Set(present).size !== present.length;
}
// Regras que o schema de linha não enxerga, conferidas antes de apagar qualquer dado
function checkBackupIntegrity({ users, userAvatars, clients, os, }) {
    const duplicated = (table) => new appError_1.default(`Backup inconsistente: registros duplicados em ${table}`, 400);
    if (hasDuplicates(users.map((user) => user.id)) ||
        hasDuplicates(users.map((user) => user.email))) {
        throw duplicated("usuários");
    }
    if (hasDuplicates(userAvatars.map((avatar) => avatar.userId))) {
        throw duplicated("fotos");
    }
    if (hasDuplicates(clients.map((client) => client.id)) ||
        hasDuplicates(clients.map((client) => client.cpf)) ||
        hasDuplicates(clients.map((client) => client.cnpj))) {
        throw duplicated("clientes");
    }
    if (hasDuplicates(os.map((order) => order.id))) {
        throw duplicated("ordens de serviço");
    }
    const userIds = new Set(users.map((user) => user.id));
    const clientIds = new Set(clients.map((client) => client.id));
    if (userAvatars.some((avatar) => !userIds.has(avatar.userId)) ||
        os.some((order) => !clientIds.has(order.client_id))) {
        throw new appError_1.default("Backup inconsistente: registro relacionado não encontrado", 400);
    }
    // Sem um admin ativo, ninguém entraria para gerenciar o sistema
    if (!users.some((user) => user.role === "ADMIN" && user.active)) {
        throw new appError_1.default("O backup não tem nenhum administrador ativo", 400);
    }
}
function countBackupRows(data) {
    return {
        users: data.users.length,
        userAvatars: data.userAvatars.length,
        clients: data.clients.length,
        os: data.os.length,
    };
}
// Recife não tem horário de verão: UTC-3 fixo. "werk-backup-2026-10-13-1430.json.gz"
function backupFileName(date, suffix = "") {
    const recife = new Date(date.getTime() - 3 * 60 * 60 * 1000).toISOString();
    const day = recife.slice(0, 10);
    const time = recife.slice(11, 16).replace(":", "");
    return `werk-backup-${day}-${time}${suffix}.json.gz`;
}
