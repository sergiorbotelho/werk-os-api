"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCustomerSchema = exports.createCustomerSchema = void 0;
const cpf_cnpj_validator_1 = require("cpf-cnpj-validator");
const zod_1 = __importDefault(require("zod"));
const customerBaseSchema = zod_1.default.object({
    nome: zod_1.default.string({ error: "Nome é obrigatório" }).trim().min(3),
    telefone: zod_1.default
        .string()
        .trim()
        .max(20)
        .min(8, { error: "Telefone é obrigatório" }),
    email: zod_1.default.email({ error: "Endereço de email inválido" }).trim(),
    cpf: zod_1.default.string().trim().max(11).optional().or(zod_1.default.literal("")),
    cnpj: zod_1.default.string().trim().max(14).optional().or(zod_1.default.literal("")),
    cep: zod_1.default.string().trim().max(8).optional(),
    endereco: zod_1.default.string().trim().optional(),
    numero: zod_1.default.string().trim().max(20).optional(),
    bairro: zod_1.default.string().trim().optional(),
    cidade: zod_1.default.string().trim().optional(),
    uf: zod_1.default.string().trim().optional(),
});
exports.createCustomerSchema = customerBaseSchema.superRefine((data, ctx) => {
    var _a, _b;
    const cpf = ((_a = data.cpf) === null || _a === void 0 ? void 0 : _a.trim()) || "";
    const cnpj = ((_b = data.cnpj) === null || _b === void 0 ? void 0 : _b.trim()) || "";
    if (!cpf && !cnpj) {
        ctx.addIssue({
            code: "custom",
            message: "Informe ao menos um CPF ou CNPJ",
            path: ["cpf"],
        });
        ctx.addIssue({
            code: "custom",
            message: "Informe ao menos um CPF ou CNPJ",
            path: ["cnpj"],
        });
    }
    if (cpf && !cpf_cnpj_validator_1.cpf.isValid(cpf)) {
        ctx.addIssue({
            code: "custom",
            message: "CPF inválido",
            path: ["cpf"],
        });
    }
    if (cnpj && !cpf_cnpj_validator_1.cnpj.isValid(cnpj)) {
        ctx.addIssue({
            code: "custom",
            message: "CNPJ inválido",
            path: ["cnpj"],
        });
    }
});
exports.updateCustomerSchema = customerBaseSchema.superRefine((data, ctx) => {
    var _a, _b;
    const cpf = ((_a = data.cpf) === null || _a === void 0 ? void 0 : _a.trim()) || "";
    const cnpj = ((_b = data.cnpj) === null || _b === void 0 ? void 0 : _b.trim()) || "";
    if (cpf && !cpf_cnpj_validator_1.cpf.isValid(cpf)) {
        ctx.addIssue({
            code: "custom",
            message: "CPF inválido",
            path: ["cpf"],
        });
    }
    if (cnpj && !cpf_cnpj_validator_1.cnpj.isValid(cnpj)) {
        ctx.addIssue({
            code: "custom",
            message: "CNPJ inválido",
            path: ["cnpj"],
        });
    }
});
