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
exports.GetAllOsByClientService = void 0;
const prisma_1 = __importDefault(require("../../../prisma"));
class GetAllOsByClientService {
    execute(clientId) {
        return __awaiter(this, void 0, void 0, function* () {
            const count = yield prisma_1.default.os.count();
            const os = yield prisma_1.default.os.findMany({
                where: {
                    client_id: {
                        equals: parseInt(clientId),
                    },
                },
                select: {
                    id: true,
                    modeloEquipamento: true,
                    horaChegada: true,
                    horaSaida: true,
                    defeito: true,
                    defeitoConstatado: true,
                    solucao: true,
                    valServico: true,
                    valMaterial: true,
                    total: true,
                    garantiaPeca: true,
                    garantiaServico: true,
                },
            });
            return { os, count };
        });
    }
}
exports.GetAllOsByClientService = GetAllOsByClientService;
