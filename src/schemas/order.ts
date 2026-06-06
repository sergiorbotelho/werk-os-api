import { z } from "zod";

export enum TipoServico {
  GARANTIA = "GARANTIA",
  FORADEGARANTIA = "FORADEGARANTIA",
  ORCAMENTO = "ORCAMENTO",
  CONTRATO = "CONTRATO",
}

const moneySchema = z.coerce
  .number({
    error: "Valor inválido",
  })
  .nonnegative("Valor não pode ser negativo")
  .refine(
    (value) => /^\d+(\.\d{1,2})?$/.test(value.toString()),
    "Máximo de 2 casas decimais",
  )
  .optional();

const horaRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const createOrUpdateServiceSchema = z.object({
  cliente_id: z.coerce.number().int(),

  tipoServico: z.enum(TipoServico, {
    error:
      "Tipo de serviço inválido, deve ser GARANTIA, FORADEGARANTIA, ORCAMENTO ou CONTRATO",
  }),

  contato: z.string().trim().min(1, "Contato é obrigatório"),

  modeloEquipamento: z
    .string()
    .trim()
    .min(1, "Modelo do equipamento é obrigatório"),

  horaChegada: z.string().regex(horaRegex, "Hora de chegada inválida"),

  horaSaida: z
    .string()
    .regex(horaRegex, "Hora de saída inválida")
    .or(z.literal(""))
    .optional(),

  defeito: z.string().trim().min(1, "Defeito é obrigatório"),

  defeitoConstatado: z.string().trim().optional(),

  solucao: z.string().trim().optional(),

  valServico: moneySchema,

  valMaterial: moneySchema,

  garantiaPeca: z.string().trim().optional(),

  garantiaServico: z.string().trim().optional(),
});

export type OrdemServicoSchema = z.infer<typeof createOrUpdateServiceSchema>;
