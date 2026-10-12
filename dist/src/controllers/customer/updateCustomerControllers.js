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
exports.UpdateCustomerController = void 0;
const common_1 = require("../../schemas/common");
const customer_1 = require("../../schemas/customer");
const updateCustomerService_1 = require("../../services/customer/updateCustomerService");
class UpdateCustomerController {
    handle(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const id = yield common_1.idParamSchema.parseAsync(req.params.id);
            const data = yield customer_1.updateCustomerSchema.parseAsync(req.body);
            const updateCustomerService = new updateCustomerService_1.UpdateCustomerService();
            const customer = yield updateCustomerService.execute(Object.assign({ id }, data));
            return res.status(200).json(customer);
        });
    }
}
exports.UpdateCustomerController = UpdateCustomerController;
