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
exports.GetClientByNameControllers = void 0;
const getClientByNameService_1 = require("../../services/client/getClientByNameService");
class GetClientByNameControllers {
    handle(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { name } = req.params;
            const getClientByNameService = new getClientByNameService_1.GetClientByNameService();
            const client = yield getClientByNameService.execute(name);
            return res.status(200).json({ client });
        });
    }
}
exports.GetClientByNameControllers = GetClientByNameControllers;
