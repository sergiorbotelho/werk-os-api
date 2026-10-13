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
exports.UploadAvatarService = void 0;
const prisma_1 = __importDefault(require("../../prisma"));
const userSelect_1 = require("./userSelect");
class UploadAvatarService {
    execute(_a) {
        return __awaiter(this, arguments, void 0, function* ({ userId, mimeType, data }) {
            // avatarUpdatedAt muda junto com a foto: é a versão usada na URL (?v=)
            const [, user] = yield prisma_1.default.$transaction([
                prisma_1.default.userAvatar.upsert({
                    where: { userId },
                    create: { userId, mimeType, data },
                    update: { mimeType, data },
                }),
                prisma_1.default.user.update({
                    where: { id: userId },
                    data: { avatarUpdatedAt: new Date() },
                    select: userSelect_1.profileSelect,
                }),
            ]);
            return user;
        });
    }
}
exports.UploadAvatarService = UploadAvatarService;
