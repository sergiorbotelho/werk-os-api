"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFound = exports.ok = exports.serverError = exports.badRequest = void 0;
const badRequest = (res, message) => {
    return res.status(400).json({
        message: message,
    });
};
exports.badRequest = badRequest;
const serverError = (res) => {
    return res.status(500).json({
        message: "Internal server error",
    });
};
exports.serverError = serverError;
const ok = (res, message) => {
    return res.status(200).json({
        message,
    });
};
exports.ok = ok;
const notFound = (res, message) => ({
    statusCode: 404,
    message,
});
exports.notFound = notFound;
