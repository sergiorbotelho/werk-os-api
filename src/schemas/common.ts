import { z } from "zod";

export const idParamSchema = z.coerce
  .number({ error: "Id inválido" })
  .int({ error: "Id inválido" })
  .positive({ error: "Id inválido" });

export const uuidParamSchema = z.uuid({ error: "Id inválido" });
