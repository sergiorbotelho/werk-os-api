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
exports.ResetUserPasswordService = void 0;
const bcryptjs_1 = require("bcryptjs");
const prisma_1 = __importDefault(require("../../prisma"));
const appError_1 = __importDefault(require("../../utils/appError"));
const generateTemporaryPassword_1 = require("../../utils/generateTemporaryPassword");
class ResetUserPasswordService {
    execute(_a) {
        return __awaiter(this, arguments, void 0, function* ({ id }) {
            const user = yield prisma_1.default.user.findUnique({
                where: { id },
                select: { id: true },
            });
            if (!user) {
                throw new appError_1.default("Usuário não encontrado", 404);
            }
            const temporaryPassword = (0, generateTemporaryPassword_1.generateTemporaryPassword)();
            const passwordHash = yield (0, bcryptjs_1.hash)(temporaryPassword, 8);
            yield prisma_1.default.user.update({
                where: { id },
                data: { password: passwordHash, mustChangePassword: true },
            });
            return { temporaryPassword };
        });
    }
}
exports.ResetUserPasswordService = ResetUserPasswordService;
