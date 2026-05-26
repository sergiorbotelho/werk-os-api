/*
  Warnings:

  - Added the required column `horaChegada` to the `os` table without a default value. This is not possible if the table is not empty.
  - Added the required column `horaSaida` to the `os` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "os"
ADD COLUMN IF NOT EXISTS "horaChegada" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "horaSaida" TEXT NOT NULL DEFAULT '';