"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileSelect = void 0;
// Campos devolvidos em GET /me e PUT /me
exports.profileSelect = {
    id: true,
    name: true,
    email: true,
    role: true,
    mustChangePassword: true,
};
