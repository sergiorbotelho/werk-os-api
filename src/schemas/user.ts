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

export const createUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: z
    .string({ error: "Senha é obrigatória" })
    .min(6, { error: "A senha deve ter no mínimo 6 caracteres" }),
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

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type AuthUserInput = z.infer<typeof authUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
