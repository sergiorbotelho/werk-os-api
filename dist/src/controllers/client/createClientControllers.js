"use strict";
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
exports.CreateClientController = void 0;
const createClientService_1 = require("../../services/client/createClientService");
const appError_1 = __importDefault(require("../../utils/appError"));
class CreateClientController {
    handle(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { nome, telefone, cpf, cnpj, cep, endereco, numero, bairro, cidade, uf, } = req.body;
                const createClientService = new createClientService_1.CreateClientService();
                const client = yield createClientService.execute({
                    nome,
                    telefone,
                    cpf,
                    cnpj,
                    cep,
                    endereco,
                    numero,
                    bairro,
                    cidade,
                    uf,
                });
                return res.status(201).json(client);
            }
            catch (error) {
                if (error instanceof appError_1.default) {
                    return res.status(error.statusCode).json({ message: error.message });
                }
                console.error(error); // Log do erro para depuração
                return res.status(500).json({ message: "Internal server error" });
            }
        });
    }
}
exports.CreateClientController = CreateClientController;
