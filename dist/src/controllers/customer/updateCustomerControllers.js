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
exports.UpdateCustomerController = void 0;
const zod_1 = require("zod");
const http_1 = require("../../helpers/http");
const customer_1 = require("../../schemas/customer");
const updateCustomerService_1 = require("../../services/customer/updateCustomerService");
const appError_1 = __importDefault(require("../../utils/appError"));
class UpdateCustomerController {
    handle(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const isIdString = req.params.id;
                const id = Number(isIdString);
                const params = req.body;
                yield customer_1.updateCustomerSchema.parseAsync(params);
                const updateCustomerService = new updateCustomerService_1.UpdateCustomerService();
                const customer = yield updateCustomerService.execute(Object.assign({ id }, params));
                return res.status(201).json(customer);
            }
            catch (error) {
                if (error instanceof zod_1.ZodError) {
                    return (0, http_1.badRequest)(res, error.issues[0].message);
                }
                if (error instanceof appError_1.default) {
                    return res.status(error.statusCode).json({ message: error.message });
                }
                return (0, http_1.serverError)(res);
            }
        });
    }
}
exports.UpdateCustomerController = UpdateCustomerController;
