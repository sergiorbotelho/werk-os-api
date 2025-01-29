/*
  Warnings:

  - Added the required column `contato` to the `os` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "os" ADD COLUMN     "contato" TEXT NOT NULL;