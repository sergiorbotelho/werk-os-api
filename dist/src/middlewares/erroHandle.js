"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const appError_1 = __importDefault(require("../utils/appError")); // Caminho da classe personalizada
function errorHandler(err, req, res, next) {
    if (err instanceof appError_1.default) {
        return res.status(err.statusCode).json({
            status: "error",
            message: err.message,
        });
    }
    console.error(err); // Para logar erros inesperados no servidor
    return res.status(500).json({
        status: "error",
        message: "Internal server error",
    });
}
