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
exports.GetClientByIdControllers = void 0;
const common_1 = require("../../schemas/common");
const getCustomerByIdService_1 = require("../../services/customer/getCustomerByIdService");
class GetClientByIdControllers {
    handle(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const id = yield common_1.idParamSchema.parseAsync(req.params.id);
            const getCustomerByIdService = new getCustomerByIdService_1.GetCustomerByIdService();
            const client = yield getCustomerByIdService.execute(id);
            return res.status(200).json(client);
        });
    }
}
exports.GetClientByIdControllers = GetClientByIdControllers;
