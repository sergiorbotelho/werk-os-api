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
const zod_1 = require("zod");
const http_1 = require("../../helpers/http");
const order_1 = require("../../schemas/order");
const createOsService_1 = require("../../services/os/createOsService");
class CreateOsControllers {
    handle(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const params = req.body;
                yield order_1.createOrUpdateServiceSchema.parseAsync(params);
                const createOsService = new createOsService_1.CreateOsService();
                const os = yield createOsService.execute(params);
                res.status(201).json(os);
            }
            catch (error) {
                if (error instanceof zod_1.ZodError) {
                    return (0, http_1.badRequest)(res, error.issues[0].message);
                }
                return (0, http_1.serverError)(res);
            }
        });
    }
}
exports.CreateOsControllers = CreateOsControllers;
