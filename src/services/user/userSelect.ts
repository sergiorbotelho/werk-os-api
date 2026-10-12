import { Prisma } from "@prisma/client";

// Campos devolvidos em GET /me e PUT /me
export const profileSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  mustChangePassword: true,
} satisfies Prisma.UserSelect;
