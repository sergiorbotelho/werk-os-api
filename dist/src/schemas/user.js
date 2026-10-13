"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.avatarSchema = exports.avatarMimeTypes = exports.updateProfileSchema = exports.changePasswordSchema = exports.authUserSchema = exports.updateUserSchema = exports.createUserSchema = exports.passwordSchema = exports.nameSchema = exports.emailSchema = void 0;
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
exports.avatarMimeTypes = ["image/jpeg", "image/png", "image/webp"];
const invalidImageMessage = "Formato de imagem inválido (use JPEG, PNG ou WebP)";
// Os bytes iniciais precisam bater com o tipo declarado: impede servir HTML ou
// SVG disfarçado de imagem.
function matchesSignature(mimeType, data) {
    // Defensivo: se os campos já falharam, não deixa o refine lançar TypeError (500)
    if (!Buffer.isBuffer(data))
        return false;
    switch (mimeType) {
        case "image/jpeg":
            return data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
        case "image/png":
            return data
                .subarray(0, 8)
                .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
        case "image/webp":
            return (data.subarray(0, 4).toString("ascii") === "RIFF" &&
                data.subarray(8, 12).toString("ascii") === "WEBP");
        default:
            return false;
    }
}
// Recebe { mimeType: header Content-Type, data: corpo lido pelo express.raw }.
// Com outro Content-Type o express.raw não lê o corpo, e data não é Buffer.
exports.avatarSchema = zod_1.z
    .object({
    // "image/jpeg; charset=binary" → "image/jpeg"
    mimeType: zod_1.z.preprocess((value) => typeof value === "string"
        ? value.split(";")[0].trim().toLowerCase()
        : value, zod_1.z.enum(exports.avatarMimeTypes, { error: invalidImageMessage })),
    data: zod_1.z
        .instanceof(Buffer, { error: invalidImageMessage })
        .refine((data) => data.length > 0, { error: invalidImageMessage }),
})
    .refine(({ mimeType, data }) => matchesSignature(mimeType, data), {
    error: invalidImageMessage,
});
