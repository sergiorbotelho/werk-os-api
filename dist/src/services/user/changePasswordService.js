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
exports.ChangePasswordService = void 0;
const bcryptjs_1 = require("bcryptjs");
const prisma_1 = __importDefault(require("../../prisma"));
const appError_1 = __importDefault(require("../../utils/appError"));
class ChangePasswordService {
    execute(_a) {
        return __awaiter(this, arguments, void 0, function* ({ userId, currentPassword, newPassword }) {
            const user = yield prisma_1.default.user.findUnique({
                where: { id: userId },
            });
            if (!user) {
                throw new appError_1.default("Usuário não encontrado", 404);
            }
            const currentPasswordMatches = yield (0, bcryptjs_1.compare)(currentPassword, user.password);
            if (!currentPasswordMatches) {
                throw new appError_1.default("Senha atual incorreta", 400);
            }
            if (currentPassword === newPassword) {
                throw new appError_1.default("A nova senha deve ser diferente da atual", 400);
            }
            const passwordHash = yield (0, bcryptjs_1.hash)(newPassword, 8);
            yield prisma_1.default.user.update({
                where: { id: userId },
                data: { password: passwordHash, mustChangePassword: false },
            });
            return { message: "Senha alterada com sucesso" };
        });
    }
}
exports.ChangePasswordService = ChangePasswordService;
