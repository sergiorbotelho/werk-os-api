"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = requireAdmin;
const appError_1 = __importDefault(require("../utils/appError"));
// Sempre depois de isAuthenticated, que preenche req.user_role
function requireAdmin(req, res, next) {
    if (req.user_role !== "ADMIN") {
        throw new appError_1.default("Acesso negado", 403);
    }
    return next();
}
