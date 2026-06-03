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
exports.DeleteCustomerService = void 0;
const prisma_1 = __importDefault(require("../../prisma"));
const appError_1 = __importDefault(require("../../utils/appError"));
class DeleteCustomerService {
    execute(_a) {
        return __awaiter(this, arguments, void 0, function* ({ id }) {
            const customer = yield prisma_1.default.client.findUnique({
                where: { id },
                include: {
                    os: true,
                },
            });
            if (!customer) {
                throw new appError_1.default("Cliente não encontrado", 404);
            }
            if (customer.os.length > 0) {
                throw new appError_1.default("Não é possível excluir um cliente que possui ordens de serviço vinculadas.", 400);
            }
            yield prisma_1.default.client.delete({
                where: { id },
            });
            return {
                message: "Cliente removido com sucesso",
            };
        });
    }
}
exports.DeleteCustomerService = DeleteCustomerService;
