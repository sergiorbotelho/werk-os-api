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
exports.UpdateCustomerService = void 0;
const prisma_1 = __importDefault(require("../../prisma"));
const appError_1 = __importDefault(require("../../utils/appError"));
class UpdateCustomerService {
    execute(_a) {
        return __awaiter(this, arguments, void 0, function* ({ id, nome, telefone, email, cpf, cnpj, cep, endereco, numero, bairro, cidade, uf, }) {
            const existingClient = yield prisma_1.default.client.findUnique({
                where: { id },
            });
            if (!existingClient) {
                throw new appError_1.default("Cliente não encontrado", 400);
            }
            const normalizedCpf = (cpf === null || cpf === void 0 ? void 0 : cpf.trim()) || null;
            const normalizedCnpj = (cnpj === null || cnpj === void 0 ? void 0 : cnpj.trim()) || null;
            if (!normalizedCpf && !normalizedCnpj) {
                throw new appError_1.default("Informe um CPF ou um CNPJ", 400);
            }
            if (normalizedCpf !== existingClient.cpf ||
                normalizedCnpj !== existingClient.cnpj) {
                const clientExists = yield prisma_1.default.client.findFirst({
                    where: {
                        id: { not: id },
                        OR: [
                            normalizedCpf ? { cpf: normalizedCpf } : {},
                            normalizedCnpj ? { cnpj: normalizedCnpj } : {},
                        ],
                    },
                });
                if (clientExists) {
                    throw new appError_1.default("CPF ou CNPJ já cadastrado em outro cliente", 400);
                }
            }
            const cliente = yield prisma_1.default.client.update({
                where: {
                    id,
                },
                data: {
                    nome,
                    telefone,
                    email,
                    cpf: normalizedCpf,
                    cnpj: normalizedCnpj,
                    cep,
                    endereco,
                    numero,
                    bairro,
                    cidade,
                    uf,
                },
            });
            return cliente;
        });
    }
}
exports.UpdateCustomerService = UpdateCustomerService;
