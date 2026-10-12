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
exports.CreateCustomerService = void 0;
const prisma_1 = __importDefault(require("../../prisma"));
const appError_1 = __importDefault(require("../../utils/appError"));
class CreateCustomerService {
    execute(_a) {
        return __awaiter(this, void 0, void 0, function* () {
            var { cpf, cnpj } = _a, data = __rest(_a, ["cpf", "cnpj"]);
            const normalizedCpf = (cpf === null || cpf === void 0 ? void 0 : cpf.trim()) || null;
            const normalizedCnpj = (cnpj === null || cnpj === void 0 ? void 0 : cnpj.trim()) || null;
            const documentFilters = [
                ...(normalizedCpf ? [{ cpf: normalizedCpf }] : []),
                ...(normalizedCnpj ? [{ cnpj: normalizedCnpj }] : []),
            ];
            const clientExists = documentFilters.length > 0 &&
                (yield prisma_1.default.client.findFirst({
                    where: { OR: documentFilters },
                }));
            if (clientExists) {
                throw new appError_1.default("CPF ou CNPJ Já cadastrado", 409);
            }
            const cliente = yield prisma_1.default.client.create({
                data: Object.assign(Object.assign({}, data), { cpf: normalizedCpf, cnpj: normalizedCnpj }),
            });
            return cliente;
        });
    }
}
exports.CreateCustomerService = CreateCustomerService;
