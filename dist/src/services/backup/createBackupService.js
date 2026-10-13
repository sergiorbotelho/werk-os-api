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
exports.CreateBackupService = void 0;
const client_1 = require("@prisma/client");
const backupFile_1 = require("../../lib/backupFile");
const prisma_1 = __importDefault(require("../../prisma"));
const appError_1 = __importDefault(require("../../utils/appError"));
class CreateBackupService {
    execute(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const admin = yield prisma_1.default.user.findUnique({
                where: { id: userId },
                select: { name: true, email: true },
            });
            // RepeatableRead: as quatro leituras enxergam o mesmo instante do banco
            const [users, userAvatars, clients, os, migrations] = yield prisma_1.default.$transaction([
                prisma_1.default.user.findMany({ orderBy: { id: "asc" } }),
                prisma_1.default.userAvatar.findMany({ orderBy: { userId: "asc" } }),
                prisma_1.default.client.findMany({ orderBy: { id: "asc" } }),
                prisma_1.default.os.findMany({ orderBy: { id: "asc" } }),
                prisma_1.default.$queryRaw `
            SELECT migration_name FROM _prisma_migrations
            WHERE finished_at IS NOT NULL
            ORDER BY finished_at DESC, migration_name DESC
            LIMIT 1`,
            ], { isolationLevel: client_1.Prisma.TransactionIsolationLevel.RepeatableRead });
            const createdAt = new Date();
            const counts = (0, backupFile_1.countBackupRows)({ users, userAvatars, clients, os });
            const file = (0, backupFile_1.encodeBackup)({
                format: "werk-backup",
                version: 1,
                createdAt: createdAt.toISOString(),
                createdBy: admin.email,
                migration: (_b = (_a = migrations[0]) === null || _a === void 0 ? void 0 : _a.migration_name) !== null && _b !== void 0 ? _b : null,
                data: {
                    users,
                    // Sem isto, JSON.stringify gravaria o Buffer como { type, data: [bytes] }
                    userAvatars: userAvatars.map((avatar) => (Object.assign(Object.assign({}, avatar), { data: Buffer.from(avatar.data).toString("base64") }))),
                    clients,
                    os,
                },
            });
            if (file.length > backupFile_1.BACKUP_MAX_BYTES) {
                throw new appError_1.default("Backup maior que o limite de 4 MB. Use o procedimento manual do README.", 413);
            }
            yield prisma_1.default.backupLog.create({
                data: {
                    action: "BACKUP",
                    userName: admin.name,
                    userEmail: admin.email,
                    counts,
                },
            });
            return { fileName: (0, backupFile_1.backupFileName)(createdAt), file };
        });
    }
}
exports.CreateBackupService = CreateBackupService;
