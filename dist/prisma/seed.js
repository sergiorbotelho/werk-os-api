"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = require("bcryptjs");
const prisma_1 = __importDefault(require("../src/prisma"));
const ADMIN_EMAIL = "admin@werk.com.br";
const SEED_PASSWORD = "123456";
function seed() {
    return __awaiter(this, void 0, void 0, function* () {
        const passwordHash = yield (0, bcryptjs_1.hash)(SEED_PASSWORD, 8);
        // O update vazio preserva perfil e situação definidos pela tela de usuários
        const admin = yield prisma_1.default.user.upsert({
            where: {
                email: ADMIN_EMAIL,
            },
            update: {},
            create: {
                id: "56d5910d-71d8-4a29-92b3-edfd624960a6",
                name: "Sergio Botelho",
                email: ADMIN_EMAIL,
                password: passwordHash,
                role: "ADMIN",
            },
        });
        // A senha do seed é pública no repositório: obriga a troca enquanto ela não mudar
        if (!admin.mustChangePassword &&
            (yield (0, bcryptjs_1.compare)(SEED_PASSWORD, admin.password))) {
            yield prisma_1.default.user.update({
                where: { id: admin.id },
                data: { mustChangePassword: true },
            });
        }
        console.log("Database seeded!");
    });
}
seed()
    .catch((error) => {
    console.error(error);
    process.exit(1);
})
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma_1.default.$disconnect();
}));
