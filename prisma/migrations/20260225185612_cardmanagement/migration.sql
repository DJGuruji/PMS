-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('IDLE', 'ACTIVE', 'PAUSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CardMovementMode" AS ENUM ('FREE', 'FORWARD_ONLY');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "cardMovementMode" "CardMovementMode" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "pausedAt" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "status" "ProjectStatus" NOT NULL DEFAULT 'IDLE',
ADD COLUMN     "totalPausedMs" BIGINT NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Card_columnId_order_idx" ON "Card"("columnId", "order");
