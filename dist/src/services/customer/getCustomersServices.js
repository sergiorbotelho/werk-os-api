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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetCustomersServices = void 0;
const prisma_1 = __importDefault(require("../../prisma"));
class GetCustomersServices {
    execute() {
        return __awaiter(this, void 0, void 0, function* () {
            const count = yield prisma_1.default.client.count();
            // const page = 0;
            const customers = yield prisma_1.default.client.findMany({
                orderBy: {
                    nome: "asc",
                },
                // skip: page * 2,
                // take: 2,
                select: {
                    id: true,
                    nome: true,
                    email: true,
                    telefone: true,
                    cpf: true,
                    cnpj: true,
                    endereco: true,
                    numero: true,
                    bairro: true,
                    cidade: true,
                    uf: true,
                    cep: true,
                    _count: {
                        select: {
                            os: true,
                        },
                    },
                },
            });
            const formattedCustomers = customers.map((_a) => {
                var { _count } = _a, customer = __rest(_a, ["_count"]);
                return (Object.assign(Object.assign({}, customer), { totalOs: _count.os }));
            });
            return {
                customers: formattedCustomers,
                count,
            };
        });
    }
}
exports.GetCustomersServices = GetCustomersServices;
