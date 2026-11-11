-- CreateEnum
CREATE TYPE "WorkerJobStatus" AS ENUM ('PENDING', 'CLAIMED', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "WorkerJobType" AS ENUM ('CAMPAIGN_SEND', 'PAYMENT_EXPIRATION', 'PAYMENT_REMINDER');

-- CreateTable
CREATE TABLE "WorkerJob" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "type" "WorkerJobType" NOT NULL DEFAULT 'CAMPAIGN_SEND',
    "status" "WorkerJobStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkerJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkerJob_status_idx" ON "WorkerJob"("status");

-- CreateIndex
CREATE INDEX "WorkerJob_type_idx" ON "WorkerJob"("type");

-- CreateIndex
CREATE INDEX "WorkerJob_runAt_idx" ON "WorkerJob"("runAt");

-- CreateIndex
CREATE INDEX "WorkerJob_orgId_idx" ON "WorkerJob"("orgId");

-- CreateIndex
CREATE INDEX "WorkerJob_status_runAt_idx" ON "WorkerJob"("status", "runAt");
