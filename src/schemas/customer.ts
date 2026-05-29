import { cnpj as cnpjValid, cpf as cpfValid } from "cpf-cnpj-validator";
import z from "zod";

export const createOrUpdateCustomerSchema = z
  .object({
    nome: z.string({ error: "Name is required" }).trim().min(3),

    telefone: z.string().trim().max(20),

    cpf: z.string().trim().max(11).optional().or(z.literal("")),

    cnpj: z.string().trim().max(14).optional().or(z.literal("")),

    cep: z.string({ error: "CEP is required" }).trim().max(8),

    endereco: z.string({ error: "Endereço is required" }).trim(),

    numero: z.string({ error: "Número is required" }).trim().max(20),

    bairro: z.string({ error: "Bairro is required" }).trim(),

    cidade: z.string({ error: "Cidade is required" }).trim(),

    uf: z.string({ error: "UF is required" }).trim(),
  })
  .superRefine((data, ctx) => {
    const cpf = data.cpf?.trim() || "";
    const cnpj = data.cnpj?.trim() || "";

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

    if (cpf && !cpfValid.isValid(cpf)) {
      ctx.addIssue({
        code: "custom",
        message: "CPF inválido",
        path: ["cpf"],
      });
    }

    if (cnpj && !cnpjValid.isValid(cnpj)) {
      ctx.addIssue({
        code: "custom",
        message: "CNPJ inválido",
        path: ["cnpj"],
      });
    }
  });
