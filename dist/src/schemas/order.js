"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrUpdateServiceSchema = exports.TipoServico = void 0;
const zod_1 = require("zod");
var TipoServico;
(function (TipoServico) {
    TipoServico["GARANTIA"] = "GARANTIA";
    TipoServico["FORADEGARANTIA"] = "FORADEGARANTIA";
    TipoServico["ORCAMENTO"] = "ORCAMENTO";
    TipoServico["CONTRATO"] = "CONTRATO";
})(TipoServico || (exports.TipoServico = TipoServico = {}));
const moneySchema = zod_1.z.coerce
    .number({
    error: "Valor inválido",
})
    .nonnegative("Valor não pode ser negativo")
    .refine((value) => /^\d+(\.\d{1,2})?$/.test(value.toString()), "Máximo de 2 casas decimais")
    .optional();
const horaRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
exports.createOrUpdateServiceSchema = zod_1.z.object({
    cliente_id: zod_1.z.coerce.number().int(),
    tipoServico: zod_1.z.enum(TipoServico, {
        error: "Tipo de serviço inválido, deve ser GARANTIA, FORADEGARANTIA, ORCAMENTO ou CONTRATO",
    }),
    contato: zod_1.z.string().trim().min(1, "Contato é obrigatório"),
    modeloEquipamento: zod_1.z
        .string()
        .trim()
        .min(1, "Modelo do equipamento é obrigatório"),
    horaChegada: zod_1.z.string().regex(horaRegex, "Hora de chegada inválida"),
    horaSaida: zod_1.z
        .string()
        .regex(horaRegex, "Hora de saída inválida")
        .or(zod_1.z.literal(""))
        .optional(),
    defeito: zod_1.z.string().trim().min(1, "Defeito é obrigatório"),
    defeitoConstatado: zod_1.z.string().trim().optional(),
    solucao: zod_1.z.string().trim().optional(),
    valServico: moneySchema,
    valMaterial: moneySchema,
    garantiaPeca: zod_1.z.string().trim().optional(),
    garantiaServico: zod_1.z.string().trim().optional(),
});
