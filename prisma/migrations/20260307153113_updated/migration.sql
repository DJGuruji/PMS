/*
  Warnings:

  - You are about to drop the column `pausedAt` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `totalPausedMs` on the `Project` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[resetToken]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Project" DROP COLUMN "pausedAt",
DROP COLUMN "totalPausedMs";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailOtp" TEXT,
ADD COLUMN     "emailOtpExpires" TIMESTAMP(3),
ADD COLUMN     "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpires" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ProjectPause" (
    "projectId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectPause_pkey" PRIMARY KEY ("projectId","startedAt")
);

-- CreateTable
CREATE TABLE "CardColumnTime" (
    "cardId" TEXT NOT NULL,
    "columnId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "CardColumnTime_pkey" PRIMARY KEY ("cardId","startedAt")
);

-- CreateTable
CREATE TABLE "CardHold" (
    "cardId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "CardHold_pkey" PRIMARY KEY ("cardId","startedAt")
);

-- CreateIndex
CREATE INDEX "CardColumnTime_columnId_idx" ON "CardColumnTime"("columnId");

-- CreateIndex
CREATE UNIQUE INDEX "User_resetToken_key" ON "User"("resetToken");

-- AddForeignKey
ALTER TABLE "ProjectPause" ADD CONSTRAINT "ProjectPause_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardColumnTime" ADD CONSTRAINT "CardColumnTime_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardColumnTime" ADD CONSTRAINT "CardColumnTime_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "Column"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardHold" ADD CONSTRAINT "CardHold_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
