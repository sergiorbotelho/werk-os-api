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
exports.CreateBackupController = void 0;
const createBackupService_1 = require("../../services/backup/createBackupService");
class CreateBackupController {
    handle(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const createBackupService = new createBackupService_1.CreateBackupService();
            const { fileName, file } = yield createBackupService.execute(req.user_id);
            res.setHeader("Content-Type", "application/gzip");
            res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
            // O front está em outra origem: sem isto o navegador esconde o nome do arquivo
            res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
            res.setHeader("Cache-Control", "no-store");
            return res.status(200).send(file);
        });
    }
}
exports.CreateBackupController = CreateBackupController;
