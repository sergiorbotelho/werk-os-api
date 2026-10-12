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
exports.GetAllOsByController = void 0;
const zod_1 = require("zod");
const http_1 = require("../../helpers/http");
const common_1 = require("../../schemas/common");
const getAllOsByClientService_1 = require("../../services/os/getAllOsByClientService");
const appError_1 = __importDefault(require("../../utils/appError"));
class GetAllOsByController {
    handle(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const clientId = yield common_1.idParamSchema.parseAsync(req.params.clientId);
                const getAllOsClientService = new getAllOsByClientService_1.GetAllOsByClientService();
                const os = yield getAllOsClientService.execute(clientId);
                return res.status(200).json(os);
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
exports.GetAllOsByController = GetAllOsByController;
