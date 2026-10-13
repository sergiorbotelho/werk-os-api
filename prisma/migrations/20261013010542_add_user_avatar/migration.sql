-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatarUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "user_avatars" (
    "userId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "mimeType" VARCHAR(20) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_avatars_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "user_avatars" ADD CONSTRAINT "user_avatars_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
