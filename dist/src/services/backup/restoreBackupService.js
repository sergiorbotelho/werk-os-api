"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestoreBackupService = void 0;
const backupFile_1 = require("../../lib/backupFile");
const prisma_1 = __importDefault(require("../../prisma"));
// Lotes de 1000: a OS tem 17 colunas, longe do limite de parâmetros do Postgres
function chunk(items, size = 1000) {
    const batches = [];
    for (let start = 0; start < items.length; start += size) {
        batches.push(items.slice(start, start + size));
    }
    return batches;
}
class RestoreBackupService {
    execute(_a) {
        return __awaiter(this, arguments, void 0, function* ({ file, userId }) {
            // Tudo é validado antes de apagar qualquer dado
            const backup = (0, backupFile_1.decodeBackup)(file);
            (0, backupFile_1.checkBackupIntegrity)(backup.data);
            // Lido antes do TRUNCATE: o admin pode não existir no backup
            const admin = yield prisma_1.default.user.findUnique({
                where: { id: userId },
                select: { name: true, email: true },
            });
            const { users, userAvatars, clients, os } = backup.data;
            const counts = (0, backupFile_1.countBackupRows)(backup.data);
            // Qualquer erro desfaz tudo. TRUNCATE é transacional no Postgres e trava as
            // tabelas: requisições concorrentes esperam o fim do restore.
            yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                yield tx.$executeRaw `TRUNCATE TABLE user_avatars, os, clients, users`;
                // Ids, created_at e update_at explícitos: o Prisma só preenche
                // @updatedAt quando o valor não é enviado
                for (const batch of chunk(users)) {
                    yield tx.user.createMany({ data: batch });
                }
                for (const batch of chunk(userAvatars)) {
                    yield tx.userAvatar.createMany({
                        data: batch,
                    });
                }
                for (const batch of chunk(clients)) {
                    yield tx.client.createMany({ data: batch });
                }
                for (const batch of chunk(os)) {
                    yield tx.os.createMany({ data: batch });
                }
                // Próximo id depois do maior restaurado; tabela vazia volta a começar em 1
                yield tx.$queryRaw `SELECT setval(pg_get_serial_sequence('clients', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM clients`;
                yield tx.$queryRaw `SELECT setval(pg_get_serial_sequence('os', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM os`;
                yield tx.backupLog.create({
                    data: {
                        action: "RESTORE",
                        userName: admin.name,
                        userEmail: admin.email,
                        counts,
                    },
                });
            }), { maxWait: 10000, timeout: 120000 });
            return counts;
        });
    }
}
exports.RestoreBackupService = RestoreBackupService;
