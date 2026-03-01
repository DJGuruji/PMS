/*
  Warnings:

  - You are about to drop the column `status` on the `Card` table. All the data in the column will be lost.
  - You are about to drop the column `closedAt` on the `Project` table. All the data in the column will be lost.
  - The primary key for the `ProjectMembership` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `ProjectMembership` table. All the data in the column will be lost.
  - You are about to drop the `AuditLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CardMovementLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_CardLabels` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[columnId,order]` on the table `Card` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[projectId,order]` on the table `Column` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SUB_ADMIN';

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_projectId_fkey";

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "CardMovementLog" DROP CONSTRAINT "CardMovementLog_cardId_fkey";

-- DropForeignKey
ALTER TABLE "CardMovementLog" DROP CONSTRAINT "CardMovementLog_fromColumnId_fkey";

-- DropForeignKey
ALTER TABLE "CardMovementLog" DROP CONSTRAINT "CardMovementLog_movedById_fkey";

-- DropForeignKey
ALTER TABLE "CardMovementLog" DROP CONSTRAINT "CardMovementLog_toColumnId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectMembership" DROP CONSTRAINT "ProjectMembership_projectId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectMembership" DROP CONSTRAINT "ProjectMembership_userId_fkey";

-- DropForeignKey
ALTER TABLE "_CardLabels" DROP CONSTRAINT "_CardLabels_A_fkey";

-- DropForeignKey
ALTER TABLE "_CardLabels" DROP CONSTRAINT "_CardLabels_B_fkey";

-- DropIndex
DROP INDEX "Card_columnId_idx";

-- DropIndex
DROP INDEX "Card_columnId_order_idx";

-- DropIndex
DROP INDEX "Column_projectId_idx";

-- DropIndex
DROP INDEX "Project_creatorId_idx";

-- DropIndex
DROP INDEX "ProjectMembership_userId_projectId_key";

-- AlterTable
ALTER TABLE "Card" DROP COLUMN "status",
ALTER COLUMN "order" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "closedAt",
ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "ProjectMembership" DROP CONSTRAINT "ProjectMembership_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "ProjectMembership_pkey" PRIMARY KEY ("userId", "projectId");

-- DropTable
DROP TABLE "AuditLog";

-- DropTable
DROP TABLE "CardMovementLog";

-- DropTable
DROP TABLE "_CardLabels";

-- DropEnum
DROP TYPE "CardStatus";

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMembership" (
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("userId","orgId")
);

-- CreateTable
CREATE TABLE "CardLabel" (
    "cardId" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,

    CONSTRAINT "CardLabel_pkey" PRIMARY KEY ("cardId","labelId")
);

-- CreateIndex
CREATE INDEX "OrganizationMembership_orgId_idx" ON "OrganizationMembership"("orgId");

-- CreateIndex
CREATE INDEX "CardLabel_labelId_idx" ON "CardLabel"("labelId");

-- CreateIndex
CREATE UNIQUE INDEX "Card_columnId_order_key" ON "Card"("columnId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Column_projectId_order_key" ON "Column"("projectId", "order");

-- CreateIndex
CREATE INDEX "Project_organizationId_idx" ON "Project"("organizationId");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMembership" ADD CONSTRAINT "ProjectMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMembership" ADD CONSTRAINT "ProjectMembership_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardLabel" ADD CONSTRAINT "CardLabel_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardLabel" ADD CONSTRAINT "CardLabel_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Label"("id") ON DELETE CASCADE ON UPDATE CASCADE;
