/*
  Warnings:

  - Added the required column `horaChegada` to the `os` table without a default value. This is not possible if the table is not empty.
  - Added the required column `horaSaida` to the `os` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "os"
ADD COLUMN "horaChegada" TIME DEFAULT '00:00',
ADD COLUMN "horaSaida" TIME DEFAULT '00:00';
