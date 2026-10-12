-- Recalcula o total das OS cujos valores foram editados depois do cadastro.
-- Até esta versão, o PUT /os/:id não recalculava o total.
UPDATE "os"
SET "total" = COALESCE("valServico", 0) + COALESCE("valMaterial", 0)
WHERE ("valServico" IS NOT NULL OR "valMaterial" IS NOT NULL)
  AND "total" IS DISTINCT FROM COALESCE("valServico", 0) + COALESCE("valMaterial", 0);
