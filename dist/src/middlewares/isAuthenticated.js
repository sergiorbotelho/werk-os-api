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
exports.isAuthenticated = isAuthenticated;
exports.isAuthenticatedPendingPassword = isAuthenticatedPendingPassword;
const jsonwebtoken_1 = require("jsonwebtoken");
const prisma_1 = __importDefault(require("../prisma"));
const appError_1 = __importDefault(require("../utils/appError"));
// Lê o usuário do banco a cada requisição, para que desativação, mudança de
// perfil e senha temporária valham na hora, sem esperar o token vencer.
function authenticate(req, allowPendingPassword) {
    return __awaiter(this, void 0, void 0, function* () {
        const authToken = req.headers.authorization;
        if (!authToken) {
            throw new appError_1.default("Não autorizado", 401);
        }
        const [, token] = authToken.split(" ");
        let userId;
        try {
            const { sub } = (0, jsonwebtoken_1.verify)(token, process.env.JWT_SECRET);
            userId = sub;
        }
        catch (_a) {
            throw new appError_1.default("Não autorizado", 401);
        }
        if (!userId) {
            throw new appError_1.default("Não autorizado", 401);
        }
        const user = yield prisma_1.default.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true, active: true, mustChangePassword: true },
        });
        if (!user || !user.active) {
            throw new appError_1.default("Não autorizado", 401);
        }
        if (user.mustChangePassword && !allowPendingPassword) {
            throw new appError_1.default("Troca de senha obrigatória", 403);
        }
        req.user_id = user.id;
        req.user_role = user.role;
    });
}
function isAuthenticated(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        yield authenticate(req, false);
        return next();
    });
}
// Só para GET /me e PUT /me/password: deixa passar quem ainda precisa trocar a senha temporária
function isAuthenticatedPendingPassword(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        yield authenticate(req, true);
        return next();
    });
}
