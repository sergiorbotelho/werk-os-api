"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userSelect = exports.profileSelect = void 0;
// Campos devolvidos em GET /me e PUT /me
exports.profileSelect = {
    id: true,
    name: true,
    email: true,
    role: true,
    mustChangePassword: true,
};
// Campos devolvidos na gestão de usuários (admin)
exports.userSelect = Object.assign(Object.assign({}, exports.profileSelect), { active: true, created_at: true });
