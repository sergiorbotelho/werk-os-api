import { z } from "zod";

export const idParamSchema = z.coerce
  .number({ error: "Id inválido" })
  .int({ error: "Id inválido" })
  .positive({ error: "Id inválido" });
