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
exports.CreateOsControllers = void 0;
const zod_1 = require("zod");
const http_1 = require("../../helpers/http");
const order_1 = require("../../schemas/order");
const createOsService_1 = require("../../services/os/createOsService");
const appError_1 = __importDefault(require("../../utils/appError"));
class CreateOsControllers {
    handle(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield order_1.createOrUpdateServiceSchema.parseAsync(req.body);
                const createOsService = new createOsService_1.CreateOsService();
                const os = yield createOsService.execute(data);
                return res.status(201).json(os);
            }
            catch (error) {
                if (error instanceof zod_1.ZodError) {
                    return (0, http_1.badRequest)(res, error.issues[0].message);
                }
                if (error instanceof appError_1.default) {
                    return res.status(error.statusCode).json({ message: error.message });
                }
                console.error(error);
                return (0, http_1.serverError)(res);
            }
        });
    }
}
exports.CreateOsControllers = CreateOsControllers;
