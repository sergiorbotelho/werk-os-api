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
const _1 = __importDefault(require("."));
const appError_1 = __importDefault(require("../src/utils/appError"));
function seed() {
    return __awaiter(this, void 0, void 0, function* () {
        const passwordHash = yield (0, bcryptjs_1.hash)("123456", 8);
        yield _1.default.user.create({
            data: {
                id: "56d5910d-71d8-4a29-92b3-edfd624960a6",
                name: "Sergio Botelho",
                email: "admin@werk.com.br",
                password: passwordHash,
            },
        });
    });
}
seed()
    .then(() => {
    console.log("Database seeded!");
    _1.default.$disconnect();
})
    .catch((error) => {
    throw new appError_1.default("Seed ja exite", 400);
});
