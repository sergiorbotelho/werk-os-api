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
exports.GetAvatarController = void 0;
const common_1 = require("../../schemas/common");
const getAvatarService_1 = require("../../services/user/getAvatarService");
class GetAvatarController {
    handle(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const id = yield common_1.uuidParamSchema.parseAsync(req.params.id);
            const getAvatarService = new getAvatarService_1.GetAvatarService();
            const avatar = yield getAvatarService.execute(id);
            // O front pede a foto com ?v=<avatarUpdatedAt>: foto nova, URL nova
            res.setHeader("Content-Type", avatar.mimeType);
            res.setHeader("Cache-Control", "private, max-age=31536000, immutable");
            // Bytes enviados pelo usuário: o navegador não pode tratá-los como outro tipo
            res.setHeader("X-Content-Type-Options", "nosniff");
            // Buffer.from: send() serializaria um Uint8Array como JSON
            return res.status(200).send(Buffer.from(avatar.data));
        });
    }
}
exports.GetAvatarController = GetAvatarController;
