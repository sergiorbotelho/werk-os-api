import { cnpj as cnpjValid, cpf as cpfValid } from "cpf-cnpj-validator";
import z from "zod";

const customerBaseSchema = z.object({
  nome: z.string({ error: "Nome é obrigatório" }).trim().min(3),

  telefone: z
    .string()
    .trim()
    .max(20)
    .min(8, { error: "Telefone é obrigatório" }),

  email: z.email({ error: "Endereço de email inválido" }).trim(),

  cpf: z.string().trim().max(11).optional().or(z.literal("")),

  cnpj: z.string().trim().max(14).optional().or(z.literal("")),

  cep: z.string().trim().max(8).optional(),

  endereco: z.string().trim().optional(),

  numero: z.string().trim().max(20).optional(),

  bairro: z.string().trim().optional(),

  cidade: z.string().trim().optional(),

  uf: z.string().trim().optional(),
});

export const createCustomerSchema = customerBaseSchema.superRefine(
  (data, ctx) => {
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
  },
);

export const updateCustomerSchema = customerBaseSchema.superRefine(
  (data, ctx) => {
    const cpf = data.cpf?.trim() || "";
    const cnpj = data.cnpj?.trim() || "";

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
  },
);
