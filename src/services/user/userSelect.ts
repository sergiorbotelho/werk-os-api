import { Prisma } from "@prisma/client";

// Campos devolvidos em GET /me e PUT /me
export const profileSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  mustChangePassword: true,
} satisfies Prisma.UserSelect;

// Campos devolvidos na gestão de usuários (admin)
export const userSelect = {
  ...profileSelect,
  active: true,
  created_at: true,
} satisfies Prisma.UserSelect;
