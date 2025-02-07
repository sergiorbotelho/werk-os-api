/*
  Warnings:

  - You are about to drop the `tipo_servico` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "TipoServico" AS ENUM ('GARANTIA', 'FORADEGARANTIA', 'ORCAMENTO', 'CONTRATO');

-- DropForeignKey
ALTER TABLE "tipo_servico" DROP CONSTRAINT "tipo_servico_tipoServico_id_fkey";

-- AlterTable
ALTER TABLE "os" ADD COLUMN     "tipoServico" "TipoServico" NOT NULL DEFAULT 'FORADEGARANTIA';

-- DropTable
DROP TABLE "tipo_servico";