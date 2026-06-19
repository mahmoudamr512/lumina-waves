-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPERATIONS', 'LEGAL', 'FINANCE', 'VIEWER');

-- CreateEnum
CREATE TYPE "GrantType" AS ENUM ('FULL_ASSIGNMENT', 'EXCLUSIVE_LICENSE', 'NON_EXCLUSIVE_LICENSE', 'MANAGEMENT');

-- CreateEnum
CREATE TYPE "WorkStatus" AS ENUM ('PENDING_ANNEX', 'LINKED');

-- CreateEnum
CREATE TYPE "DocStatus" AS ENUM ('DRAFT', 'EXECUTED');

-- CreateEnum
CREATE TYPE "RightsAxis" AS ENUM ('MASTER', 'PUBLISHING', 'BOTH');

-- CreateEnum
CREATE TYPE "CreditRole" AS ENUM ('AUTHOR', 'COMPOSER', 'ARRANGER', 'PERFORMER', 'PRODUCER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "purgeAfter" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "stageName" TEXT,
    "nationalId" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "purgeAfter" TIMESTAMP(3),

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterContract" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "grantType" "GrantType" NOT NULL,
    "territory" TEXT NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "noticeDays" INTEGER NOT NULL DEFAULT 90,
    "coverage" JSONB NOT NULL,
    "revenueShareBps" INTEGER,
    "minPayoutCents" INTEGER,
    "settlementFreq" TEXT,
    "signedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "purgeAfter" TIMESTAMP(3),

    CONSTRAINT "MasterContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Annex" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "annexDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "purgeAfter" TIMESTAMP(3),

    CONSTRAINT "Annex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Work" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "WorkStatus" NOT NULL DEFAULT 'PENDING_ANNEX',
    "rightsAxis" "RightsAxis" NOT NULL DEFAULT 'BOTH',
    "annexId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "purgeAfter" TIMESTAMP(3),

    CONSTRAINT "Work_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Credit" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "role" "CreditRole" NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Credit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "status" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "ocrText" TEXT,
    "contractId" TEXT,
    "annexId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "purgeAfter" TIMESTAMP(3),

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Client_nationalId_key" ON "Client"("nationalId");

-- CreateIndex
CREATE UNIQUE INDEX "Annex_contractId_number_key" ON "Annex"("contractId", "number");

-- AddForeignKey
ALTER TABLE "MasterContract" ADD CONSTRAINT "MasterContract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annex" ADD CONSTRAINT "Annex_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "MasterContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Work" ADD CONSTRAINT "Work_annexId_fkey" FOREIGN KEY ("annexId") REFERENCES "Annex"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credit" ADD CONSTRAINT "Credit_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "MasterContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_annexId_fkey" FOREIGN KEY ("annexId") REFERENCES "Annex"("id") ON DELETE SET NULL ON UPDATE CASCADE;
