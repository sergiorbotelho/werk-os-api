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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateUserService = void 0;
const prisma_1 = __importDefault(require("../../prisma"));
const appError_1 = __importDefault(require("../../utils/appError"));
const userSelect_1 = require("./userSelect");
class UpdateUserService {
    execute(_a) {
        return __awaiter(this, void 0, void 0, function* () {
            var { id, actorId } = _a, data = __rest(_a, ["id", "actorId"]);
            const user = yield prisma_1.default.user.findUnique({
                where: { id },
                select: { id: true, role: true, active: true },
            });
            if (!user) {
                throw new appError_1.default("Usuário não encontrado", 404);
            }
            // Garante que sempre reste um admin ativo: quem age é um admin ativo e
            // nunca muda o próprio perfil ou situação.
            const changesOwnAccess = id === actorId &&
                ((data.role !== undefined && data.role !== user.role) ||
                    (data.active !== undefined && data.active !== user.active));
            if (changesOwnAccess) {
                throw new appError_1.default("Você não pode alterar seu próprio perfil ou situação", 400);
            }
            return prisma_1.default.user.update({
                where: { id },
                data,
                select: userSelect_1.userSelect,
            });
        });
    }
}
exports.UpdateUserService = UpdateUserService;
