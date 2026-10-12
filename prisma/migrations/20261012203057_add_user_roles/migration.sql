-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'BASICO');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'BASICO';

-- O administrador do seed vira ADMIN. Os demais usuários existentes ficam BASICO
-- e são promovidos pela tela de usuários.
UPDATE "users" SET "role" = 'ADMIN' WHERE "email" = 'admin@werk.com.br' AND "role" <> 'ADMIN';
