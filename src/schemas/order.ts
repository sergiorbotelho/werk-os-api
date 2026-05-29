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
  );

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

  horaSaida: z.string().regex(horaRegex, "Hora de saída inválida"),

  defeito: z.string().trim().min(1, "Defeito é obrigatório"),

  defeitoConstatado: z
    .string()
    .trim()
    .min(1, "Defeito constatado é obrigatório"),

  solucao: z.string().trim().min(1, "Solução é obrigatória"),

  valServico: moneySchema,

  valMaterial: moneySchema,

  garantiaPeca: z.string().trim().min(1, "Garantia da peça é obrigatória"),

  garantiaServico: z
    .string()
    .trim()
    .min(1, "Garantia do serviço é obrigatória"),
});

export type OrdemServicoSchema = z.infer<typeof createOrUpdateServiceSchema>;
