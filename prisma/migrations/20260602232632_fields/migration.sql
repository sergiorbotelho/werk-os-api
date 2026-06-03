/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `clients` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "clients" ALTER COLUMN "cep" DROP NOT NULL,
ALTER COLUMN "endereco" DROP NOT NULL,
ALTER COLUMN "numero" DROP NOT NULL,
ALTER COLUMN "bairro" DROP NOT NULL,
ALTER COLUMN "cidade" DROP NOT NULL,
ALTER COLUMN "uf" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "clients_email_key" ON "clients"("email");
