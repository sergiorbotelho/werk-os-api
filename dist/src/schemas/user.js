"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileSchema = exports.changePasswordSchema = exports.authUserSchema = exports.updateUserSchema = exports.createUserSchema = exports.passwordSchema = exports.nameSchema = exports.emailSchema = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
// trim e toLowerCase antes do formato: " Maria@Werk.com " vira "maria@werk.com"
exports.emailSchema = zod_1.z
    .string({ error: "E-mail é obrigatório" })
    .trim()
    .toLowerCase()
    .min(1, { error: "E-mail é obrigatório" })
    .pipe(zod_1.z.email({ error: "E-mail inválido" }));
exports.nameSchema = zod_1.z
    .string({ error: "Nome é obrigatório" })
    .trim()
    .min(2, { error: "Nome deve ter no mínimo 2 caracteres" });
// Regra para senhas novas. O login não usa esta regra, para que as senhas
// antigas (mínimo de 6 caracteres) continuem entrando.
exports.passwordSchema = zod_1.z
    .string({ error: "Senha é obrigatória" })
    .min(8, { error: "A senha deve ter no mínimo 8 caracteres" })
    .max(72, { error: "A senha deve ter no máximo 72 caracteres" })
    .regex(/[A-Za-z]/, { error: "A senha deve conter pelo menos uma letra" })
    .regex(/\d/, { error: "A senha deve conter pelo menos um número" });
const roleSchema = zod_1.z.enum(client_1.Role, { error: "Perfil inválido" });
// A senha é gerada pela API (senha temporária), não vem no corpo
exports.createUserSchema = zod_1.z.object({
    name: exports.nameSchema,
    email: exports.emailSchema,
    role: roleSchema,
});
exports.updateUserSchema = zod_1.z
    .object({
    name: exports.nameSchema.optional(),
    role: roleSchema.optional(),
    active: zod_1.z.boolean({ error: "Situação inválida" }).optional(),
})
    .refine((data) => Object.values(data).some((value) => value !== undefined), {
    error: "Informe ao menos um campo para alterar",
});
exports.authUserSchema = zod_1.z.object({
    email: exports.emailSchema,
    password: zod_1.z
        .string({ error: "Senha é obrigatória" })
        .min(1, { error: "Senha é obrigatória" }),
});
exports.changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z
        .string({ error: "Senha atual é obrigatória" })
        .min(1, { error: "Senha atual é obrigatória" }),
    newPassword: exports.passwordSchema,
});
exports.updateProfileSchema = zod_1.z.object({
    name: exports.nameSchema,
});
