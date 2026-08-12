-- CreateEnum
CREATE TYPE "BenchmarkJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "RevokedToken" (
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevokedToken_pkey" PRIMARY KEY ("tokenHash")
);

-- CreateTable
CREATE TABLE "BenchmarkJob" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dataset" TEXT NOT NULL,
    "status" "BenchmarkJobStatus" NOT NULL DEFAULT 'PENDING',
    "current" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "currentQuestion" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "runId" TEXT,
    "error" TEXT,
    "workerId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BenchmarkJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RevokedToken_expiresAt_idx" ON "RevokedToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "BenchmarkJob_jobId_key" ON "BenchmarkJob"("jobId");

-- CreateIndex
CREATE INDEX "BenchmarkJob_userId_status_idx" ON "BenchmarkJob"("userId", "status");

-- CreateIndex
CREATE INDEX "BenchmarkJob_status_updatedAt_idx" ON "BenchmarkJob"("status", "updatedAt");

-- AddForeignKey
ALTER TABLE "BenchmarkJob" ADD CONSTRAINT "BenchmarkJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenchmarkJob" ADD CONSTRAINT "BenchmarkJob_runId_fkey" FOREIGN KEY ("runId") REFERENCES "BenchmarkRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
