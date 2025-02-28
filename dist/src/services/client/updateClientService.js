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
exports.UpdateClientService = void 0;
const cpf_cnpj_validator_1 = require("cpf-cnpj-validator");
const prisma_1 = __importDefault(require("../../prisma"));
const appError_1 = __importDefault(require("../../utils/appError"));
class UpdateClientService {
    execute(_a) {
        return __awaiter(this, arguments, void 0, function* ({ id, nome, telefone, cpf, cnpj, cep, endereco, numero, bairro, cidade, uf, }) {
            if (nome.trim().length === 0) {
                throw new appError_1.default("Nome inválido", 400);
            }
            if (cpf.trim().length === 0 && cnpj.trim().length === 0) {
                throw new appError_1.default("Informa ao menos um CPF ou CNPJ", 400);
            }
            if (cpf.trim().length !== 0 && !cpf_cnpj_validator_1.cpf.isValid(cpf)) {
                throw new appError_1.default("CPF Inválido", 400);
            }
            if (cnpj.trim().length !== 0 && !cpf_cnpj_validator_1.cnpj.isValid(cnpj)) {
                throw new appError_1.default("CNPJ Inválido", 400);
            }
            const existingClient = yield prisma_1.default.client.findUnique({
                where: { id },
            });
            if (!existingClient) {
                throw new appError_1.default("Cliente não encontrado", 400);
            }
            if ((cpf && cpf !== existingClient.cpf) ||
                (cnpj && cnpj !== existingClient.cnpj)) {
                const clientExists = yield prisma_1.default.client.findFirst({
                    where: {
                        OR: [
                            { cpf: cpf !== null && cpf !== void 0 ? cpf : undefined, id: { not: id } },
                            { cnpj: cnpj !== null && cnpj !== void 0 ? cnpj : undefined, id: { not: id } },
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
                    cpf: cpf && cpf.trim() !== "" ? cpf : null,
                    cnpj: cnpj && cnpj.trim() !== "" ? cnpj : null,
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
exports.UpdateClientService = UpdateClientService;
