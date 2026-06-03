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
const http_1 = require("../../helpers/http");
const getCustomerByNameService_1 = require("../../services/customer/getCustomerByNameService");
class GetClientByNameControllers {
    handle(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { name } = req.params;
                const getClientByNameService = new getCustomerByNameService_1.GetCustomerByNameService();
                const client = yield getClientByNameService.execute(name.trim());
                return res.status(200).json({ client });
            }
            catch (error) {
                return (0, http_1.serverError)(res);
            }
        });
    }
}
exports.GetClientByNameControllers = GetClientByNameControllers;
