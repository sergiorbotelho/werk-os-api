"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const erroHandle_1 = require("./middlewares/erroHandle");
const routers_1 = require("./routers");
require("express-async-errors");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)());
app.use(routers_1.router);
app.use(erroHandle_1.errorHandler);
const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Server at running on ${PORT}`));
