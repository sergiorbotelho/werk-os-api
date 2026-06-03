"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkIdIsValid = void 0;
const validator_1 = __importDefault(require("validator"));
const checkIdIsValid = (id) => validator_1.default.isUUID(id);
exports.checkIdIsValid = checkIdIsValid;
