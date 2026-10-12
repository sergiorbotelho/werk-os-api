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
exports.GetCustomerByIdService = void 0;
const prisma_1 = __importDefault(require("../../prisma"));
const appError_1 = __importDefault(require("../../utils/appError"));
class GetCustomerByIdService {
    execute(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = yield prisma_1.default.client.findUnique({
                where: { id },
                select: {
                    id: true,
                    nome: true,
                    email: true,
                    telefone: true,
                    cpf: true,
                    cnpj: true,
                    endereco: true,
                    numero: true,
                    bairro: true,
                    cidade: true,
                    uf: true,
                    cep: true,
                },
            });
            if (!client) {
                throw new appError_1.default("Cliente não encontrado", 404);
            }
            return client;
        });
    }
}
exports.GetCustomerByIdService = GetCustomerByIdService;
