/*
  Warnings:

  - You are about to alter the column `name` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `email` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `password` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - A unique constraint covering the columns `[name]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ALTER COLUMN "name" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "email" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "password" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "update_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "telefone" INTEGER NOT NULL,
    "cpf" VARCHAR(11) NOT NULL,
    "cnpj" VARCHAR(14) NOT NULL,
    "cep" VARCHAR(8) NOT NULL,
    "endereco" VARCHAR(255) NOT NULL,
    "numero" VARCHAR(20) NOT NULL,
    "bairro" VARCHAR(255) NOT NULL,
    "cidade" VARCHAR(150) NOT NULL,
    "uf" VARCHAR(2) NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "update_at" TIMESTAMP(3),

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "os" (
    "id" TEXT NOT NULL,
    "modeloEquipamento" TEXT NOT NULL,
    "defeito" TEXT NOT NULL,
    "defeitoConstatado" TEXT NOT NULL,
    "solucao" TEXT NOT NULL,
    "valServico" DECIMAL(30,2) NOT NULL,
    "valMaterial" DECIMAL(30,2) NOT NULL,
    "total" DECIMAL(30,2) NOT NULL,
    "garantiaPeca" TEXT NOT NULL,
    "garantiaServico" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "client_id" TEXT NOT NULL,

    CONSTRAINT "os_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipo_servico" (
    "id" SERIAL NOT NULL,
    "descricao" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT false,
    "tipoServico_id" TEXT NOT NULL,

    CONSTRAINT "tipo_servico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tipo_servico_tipoServico_id_key" ON "tipo_servico"("tipoServico_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_name_key" ON "users"("name");

-- AddForeignKey
ALTER TABLE "os" ADD CONSTRAINT "os_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipo_servico" ADD CONSTRAINT "tipo_servico_tipoServico_id_fkey" FOREIGN KEY ("tipoServico_id") REFERENCES "os"("id") ON DELETE RESTRICT ON UPDATE CASCADE;