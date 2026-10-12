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
exports.UpdateOsService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../../prisma"));
const appError_1 = __importDefault(require("../../utils/appError"));
class UpdateOsService {
    execute(_a) {
        return __awaiter(this, void 0, void 0, function* () {
            var _b, _c, _d, _e;
            var { id, cliente_id } = _a, data = __rest(_a, ["id", "cliente_id"]);
            const existingOs = yield prisma_1.default.os.findUnique({
                where: { id },
            });
            if (!existingOs) {
                throw new appError_1.default("Ordem de serviço não encontrada", 404);
            }
            const client = yield prisma_1.default.client.findUnique({
                where: { id: cliente_id },
            });
            if (!client) {
                throw new appError_1.default("Cliente não encontrado", 404);
            }
            // Um valor ausente no corpo mantém o valor gravado, e o total acompanha
            const valServico = (_c = (_b = data.valServico) !== null && _b !== void 0 ? _b : existingOs.valServico) !== null && _c !== void 0 ? _c : 0;
            const valMaterial = (_e = (_d = data.valMaterial) !== null && _d !== void 0 ? _d : existingOs.valMaterial) !== null && _e !== void 0 ? _e : 0;
            const os = yield prisma_1.default.os.update({
                where: { id },
                data: Object.assign(Object.assign({}, data), { total: new client_1.Prisma.Decimal(valServico).plus(valMaterial), client_id: cliente_id }),
            });
            return os;
        });
    }
}
exports.UpdateOsService = UpdateOsService;
