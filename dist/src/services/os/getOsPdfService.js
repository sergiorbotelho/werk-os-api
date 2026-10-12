"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetOsPdfService = void 0;
const prisma_1 = __importDefault(require("../../prisma"));
const osPdf_1 = require("../../reports/osPdf");
const appError_1 = __importDefault(require("../../utils/appError"));
class GetOsPdfService {
    execute(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const os = yield prisma_1.default.os.findUnique({
                where: { id },
                include: { client: true },
            });
            if (!os) {
                throw new appError_1.default("Ordem de serviço não encontrada", 404);
            }
            // Carregado só aqui: o pdfmake pesa ~150 ms na subida e lê arquivos do disco ao carregar
            const { renderPdf } = yield Promise.resolve().then(() => __importStar(require("../../lib/pdf")));
            return renderPdf((0, osPdf_1.buildOsPdfDefinition)(os));
        });
    }
}
exports.GetOsPdfService = GetOsPdfService;
