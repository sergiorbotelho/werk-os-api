import { Role } from "@prisma/client";
import { z } from "zod";

// trim e toLowerCase antes do formato: " Maria@Werk.com " vira "maria@werk.com"
export const emailSchema = z
  .string({ error: "E-mail é obrigatório" })
  .trim()
  .toLowerCase()
  .min(1, { error: "E-mail é obrigatório" })
  .pipe(z.email({ error: "E-mail inválido" }));

export const nameSchema = z
  .string({ error: "Nome é obrigatório" })
  .trim()
  .min(2, { error: "Nome deve ter no mínimo 2 caracteres" });

// Regra para senhas novas. O login não usa esta regra, para que as senhas
// antigas (mínimo de 6 caracteres) continuem entrando.
export const passwordSchema = z
  .string({ error: "Senha é obrigatória" })
  .min(8, { error: "A senha deve ter no mínimo 8 caracteres" })
  .max(72, { error: "A senha deve ter no máximo 72 caracteres" })
  .regex(/[A-Za-z]/, { error: "A senha deve conter pelo menos uma letra" })
  .regex(/\d/, { error: "A senha deve conter pelo menos um número" });

const roleSchema = z.enum(Role, { error: "Perfil inválido" });

// A senha é gerada pela API (senha temporária), não vem no corpo
export const createUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  role: roleSchema,
});

export const updateUserSchema = z
  .object({
    name: nameSchema.optional(),
    role: roleSchema.optional(),
    active: z.boolean({ error: "Situação inválida" }).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    error: "Informe ao menos um campo para alterar",
  });

export const authUserSchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: "Senha é obrigatória" })
    .min(1, { error: "Senha é obrigatória" }),
});

export const changePasswordSchema = z.object({
  currentPassword: z
    .string({ error: "Senha atual é obrigatória" })
    .min(1, { error: "Senha atual é obrigatória" }),
  newPassword: passwordSchema,
});

export const updateProfileSchema = z.object({
  name: nameSchema,
});

export const avatarMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;

const invalidImageMessage = "Formato de imagem inválido (use JPEG, PNG ou WebP)";

// Os bytes iniciais precisam bater com o tipo declarado: impede servir HTML ou
// SVG disfarçado de imagem.
function matchesSignature(
  mimeType: (typeof avatarMimeTypes)[number],
  data: Buffer,
) {
  // Defensivo: se os campos já falharam, não deixa o refine lançar TypeError (500)
  if (!Buffer.isBuffer(data)) return false;

  switch (mimeType) {
    case "image/jpeg":
      return data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
    case "image/png":
      return data
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case "image/webp":
      return (
        data.subarray(0, 4).toString("ascii") === "RIFF" &&
        data.subarray(8, 12).toString("ascii") === "WEBP"
      );
    default:
      return false;
  }
}

// Recebe { mimeType: header Content-Type, data: corpo lido pelo express.raw }.
// Com outro Content-Type o express.raw não lê o corpo, e data não é Buffer.
export const avatarSchema = z
  .object({
    // "image/jpeg; charset=binary" → "image/jpeg"
    mimeType: z.preprocess(
      (value) =>
        typeof value === "string"
          ? value.split(";")[0].trim().toLowerCase()
          : value,
      z.enum(avatarMimeTypes, { error: invalidImageMessage }),
    ),
    data: z
      .instanceof(Buffer, { error: invalidImageMessage })
      .refine((data) => data.length > 0, { error: invalidImageMessage }),
  })
  .refine(({ mimeType, data }) => matchesSignature(mimeType, data), {
    error: invalidImageMessage,
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type AuthUserInput = z.infer<typeof authUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type AvatarInput = z.infer<typeof avatarSchema>;
