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
exports.DeleteOsController = void 0;
const http_1 = require("../../helpers/http");
const deleteOsService_1 = require("../../services/os/deleteOsService");
const appError_1 = __importDefault(require("../../utils/appError"));
class DeleteOsController {
    handle(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = Number(req.params.id);
                const service = new deleteOsService_1.DeleteOsService();
                const result = yield service.execute({ id });
                return res.status(200).json(result);
            }
            catch (error) {
                if (error instanceof appError_1.default) {
                    return res.status(error.statusCode).json({ message: error.message });
                }
                return (0, http_1.serverError)(res);
            }
        });
    }
}
exports.DeleteOsController = DeleteOsController;
