"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailAlreadyInUseError = void 0;
class EmailAlreadyInUseError extends Error {
    constructor(email) {
        super(`The e-mail ${email} is already in use.`);
        this.name = "EmailAlreadyInUseError";
    }
}
exports.EmailAlreadyInUseError = EmailAlreadyInUseError;
