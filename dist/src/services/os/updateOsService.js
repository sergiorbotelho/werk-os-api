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
exports.UpdateOsService = void 0;
const prisma_1 = __importDefault(require("../../../prisma"));
const appError_1 = __importDefault(require("../../utils/appError"));
class UpdateOsService {
    execute(_a) {
        return __awaiter(this, arguments, void 0, function* ({ id, contato, horaChegada, horaSaida, modeloEquipamento, defeito, defeitoConstatado, solucao, valServico, valMaterial, garantiaPeca, garantiaServico, tipoServico, cliente_id, }) {
            const idExists = yield prisma_1.default.os.findFirst({
                where: {
                    id,
                },
            });
            if (!idExists) {
                throw new appError_1.default("Os não encontrada", 404);
            }
            const os = yield prisma_1.default.os.update({
                where: {
                    id,
                },
                data: {
                    contato,
                    modeloEquipamento,
                    horaChegada,
                    horaSaida,
                    defeito,
                    defeitoConstatado,
                    solucao,
                    valServico,
                    valMaterial,
                    garantiaPeca,
                    garantiaServico,
                    tipoServico,
                    client_id: cliente_id,
                },
            });
            return os;
        });
    }
}
exports.UpdateOsService = UpdateOsService;
