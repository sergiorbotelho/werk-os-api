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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateOsControllers = void 0;
const createOsService_1 = require("../../services/os/createOsService");
class CreateOsControllers {
    handle(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { contato, horaChegada, horaSaida, modeloEquipamento, defeito, defeitoConstatado, solucao, valServico, valMaterial, garantiaPeca, garantiaServico, cliente_id, } = req.body;
            const createOsService = new createOsService_1.CreateOsService();
            const os = yield createOsService.execute({
                contato,
                horaChegada,
                horaSaida,
                modeloEquipamento,
                defeito,
                defeitoConstatado,
                solucao,
                valServico,
                valMaterial,
                garantiaPeca,
                garantiaServico,
                cliente_id,
            });
            res.status(201).json(os);
        });
    }
}
exports.CreateOsControllers = CreateOsControllers;
