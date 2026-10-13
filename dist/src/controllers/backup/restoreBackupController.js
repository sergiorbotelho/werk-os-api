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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestoreBackupController = void 0;
const backup_1 = require("../../schemas/backup");
const restoreBackupService_1 = require("../../services/backup/restoreBackupService");
class RestoreBackupController {
    handle(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const file = yield backup_1.backupUploadSchema.parseAsync(req.body);
            const restoreBackupService = new restoreBackupService_1.RestoreBackupService();
            const counts = yield restoreBackupService.execute({
                file,
                userId: req.user_id,
            });
            return res.status(200).json({ message: "Backup restaurado", counts });
        });
    }
}
exports.RestoreBackupController = RestoreBackupController;
