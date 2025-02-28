"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const globalForPrisma = globalThis;
const prismaClient = globalForPrisma.prisma || new client_1.PrismaClient();
exports.default = prismaClient;
if (process.env.NODE_ENV !== "production")
    globalForPrisma.prisma = prismaClient;
