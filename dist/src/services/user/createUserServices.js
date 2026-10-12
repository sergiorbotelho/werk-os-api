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
exports.CreateUserService = void 0;
const bcryptjs_1 = require("bcryptjs");
const prisma_1 = __importDefault(require("../../prisma"));
const appError_1 = __importDefault(require("../../utils/appError"));
const generateTemporaryPassword_1 = require("../../utils/generateTemporaryPassword");
const userSelect_1 = require("./userSelect");
class CreateUserService {
    execute(_a) {
        return __awaiter(this, arguments, void 0, function* ({ name, email, role }) {
            // Sem diferenciar maiúsculas: e-mails antigos podem ter sido gravados com maiúsculas
            const userAlreadyExists = yield prisma_1.default.user.findFirst({
                where: {
                    email: { equals: email, mode: "insensitive" },
                },
            });
            if (userAlreadyExists) {
                throw new appError_1.default("E-mail já cadastrado", 409);
            }
            const temporaryPassword = (0, generateTemporaryPassword_1.generateTemporaryPassword)();
            const passwordHash = yield (0, bcryptjs_1.hash)(temporaryPassword, 8);
            const user = yield prisma_1.default.user.create({
                data: {
                    name,
                    email,
                    role,
                    password: passwordHash,
                    mustChangePassword: true,
                },
                select: userSelect_1.userSelect,
            });
            // A senha temporária só existe nesta resposta: o banco guarda o hash
            return { user, temporaryPassword };
        });
    }
}
exports.CreateUserService = CreateUserService;
