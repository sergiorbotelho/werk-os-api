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
exports.DeleteOsService = void 0;
const prisma_1 = __importDefault(require("../../prisma"));
const appError_1 = __importDefault(require("../../utils/appError"));
class DeleteOsService {
    execute(_a) {
        return __awaiter(this, arguments, void 0, function* ({ id }) {
            const os = yield prisma_1.default.os.findUnique({
                where: {
                    id,
                },
            });
            if (!os) {
                throw new appError_1.default("Ordem de serviço não encontrada", 404);
            }
            yield prisma_1.default.os.delete({
                where: {
                    id,
                },
            });
            return {
                message: "Ordem de serviço removida com sucesso",
            };
        });
    }
}
exports.DeleteOsService = DeleteOsService;
