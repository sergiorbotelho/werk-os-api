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
exports.CreateOsService = void 0;
const prisma_1 = __importDefault(require("../../../prisma"));
class CreateOsService {
    execute(_a) {
        return __awaiter(this, arguments, void 0, function* ({ contato, horaChegada, horaSaida, modeloEquipamento, defeito, defeitoConstatado, solucao, valServico, valMaterial, garantiaPeca, garantiaServico, cliente_id, }) {
            const os = yield prisma_1.default.os.create({
                data: {
                    contato: contato,
                    horaChegada: horaChegada,
                    horaSaida: horaSaida,
                    modeloEquipamento: modeloEquipamento,
                    defeito: defeito,
                    defeitoConstatado: defeitoConstatado,
                    solucao: solucao,
                    valServico: valServico,
                    valMaterial: valMaterial,
                    total: valServico + valMaterial,
                    garantiaPeca: garantiaPeca,
                    garantiaServico: garantiaServico,
                    client_id: cliente_id,
                },
            });
            return { os };
        });
    }
}
exports.CreateOsService = CreateOsService;
