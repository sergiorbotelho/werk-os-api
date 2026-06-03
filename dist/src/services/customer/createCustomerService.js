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
exports.CreateCustomerService = void 0;
const prisma_1 = __importDefault(require("../../prisma"));
const appError_1 = __importDefault(require("../../utils/appError"));
class CreateCustomerService {
    execute(_a) {
        return __awaiter(this, arguments, void 0, function* ({ nome, telefone, email, cpf, cnpj, cep, endereco, numero, bairro, cidade, uf, }) {
            const clientExists = yield prisma_1.default.client.findFirst({
                where: {
                    OR: [{ cpf: cpf }, { cnpj: cnpj }],
                },
            });
            if (clientExists) {
                throw new appError_1.default("CPF ou CNPJ Já cadastrado", 400);
            }
            const cliente = yield prisma_1.default.client.create({
                data: {
                    nome: nome,
                    telefone: telefone,
                    email: email,
                    cpf: cpf && cpf.trim() !== "" ? cpf : null,
                    cnpj: cnpj && cnpj.trim() !== "" ? cnpj : null,
                    cep: cep,
                    endereco: endereco,
                    numero: numero,
                    bairro: bairro,
                    cidade: cidade,
                    uf: uf,
                },
            });
            return cliente;
        });
    }
}
exports.CreateCustomerService = CreateCustomerService;
