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
exports.GetAllOsService = void 0;
const prisma_1 = __importDefault(require("../../../prisma"));
class GetAllOsService {
    execute() {
        return __awaiter(this, void 0, void 0, function* () {
            const os = yield prisma_1.default.os.findMany({
                // skip: page * 2,
                // take: 2,
                select: {
                    id: true,
                    contato: true,
                    horaChegada: true,
                    horaSaida: true,
                    defeito: true,
                    defeitoConstatado: true,
                    garantiaPeca: true,
                    garantiaServico: true,
                    modeloEquipamento: true,
                    solucao: true,
                    tipoServico: true,
                    total: true,
                    valMaterial: true,
                    valServico: true,
                    created_at: true,
                    client: true,
                },
            });
            return { os };
        });
    }
}
exports.GetAllOsService = GetAllOsService;
