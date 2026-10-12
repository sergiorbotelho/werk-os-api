"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.idParamSchema = void 0;
const zod_1 = require("zod");
exports.idParamSchema = zod_1.z.coerce
    .number({ error: "Id inválido" })
    .int({ error: "Id inválido" })
    .positive({ error: "Id inválido" });
