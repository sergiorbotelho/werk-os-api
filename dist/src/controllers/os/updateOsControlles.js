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
exports.UpdateOsControllers = void 0;
const updateOsService_1 = require("../../services/os/updateOsService");
class UpdateOsControllers {
    handle(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const isIdString = req.params.id;
            const id = Number(isIdString);
            const { contato, modeloEquipamento, horaChegada, horaSaida, defeito, defeitoConstatado, solucao, valServico, valMaterial, garantiaPeca, garantiaServico, tipoServico, cliente_id, } = req.body;
            const updateOsService = new updateOsService_1.UpdateOsService();
            const os = yield updateOsService.execute({
                id,
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
                tipoServico,
                cliente_id,
            });
            res.status(201).json(os);
        });
    }
}
exports.UpdateOsControllers = UpdateOsControllers;
