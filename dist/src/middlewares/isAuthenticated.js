"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAuthenticated = isAuthenticated;
const jsonwebtoken_1 = require("jsonwebtoken");
const appError_1 = __importDefault(require("../utils/appError"));
function isAuthenticated(req, res, next) {
    const authToken = req.headers.authorization;
    if (!authToken) {
        throw new appError_1.default("Não autorizado", 401);
    }
    const [, token] = authToken.split(" ");
    try {
        const { sub } = (0, jsonwebtoken_1.verify)(token, process.env.JWT_SECRET);
        req.user_id = sub;
        return next();
    }
    catch (error) {
        console.log(error);
        throw new appError_1.default("Não autorizado", 401);
    }
}
