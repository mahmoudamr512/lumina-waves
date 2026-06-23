-- AlterTable
ALTER TABLE "MasterContract" ADD COLUMN     "expiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ContractExpiryReminder" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "milestone" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractExpiryReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContractExpiryReminder_contractId_milestone_key" ON "ContractExpiryReminder"("contractId", "milestone");
