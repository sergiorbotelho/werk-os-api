"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authUserSchema = exports.createUserSchema = void 0;
const zod_1 = require("zod");
exports.createUserSchema = zod_1.z.object({
    name: zod_1.z.string({ error: "Name is required" }).trim().min(2),
    email: zod_1.z
        .email({ error: "Invalid email address" })
        .trim()
        .min(1, { error: "Email is required" }),
    password: zod_1.z
        .string({ error: "Password is required" })
        .min(6, { error: "Password must be at least 6 characters long" }),
});
exports.authUserSchema = zod_1.z.object({
    email: zod_1.z
        .email({ error: "Invalid email address" })
        .trim()
        .min(1, { error: "Email is required" }),
    password: zod_1.z
        .string({ error: "Password is required" })
        .min(6, { error: "Password must be at least 6 characters long" }),
});
