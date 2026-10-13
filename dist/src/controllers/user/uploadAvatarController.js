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
exports.UploadAvatarController = void 0;
const user_1 = require("../../schemas/user");
const uploadAvatarService_1 = require("../../services/user/uploadAvatarService");
class UploadAvatarController {
    handle(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield user_1.avatarSchema.parseAsync({
                mimeType: req.headers["content-type"],
                data: req.body,
            });
            const uploadAvatarService = new uploadAvatarService_1.UploadAvatarService();
            const user = yield uploadAvatarService.execute(Object.assign({ userId: req.user_id }, data));
            return res.status(200).json(user);
        });
    }
}
exports.UploadAvatarController = UploadAvatarController;
