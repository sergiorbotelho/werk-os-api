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
exports.GetOsByIdService = void 0;
const prisma_1 = __importDefault(require("../../prisma"));
const appError_1 = __importDefault(require("../../utils/appError"));
class GetOsByIdService {
    execute(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const os = yield prisma_1.default.os.findUnique({
                where: { id },
                select: {
                    id: true,
                    contato: true,
                    modeloEquipamento: true,
                    defeito: true,
                    horaChegada: true,
                    horaSaida: true,
                    defeitoConstatado: true,
                    solucao: true,
                    valServico: true,
                    valMaterial: true,
                    total: true,
                    garantiaPeca: true,
                    garantiaServico: true,
                    tipoServico: true,
                    client_id: true,
                },
            });
            if (!os) {
                throw new appError_1.default("Ordem de serviço não encontrada", 404);
            }
            return os;
        });
    }
}
exports.GetOsByIdService = GetOsByIdService;
