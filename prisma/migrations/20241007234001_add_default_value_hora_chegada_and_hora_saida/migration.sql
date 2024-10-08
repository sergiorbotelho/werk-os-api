/*
  Warnings:

  - Made the column `horaChegada` on table `os` required. This step will fail if there are existing NULL values in that column.
  - Made the column `horaSaida` on table `os` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "os" ALTER COLUMN "horaChegada" SET NOT NULL,
ALTER COLUMN "horaChegada" DROP DEFAULT,
ALTER COLUMN "horaChegada" SET DATA TYPE TEXT,
ALTER COLUMN "horaSaida" SET NOT NULL,
ALTER COLUMN "horaSaida" DROP DEFAULT,
ALTER COLUMN "horaSaida" SET DATA TYPE TEXT;
