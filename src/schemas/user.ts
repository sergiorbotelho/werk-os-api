import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string({ error: "Name is required" }).trim().min(2),
  email: z
    .email({ error: "Invalid email address" })
    .trim()
    .min(1, { error: "Email is required" }),
  password: z
    .string({ error: "Password is required" })
    .min(6, { error: "Password must be at least 6 characters long" }),
});
