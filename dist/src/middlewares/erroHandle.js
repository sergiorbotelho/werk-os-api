"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const appError_1 = __importDefault(require("../utils/appError"));
// Erros do Prisma que representam falha do cliente, não do servidor
const prismaErrors = {
    P2002: { status: 409, message: "Registro já cadastrado" },
    P2003: { status: 400, message: "Registro relacionado não encontrado" },
    P2025: { status: 404, message: "Registro não encontrado" },
};
function errorHandler(err, req, res, next) {
    if (err instanceof zod_1.ZodError) {
        return res.status(400).json({ message: err.issues[0].message });
    }
    if (err instanceof appError_1.default) {
        return res.status(err.statusCode).json({ message: err.message });
    }
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError &&
        prismaErrors[err.code]) {
        const { status, message } = prismaErrors[err.code];
        return res.status(status).json({ message });
    }
    // Corpo com JSON malformado (lançado pelo express.json)
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ message: "JSON inválido" });
    }
    console.error(err);
    return res.status(500).json({ message: "Erro interno do servidor" });
}
