/*
  Warnings:

  - The primary key for the `os` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `numero` on the `os` table. All the data in the column will be lost.
  - The `id` column on the `os` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "os" 
DROP CONSTRAINT "os_pkey",
DROP COLUMN "numero",
DROP COLUMN "id",
ADD COLUMN "id" SERIAL NOT NULL;

ALTER SEQUENCE "os_id_seq" RESTART WITH 1000;

ALTER TABLE "os" 
ADD CONSTRAINT "os_pkey" PRIMARY KEY ("id");
